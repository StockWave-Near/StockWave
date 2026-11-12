import { config } from "./config";

export type QuoteRequest = {
  dry: boolean;
  swapType: "EXACT_INPUT";
  slippageTolerance: number;
  originAsset: string;
  destinationAsset: string;
  amount: string;
  depositType: "ORIGIN_CHAIN" | "INTENTS";
  recipient: string;
  recipientType: "DESTINATION_CHAIN" | "INTENTS";
  refundTo: string;
  refundType: "ORIGIN_CHAIN" | "INTENTS";
  deadline: string;
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

// Abort after 10 seconds — prevents Vercel function timeouts from hanging the UI.
const TIMEOUT_MS = 10_000;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.oneClickBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(config.oneClickKey ? { "x-api-key": config.oneClickKey } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) throw new OneClickError(res.status, await res.text());
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new OneClickError(504, "1Click API timed out");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
    call<{ status: SwapStatus; swapDetails?: { amountOut?: string } }>(
      `/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`,
    ),
  submitDeposit: (txHash: string, depositAddress: string) =>
    call<unknown>("/v0/deposit/submit", {
      method: "POST",
      body: JSON.stringify({ txHash, depositAddress }),
    }),
};
