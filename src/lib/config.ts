// Central config. Server-only values come from env; nothing secret is exported to the client.
export const config = {
  oneClickBase: process.env.ONECLICK_API_BASE ?? "https://1click.chaindefuser.com",
  oneClickKey: process.env.ONECLICK_API_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  nearRpc: process.env.NEAR_RPC_URL ?? "https://rpc.mainnet.near.org",
  vaultAccount: process.env.MOI_VAULT_ACCOUNT ?? "",
  // WhatsApp Cloud API (optional: wa.me share links work without these)
  waToken: process.env.WHATSAPP_TOKEN ?? "",
  waPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  waVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
};
