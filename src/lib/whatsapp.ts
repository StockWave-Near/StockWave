import { config } from "./config";

// Level 1 (no setup): wa.me click-to-share link. Works on phone and desktop, no API keys.
export function whatsappShareUrl(opts: {
  link: string;
  senderName?: string;
  stock?: string;
  usd?: number;
  phone?: string; // E.164 digits only; omit to let the sender pick a contact
}): string {
  const who = opts.senderName ? `${opts.senderName} sent you` : "You've been sent";
  const what =
    opts.stock && opts.usd ? `$${opts.usd} of ${opts.stock}` : "your first stock";
  const text = `${who} ${what} on Moi 🎁\nOpen to claim (no wallet needed):\n${opts.link}`;
  const base = opts.phone ? `https://wa.me/${opts.phone.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

// Level 2 (needs Meta WhatsApp Business Cloud API): Moi sends the message itself.
// Business-initiated messages must use an approved template. Template name is a placeholder.
export async function sendGiftTemplate(to: string, link: string, amountLabel: string) {
  if (!config.waToken || !config.waPhoneId) {
    throw new Error("WhatsApp Cloud API not configured");
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${config.waPhoneId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.waToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: "moi_gift_link",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: amountLabel },
              { type: "text", text: link },
            ],
          },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Free-form reply inside the 24h window after the user messaged the bot first.
export async function sendText(to: string, body: string) {
  if (!config.waToken || !config.waPhoneId) throw new Error("WhatsApp Cloud API not configured");
  const res = await fetch(`https://graph.facebook.com/v21.0/${config.waPhoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.waToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: body.slice(0, 4000), preview_url: false },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
