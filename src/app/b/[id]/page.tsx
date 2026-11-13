import type { Metadata } from "next";
import BasketClaim from "./BasketClaim";

// Fully dynamic: the basket id comes from the URL and the claim keys from the fragment.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Generic preview only. Fragments never reach the server, so keys cannot leak here.
export async function generateMetadata(): Promise<Metadata> {
  const title = "You've been given a basket of stocks 🎁";
  const description = "Open to claim your tokenized shares on StockWave. No wallet or crypto needed.";
  return {
    title, description,
    openGraph: { title, description, siteName: "StockWave", type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function BasketPage({ params }: Params) {
  const { id } = await params;
  return <BasketClaim id={id} />;
}
