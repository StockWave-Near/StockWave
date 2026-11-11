import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { sendText } from "@/lib/whatsapp";
import { handleBotMessage } from "@/lib/whatsapp-bot";

// Twilio signs every webhook with HMAC-SHA1 over (URL + sorted params).
// Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
function validTwilioSignature(
  rawBody: string,
  signature: string | null,
  url: string,
): boolean {
  if (!config.twilioAuthToken || !signature) return false;

  // Build the validation string: URL + alphabetically sorted key=value pairs (no separator).
  const params = new URLSearchParams(rawBody);
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const str = url + sorted.map(([k, v]) => `${k}${v}`).join("");

  const expected = createHmac("sha1", config.twilioAuthToken).update(str).digest("base64");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Twilio GET handshake is not used — it POSTs directly.
// We expose a GET only so health checks don't 404.
export function GET() {
  return new Response("ok");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-twilio-signature");

  // Reconstruct the full URL Twilio signed (must match exactly what's in the console).
  const url =
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
      : request.url;

  if (!validTwilioSignature(rawBody, signature, url)) {
    return new Response("bad signature", { status: 401 });
  }

  // Twilio sends form-encoded fields. Relevant ones:
  //   From  = "whatsapp:+919876543210"
  //   Body  = the message text
  const params = new URLSearchParams(rawBody);
  const from = params.get("From") ?? "";
  const body = params.get("Body") ?? "";

  // Strip the "whatsapp:+" prefix to get a plain digit string.
  const phone = from.replace(/^whatsapp:\+?/, "").replace(/\D/g, "");

  if (phone && body) {
    try {
      const reply = await handleBotMessage(phone, body.slice(0, 200));
      await sendText(phone, reply);
    } catch { /* never fail the webhook; Twilio would retry */ }
  }

  // Twilio expects a 200 with an empty TwiML response (or just 200 with no body).
  return new Response("<Response></Response>", {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}
