import { FunctionCallingConfigMode, GoogleGenAI, Type, type FunctionDeclaration, type Content, type Part } from "@google/genai";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string | null;
  tool_calls?: ToolCall[];
  provider: "groq" | "gemini";
  error?: string;
}

// In-memory cooldowns to avoid hammering rate-limited providers
const providerCooldowns: Record<string, number> = {};

export function resetProviderCooldowns() {
  for (const k of Object.keys(providerCooldowns)) {
    delete providerCooldowns[k];
  }
}

export function setProviderCooldown(provider: string, seconds: number) {
  providerCooldowns[provider] = Date.now() + Math.max(1, seconds) * 1000;
}

export function isProviderInCooldown(provider: string): boolean {
  const expiry = providerCooldowns[provider];
  if (!expiry) return false;
  if (Date.now() > expiry) {
    delete providerCooldowns[provider];
    return false;
  }
  return true;
}

export function getProviderCooldownRemaining(provider: string): number {
  const expiry = providerCooldowns[provider];
  if (!expiry) return 0;
  const remaining = Math.ceil((expiry - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/**
 * Extracts and parses any leaked Llama tool-call formats from plain text
 * (e.g. <function=cari_produk>{"kata_kunci":"laptop"}</function> or similar).
 */
export function parseLlamaLeakedToolCalls(text: string): { cleanedText: string; toolCalls: ToolCall[] } {
  if (!text) return { cleanedText: "", toolCalls: [] };

  const toolCalls: ToolCall[] = [];
  let cleaned = text;

  // Pattern 1: <function=name>{...}</function>
  const tagRegex = /<function=(\w+)>([\s\S]*?)(?:<\/function>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    const fnName = match[1];
    const rawArgs = match[2].trim();
    try {
      JSON.parse(rawArgs); // validate
      toolCalls.push({
        id: `call_llama_${Math.random().toString(36).substring(2, 9)}`,
        type: "function",
        function: { name: fnName, arguments: rawArgs },
      });
      cleaned = cleaned.replace(match[0], "").trim();
    } catch {
      // not valid JSON, leave as is
    }
  }

  // Pattern 2: <tool_call>{"name": "...", "arguments": {...}}</tool_call>
  const toolCallTagRegex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/gi;
  while ((match = toolCallTagRegex.exec(cleaned)) !== null) {
    const rawJson = match[1].trim();
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed.name === "string") {
        const args = typeof parsed.arguments === "object" ? JSON.stringify(parsed.arguments)
          : (typeof parsed.parameters === "object" ? JSON.stringify(parsed.parameters) : String(parsed.arguments || "{}"));
        toolCalls.push({
          id: `call_llama_${Math.random().toString(36).substring(2, 9)}`,
          type: "function",
          function: { name: parsed.name, arguments: args },
        });
        cleaned = cleaned.replace(match[0], "").trim();
      }
    } catch {
      // not valid JSON
    }
  }

  // Pattern 3: [TOOL_CALLS] [...]
  const bracketRegex = /\[TOOL_CALLS\]\s*(\[[\s\S]*?\])/gi;
  while ((match = bracketRegex.exec(cleaned)) !== null) {
    try {
      const parsedList = JSON.parse(match[1]);
      if (Array.isArray(parsedList)) {
        for (const item of parsedList) {
          if (item && typeof item.name === "string") {
            const args = typeof item.arguments === "object" ? JSON.stringify(item.arguments)
              : (typeof item.parameters === "object" ? JSON.stringify(item.parameters) : String(item.arguments || "{}"));
            toolCalls.push({
              id: `call_llama_${Math.random().toString(36).substring(2, 9)}`,
              type: "function",
              function: { name: item.name, arguments: args },
            });
          }
        }
        cleaned = cleaned.replace(match[0], "").trim();
      }
    } catch {
      // ignore
    }
  }

  // Pattern 4: standalone JSON block with "name" and "arguments" / "parameters"
  if (toolCalls.length === 0 && cleaned.trim().startsWith("{") && cleaned.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(cleaned.trim());
      if (typeof parsed.name === "string" && (parsed.arguments || parsed.parameters)) {
        const args = typeof parsed.arguments === "object" ? JSON.stringify(parsed.arguments)
          : (typeof parsed.parameters === "object" ? JSON.stringify(parsed.parameters) : String(parsed.arguments || "{}"));
        toolCalls.push({
          id: `call_llama_${Math.random().toString(36).substring(2, 9)}`,
          type: "function",
          function: { name: parsed.name, arguments: args },
        });
        cleaned = "";
      }
    } catch {
      // ignore
    }
  }

  return { cleanedText: cleaned, toolCalls };
}

interface ErrorWithStatus extends Error {
  status?: number;
}

/**
 * Converts OpenAI tools format to Gemini FunctionDeclaration format.
 */
