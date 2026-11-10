import { config } from "./config";

// Thin client for the NEAR Intents 1Click API. Shapes are from ARCHITECTURE.md section 5;
// fields marked [U] there must be re-checked against the live API.

export type QuoteRequest = {
  dry: boolean;
  swapType: "EXACT_INPUT";
  slippageTolerance: number; // basis points
  originAsset: string;
  destinationAsset: string;
  amount: string; // base units
  depositType: "ORIGIN_CHAIN" | "INTENTS";
  recipient: string;
  recipientType: "DESTINATION_CHAIN" | "INTENTS";
  refundTo: string;
  refundType: "ORIGIN_CHAIN" | "INTENTS";
  deadline: string; // ISO date
  referral?: string;
  appFees?: { recipient: string; fee: number }[];
};

export type SwapStatus =
  | "PENDING_DEPOSIT"
  | "KNOWN_DEPOSIT_TX"
  | "PROCESSING"
  | "SUCCESS"
  | "INCOMPLETE_DEPOSIT"
  | "REFUNDED"
  | "FAILED";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.oneClickBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(config.oneClickKey ? { "x-api-key": config.oneClickKey } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new OneClickError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

export class OneClickError extends Error {
  constructor(public status: number, public body: string) {
    super(`1Click ${status}: ${body.slice(0, 200)}`);
  }
}

export const oneClick = {
  tokens: () => call<unknown[]>("/v0/tokens"),
  quote: (body: QuoteRequest) =>
    call<unknown>("/v0/quote", { method: "POST", body: JSON.stringify(body) }),
  status: (depositAddress: string) =>
    call<{ status: SwapStatus }>(
      `/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`,
    ),
  submitDeposit: (txHash: string, depositAddress: string) =>
    call<unknown>("/v0/deposit/submit", {
      method: "POST",
      body: JSON.stringify({ txHash, depositAddress }),
    }),
};
