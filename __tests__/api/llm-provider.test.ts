import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openAIToolsToGemini,
  parseLlamaLeakedToolCalls,
  setProviderCooldown,
  isProviderInCooldown,
  getProviderCooldownRemaining,
  resetProviderCooldowns,
  executeWithFailover,
  type OpenAITool,
} from "@/lib/llm-provider";

vi.mock("@google/genai", () => ({
  FunctionCallingConfigMode: { AUTO: "AUTO" },
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
    ARRAY: "ARRAY",
  },
  GoogleGenAI: class {
    models = {
      generateContent: async () => ({
        text: "Jawaban dari Gemini mock",
        functionCalls: [],
      }),
    };
  },
}));

describe("LLM Provider - openAIToolsToGemini", () => {
  it("converts OpenAI tool definition to Gemini FunctionDeclaration correctly", () => {
    const openAITools: OpenAITool[] = [
      {
        type: "function",
        function: {
          name: "cari_produk",
          description: "Cari produk katalog",
          parameters: {
            type: "object",
            properties: {
              kata_kunci: { type: "string", description: "Kata kunci" },
              rentang_harga: {
                type: "object",
                properties: {
                  min: { type: "number", description: "Min" },
                  max: { type: "number", description: "Max" },
                },
              },
            },
            required: ["kata_kunci"],
          },
        },
      },
    ];

    const geminiTools = openAIToolsToGemini(openAITools);
    expect(geminiTools).toHaveLength(1);
    expect(geminiTools[0].name).toBe("cari_produk");
    expect(geminiTools[0].description).toBe("Cari produk katalog");
    expect(geminiTools[0].parameters?.required).toContain("kata_kunci");
    expect((geminiTools[0].parameters?.properties as Record<string, { type: string }>)?.kata_kunci?.type).toBe("STRING");
  });
});

describe("LLM Provider - parseLlamaLeakedToolCalls", () => {
  it("extracts and strips <function=name>{...}</function> syntax", () => {
    const raw = "Tentu, saya carikan laptopnya ya.<function=cari_produk>{\"kata_kunci\":\"laptop\",\"urutan\":\"termurah\"}</function>";
    const result = parseLlamaLeakedToolCalls(raw);

    expect(result.cleanedText).toBe("Tentu, saya carikan laptopnya ya.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("cari_produk");
    expect(JSON.parse(result.toolCalls[0].function.arguments)).toEqual({
      kata_kunci: "laptop",
      urutan: "termurah",
    });
  });

  it("extracts and strips <tool_call>{...}</tool_call> syntax", () => {
    const raw = "Mohon ditunggu sebentar.<tool_call>{\"name\":\"cek_pesanan\",\"arguments\":{\"nomor_pesanan\":\"ORD-271026-01\",\"email_atau_hp\":\"user@example.com\"}}</tool_call>";
    const result = parseLlamaLeakedToolCalls(raw);

    expect(result.cleanedText).toBe("Mohon ditunggu sebentar.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("cek_pesanan");
    expect(JSON.parse(result.toolCalls[0].function.arguments)).toEqual({
      nomor_pesanan: "ORD-271026-01",
      email_atau_hp: "user@example.com",
    });
  });

  it("extracts and strips [TOOL_CALLS] [...] syntax", () => {
    const raw = "[TOOL_CALLS] [{\"name\":\"info_toko\",\"arguments\":{\"topik\":\"pembayaran\"}}]";
    const result = parseLlamaLeakedToolCalls(raw);

    expect(result.cleanedText).toBe("");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("info_toko");
    expect(JSON.parse(result.toolCalls[0].function.arguments)).toEqual({ topik: "pembayaran" });
  });

  it("parses standalone JSON tool call", () => {
    const raw = "{\"name\":\"cari_produk\",\"arguments\":{\"kata_kunci\":\"RTX 4060\"}}";
    const result = parseLlamaLeakedToolCalls(raw);

    expect(result.cleanedText).toBe("");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("cari_produk");
  });

  it("leaves standard conversational text untouched", () => {
    const text = "Halo kak! Ada yang bisa kami bantu hari ini seputar laptop atau komputer?";
    const result = parseLlamaLeakedToolCalls(text);

    expect(result.cleanedText).toBe(text);
    expect(result.toolCalls).toHaveLength(0);
  });
});

describe("LLM Provider - Cooldown Management", () => {
  beforeEach(() => {
    resetProviderCooldowns();
  });

  it("records cooldown correctly and expires after time", () => {
    expect(isProviderInCooldown("groq")).toBe(false);
    expect(getProviderCooldownRemaining("groq")).toBe(0);

    setProviderCooldown("groq", 10);
    expect(isProviderInCooldown("groq")).toBe(true);
    expect(getProviderCooldownRemaining("groq")).toBeGreaterThan(0);
    expect(getProviderCooldownRemaining("groq")).toBeLessThanOrEqual(10);

    resetProviderCooldowns();
    expect(isProviderInCooldown("groq")).toBe(false);
  });
});

describe("LLM Provider - executeWithFailover", () => {
  beforeEach(() => {
    resetProviderCooldowns();
    vi.stubEnv("LLM_PROVIDER_ORDER", "groq,gemini");
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses Groq successfully when Groq API returns HTTP 200", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Halo dari Groq Llama!",
            },
          },
        ],
      }),
    } as unknown as Response));

    const response = await executeWithFailover({
      systemInstruction: "Kamu asisten toko",
      messages: [{ role: "user", content: "Halo" }],
    });

    expect(response.provider).toBe("groq");
    expect(response.content).toBe("Halo dari Groq Llama!");
  });

  it("fails over to Gemini when Groq returns HTTP 429", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "30" }),
      text: async () => "Rate limit reached. Please try again in 30s.",
    } as unknown as Response));

    const response = await executeWithFailover({
      systemInstruction: "Kamu asisten toko",
      messages: [{ role: "user", content: "Halo" }],
    });

    expect(response.provider).toBe("gemini");
    expect(response.content).toBe("Jawaban dari Gemini mock");
    expect(isProviderInCooldown("groq")).toBe(true);
  });

  it("skips Groq and directly calls Gemini when Groq is in active cooldown", async () => {
    setProviderCooldown("groq", 60);

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await executeWithFailover({
      systemInstruction: "Kamu asisten toko",
      messages: [{ role: "user", content: "Halo" }],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.provider).toBe("gemini");
    expect(response.content).toBe("Jawaban dari Gemini mock");
  });
});