export function openAIToolsToGemini(tools: OpenAITool[]): FunctionDeclaration[] {
  const mapType = (typeStr?: unknown): Type => {
    switch (String(typeStr).toLowerCase()) {
      case "string": return Type.STRING;
      case "number": return Type.NUMBER;
      case "integer": return Type.INTEGER;
      case "boolean": return Type.BOOLEAN;
      case "array": return Type.ARRAY;
      default: return Type.OBJECT;
    }
  };

  const convertSchema = (schema: Record<string, unknown>): Record<string, unknown> => {
    if (!schema || typeof schema !== "object") return { type: Type.STRING };
    const res: Record<string, unknown> = {
      type: mapType(schema.type),
      description: typeof schema.description === "string" ? schema.description : undefined,
    };
    if (schema.properties && typeof schema.properties === "object") {
      const properties: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(schema.properties as Record<string, unknown>)) {
        properties[k] = convertSchema(v as Record<string, unknown>);
      }
      res.properties = properties;
    }
    if (Array.isArray(schema.required)) {
      res.required = schema.required;
    }
    if (schema.items && typeof schema.items === "object") {
      res.items = convertSchema(schema.items as Record<string, unknown>);
    }
    return res;
  };

  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: convertSchema(t.function.parameters) as unknown as FunctionDeclaration["parameters"],
  }));
}

/**
 * Converts standard ChatMessage[] into Gemini Content[] format.
 */
export function chatMessagesToGeminiContents(messages: ChatMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // System instructions are passed separately in Gemini config
      continue;
    }

    if (msg.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: msg.content || "" }],
      });
    } else if (msg.role === "assistant") {
      const parts: Part[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.tool_calls && msg.tool_calls.length) {
        for (const tc of msg.tool_calls) {
          let argsObj = {};
          try {
            argsObj = JSON.parse(tc.function.arguments);
          } catch {
            argsObj = {};
          }
          parts.push({
            functionCall: {
              id: tc.id,
              name: tc.function.name,
              args: argsObj,
            },
          } as Part);
        }
      }
      if (parts.length) {
        contents.push({ role: "model", parts });
      }
    } else if (msg.role === "tool") {
      let responseObj = {};
      try {
        responseObj = JSON.parse(msg.content || "{}");
      } catch {
        responseObj = { result: msg.content };
      }
      contents.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: msg.name || "tool_result",
              id: msg.tool_call_id,
              response: responseObj,
            },
          } as Part,
        ],
      });
    }
  }

  return contents;
}

/**
 * Calls Groq API via standard Node fetch (OpenAI-compatible).
 */
