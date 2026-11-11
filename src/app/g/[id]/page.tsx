import type { Metadata } from "next";
import ClaimPage from "./ClaimPage";

type Params = { params: Promise<{ id: string }> };

// ── Open Graph metadata ─────────────────────────────────────────────────────
// The #k= fragment is never sent to the server (browsers strip fragments before the
// HTTP request), so there is no way for this metadata handler to leak it.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  // Fetch public gift details (no private key involved).
  let title = "You've been given a stock 🎁";
  let description = "Open to claim your tokenized share on StockWave — no wallet or crypto needed.";

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/gift/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) {
      const gift = (await res.json()) as {
        name?: string;
        usd?: number;
        note?: string;
        status?: string;
      };
      if (gift.name && gift.usd) {
        title = `You've been given $${gift.usd} of ${gift.name} 🎁`;
        description = gift.note
          ? `"${gift.note}" — Claim your ${gift.name} share on StockWave.`
          : `Claim your ${gift.name} share on StockWave. No wallet or crypto needed.`;
      }
    }
  } catch {
    // Fall back to generic copy if the API is unavailable.
  }

  return {
    title,
    description,
    // Referrer-Policy is set globally in next.config.ts; the #k= fragment is safe.
    openGraph: {
      title,
      description,
      siteName: "StockWave",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function GiftPage({ params }: Params) {
  const { id } = await params;
  return <ClaimPage id={id} />;
}
