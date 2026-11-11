import { config } from "./config";

// ── Level 1: wa.me share link (no API keys needed) ───────────────────────────
// The gift link (#k= fragment) is passed in by the browser and never stored here.
export function whatsappShareUrl(opts: {
  link: string;
  senderName?: string;
  stock?: string;
  usd?: number;
  phone?: string; // E.164 digits only; omit to let the sender pick a contact
}): string {
  const from = opts.senderName
    ? opts.senderName.replace(/\.near$/, "") // strip .near so it reads like a real name
    : "Someone";
  const what = opts.stock && opts.usd ? `$${opts.usd} of ${opts.stock}` : "a share";
  const text = `${from} gifted you ${what} 🎁\nOpen to claim — no wallet or crypto needed:\n${opts.link}`;
  const base = opts.phone ? `https://wa.me/${opts.phone.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

// ── Level 2: Twilio WhatsApp Sandbox ─────────────────────────────────────────
// Twilio sends webhooks as application/x-www-form-urlencoded and expects replies
// the same way. We use the REST API to send outbound messages.
// Sandbox number is always "whatsapp:+14155238886"; recipients must opt in first
// by texting the join code shown in the Twilio console.

function twilioAuthHeader(): string {
  const creds = `${config.twilioAccountSid}:${config.twilioAuthToken}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

// Send a free-form text reply. `to` is E.164, e.g. "919876543210".
export async function sendText(to: string, body: string): Promise<void> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioWhatsAppFrom) {
    throw new Error("Twilio not configured");
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
  const params = new URLSearchParams({
    From: `whatsapp:${config.twilioWhatsAppFrom}`,
    To: `whatsapp:+${to.replace(/\D/g, "")}`,
    Body: body.slice(0, 1600),
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: twilioAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// Send the gift notification as a plain text message (no template approval needed
// in the sandbox — any message works within the 24 h session window).
export async function sendGiftTemplate(
  to: string,
  link: string,
  amountLabel: string,
): Promise<void> {
  const body = `You've been gifted ${amountLabel} on StockWave 🎁\nClaim it here (no wallet needed):\n${link}`;
  return sendText(to, body);
}