export async function callGroq(options: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tools?: OpenAITool[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<LLMResponse> {
  const { apiKey, model, messages, tools, maxTokens = 500, temperature = 0.3, timeoutMs = 15_000 } = options;

  const groqMessages = messages.map((m) => {
    if (m.role === "tool") {
      return {
        role: "tool",
        tool_call_id: m.tool_call_id || "call_1",
        content: m.content || "",
      };
    }
    if (m.role === "assistant" && m.tool_calls) {
      return {
        role: "assistant",
        content: m.content ?? null,
        tool_calls: m.tool_calls,
      };
    }
    return {
      role: m.role,
      content: m.content || "",
    };
  });

  const payload: Record<string, unknown> = {
    model,
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = "auto";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const status = response.status;

    if (status === 429) {
      let retrySeconds = 60;
      const retryHeader = response.headers.get("retry-after");
      if (retryHeader) {
        retrySeconds = parseInt(retryHeader, 10) || 60;
      } else {
        const match = errorText.match(/try again in ([0-9.]+)s/i) || errorText.match(/retry in ([0-9.]+)s/i);
        if (match && match[1]) {
          retrySeconds = Math.ceil(parseFloat(match[1]));
        }
      }
      setProviderCooldown("groq", retrySeconds);
    }

    const err: ErrorWithStatus = new Error(`Groq HTTP ${status}: ${errorText}`);
    err.status = status;
    throw err;
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message) {
    throw new Error("Groq API returned an empty choice.");
  }

  let content = choice.message.content;
  if (!content && typeof choice.message.reasoning === "string" && (!choice.message.tool_calls || choice.message.tool_calls.length === 0)) {
    content = choice.message.reasoning;
  }
  let toolCalls: ToolCall[] = choice.message.tool_calls || [];

  // Detect and sanitize any Llama text-leaked function calls
  if (content && typeof content === "string") {
    const parsed = parseLlamaLeakedToolCalls(content);
    if (parsed.toolCalls.length > 0) {
      toolCalls = [...toolCalls, ...parsed.toolCalls];
      content = parsed.cleanedText || null;
    }
  }

  return {
    content,
    tool_calls: toolCalls.length ? toolCalls : undefined,
    provider: "groq",
  };
}

/**
 * Calls Gemini API via @google/genai SDK.
 */
export async function callGemini(options: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  messages: ChatMessage[];
  tools?: OpenAITool[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<LLMResponse> {
  const { apiKey, model, systemInstruction, messages, tools, maxTokens = 500, temperature = 0.3, timeoutMs = 15_000 } = options;

  const ai = new GoogleGenAI({ apiKey });
  const contents = (messages.length === 1 && messages[0].role === "user" && typeof messages[0].content === "string")
    ? messages[0].content
    : chatMessagesToGeminiContents(messages);

  const geminiTools = tools && tools.length > 0
    ? [{ functionDeclarations: openAIToolsToGemini(tools) }]
    : undefined;

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        httpOptions: { timeout: timeoutMs },
        maxOutputTokens: maxTokens,
        temperature,
        thinkingConfig: { thinkingBudget: 0 },
        ...(geminiTools ? {
          tools: geminiTools,
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        } : {}),
      },
    });

    const functionCalls = response.functionCalls;
    const toolCalls: ToolCall[] = functionCalls
      ?.filter((fc) => Boolean(fc.name))
      .map((fc, idx) => ({
        id: fc.id || `call_gemini_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        type: "function",
        function: {
          name: fc.name as string,
          arguments: JSON.stringify(fc.args || {}),
        },
      })) || [];

    return {
      content: response.text || null,
      tool_calls: toolCalls.length ? toolCalls : undefined,
      provider: "gemini",
    };
  } catch (err) {
    const status = (err as ErrorWithStatus)?.status;
    const msg = String((err as ErrorWithStatus)?.message || "");
    if (status === 429 || msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      let retrySeconds = 60;
      const match = msg.match(/retry in ([0-9.]+)s/i) || msg.match(/retry in ([0-9.]+)m/i);
      if (match && match[1]) {
        retrySeconds = Math.ceil(parseFloat(match[1]) * (msg.includes("m") ? 60 : 1));
      }
      setProviderCooldown("gemini", retrySeconds);
    }
    throw err;
  }
}

/**
 * Executes chat with failover across configured providers (e.g. Groq -> Gemini).
 */
export async function executeWithFailover(options: {
  systemInstruction: string;
  messages: ChatMessage[];
  tools?: OpenAITool[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<LLMResponse> {
  const providerOrderEnv = process.env.LLM_PROVIDER_ORDER || "groq,gemini";
  const providers = providerOrderEnv.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);

  let lastError: unknown = null;

  for (const provider of providers) {
    if (provider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        continue; // provider not configured, try next
      }

      if (isProviderInCooldown("groq")) {
        const remaining = getProviderCooldownRemaining("groq");
        console.warn(`[LLM Router] Groq is in cooldown (${remaining}s remaining), failing over to next provider.`);
        continue;
      }

      const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

      // Try with 1 retry for broken tool call
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await callGroq({
            apiKey,
            model,
            messages: [
              { role: "system", content: options.systemInstruction },
              ...options.messages,
            ],
            tools: options.tools,
            maxTokens: options.maxTokens ?? 500,
            temperature: options.temperature ?? 0.3,
            timeoutMs: options.timeoutMs ?? 15_000,
          });
          return res;
        } catch (err) {
          lastError = err;
          const status = (err as ErrorWithStatus)?.status;
          console.error(`[LLM Groq Error] Status: ${status ?? "unknown"} - ${String((err as ErrorWithStatus)?.message || err).slice(0, 150)}`);
          if (status === 429) {
            break; // 429 cannot be solved by instant retry, failover immediately
          }
          if (attempt === 0) {
            // retry once on transient error
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
        }
      }
    } else if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        continue; // provider not configured, try next
      }

      if (isProviderInCooldown("gemini")) {
        const remaining = getProviderCooldownRemaining("gemini");
        console.warn(`[LLM Router] Gemini is in cooldown (${remaining}s remaining), skipping.`);
        continue;
      }

      const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

      try {
        const res = await callGemini({
          apiKey,
          model,
          systemInstruction: options.systemInstruction,
          messages: options.messages,
          tools: options.tools,
          maxTokens: options.maxTokens ?? 500,
          temperature: options.temperature ?? 0.3,
          timeoutMs: options.timeoutMs ?? 15_000,
        });
        return res;
      } catch (err) {
        lastError = err;
        const status = (err as ErrorWithStatus)?.status;
        console.error(`[LLM Gemini Error] Status: ${status ?? "unknown"} - ${String((err as ErrorWithStatus)?.message || err).slice(0, 150)}`);
      }
    }
  }

  // All providers failed
  throw lastError || new Error("Semua penyedia AI (Groq & Gemini) sedang tidak dapat diakses.");
}
