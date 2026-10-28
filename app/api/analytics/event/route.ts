import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  visitorId: z.string().min(5).max(100),
  sessionId: z.string().min(5).max(100),
  eventName: z.enum([
    "page_view",
    "view_item",
    "search",
    "search_no_results",
    "add_to_cart",
    "begin_checkout",
    "ai_recommendation_click",
  ]),
  path: z.string().min(1).max(255),
  referrerDomain: z.string().max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  deviceType: z.enum(["mobile", "desktop", "tablet"]).optional(),
  productId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    // 1. Content size guard
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 16 * 1024) {
      return NextResponse.json({ error: "Payload terlalu besar" }, { status: 413 });
    }

    // 2. IP rate limiting (60 events per minute)
    const clientIp = getClientIp(request);
    try {
      const rateLimit = await checkRateLimit(`analytics:${clientIp}`, 60, 60, {
        allowMemoryFallback: true,
      });
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
    } catch {
      // Continue safely if rate-limiter has transient error
    }

    // 3. Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parseResult = eventSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const event = parseResult.data;

    // 4. Strict exclusion: never record admin paths as public traffic
    if (event.path.startsWith("/admin")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 5. Insert into analytics_events table using Admin Client
    try {
      const adminClient = getSupabaseAdminClient();
      const { error } = await adminClient.from("analytics_events").insert({
        visitor_id: event.visitorId,
        session_id: event.sessionId,
        event_name: event.eventName,
        path: event.path,
        referrer_domain: event.referrerDomain || null,
        utm_source: event.utmSource || null,
        utm_medium: event.utmMedium || null,
        utm_campaign: event.utmCampaign || null,
        device_type: event.deviceType || "desktop",
        product_id: event.productId || null,
        metadata: event.metadata || {},
      });

      if (error) {
        // Table may not yet be applied on remote database (non-blocking fallback)
        return NextResponse.json({ success: true, recorded: false });
      }

      return NextResponse.json({ success: true, recorded: true });
    } catch {
      return NextResponse.json({ success: true, recorded: false });
    }
  } catch (err) {
    console.error("[Analytics Event Error]", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

