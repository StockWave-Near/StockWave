import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { sendText } from "@/lib/whatsapp";
import { handleBotMessage } from "@/lib/whatsapp-bot";

// Meta webhook handshake.
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (
    config.waVerifyToken &&
    q.get("hub.mode") === "subscribe" &&
    q.get("hub.verify_token") === config.waVerifyToken
  ) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  if (!config.waAppSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", config.waAppSecret).update(raw).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

type Incoming = {
  entry?: { changes?: { value?: { messages?: { from: string; type: string; text?: { body: string } }[] } }[] }[];
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }
  let payload: Incoming;
  try { payload = JSON.parse(raw); } catch { return new Response("ok"); }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        if (m.type !== "text" || !m.text) continue;
        try {
          await sendText(m.from, handleBotMessage(m.from, m.text.body.slice(0, 200)));
        } catch { /* never fail the webhook; Meta would retry */ }
      }
    }
  }
  return new Response("ok");
}
