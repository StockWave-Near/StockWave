// Central config. Server-only values come from env; nothing secret is exported to the client.
export const config = {
  oneClickBase: process.env.ONECLICK_API_BASE ?? "https://1click.chaindefuser.com",
  oneClickKey: process.env.ONECLICK_API_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  nearRpc: process.env.NEAR_RPC_URL ?? "https://rpc.testnet.near.org",
  vaultAccount: process.env.STOCKWAVE_VAULT_ACCOUNT ?? "",
  nearRegistrarKey: process.env.NEAR_REGISTRAR_PRIVATE_KEY ?? "",

  // Twilio WhatsApp Sandbox
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioWhatsAppFrom: process.env.TWILIO_WHATSAPP_FROM ?? "+14155238886",
  twilioAuthSig: process.env.TWILIO_AUTH_TOKEN ?? "",
};
