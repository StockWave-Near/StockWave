import type { Metadata } from "next";
import WaveLogo from "@/components/WaveLogo";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StockWave Notebook",
  description: "A public record of stock gifts — inspired by the Tamil custom of writing wedding gifts in a family notebook.",
};

type Gift = {
  id: string;
  stock: string;
  usd: number;
  note: string;
  senderAccount: string;
  status: string;
  createdAt: string;
};

async function getGifts(): Promise<Gift[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/notebook`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Gift[];
  } catch {
    return [];
  }
}

const STATUS_LABEL: Record<string, string> = {
  AWAITING_DEPOSIT: "pending",
  FUNDED: "funded",
  CLAIMED: "claimed ✓",
  REFUNDED: "refunded",
  FAILED: "failed",
};

const STOCK_NAMES: Record<string, string> = {
  GOOGL: "Google",
  AAPL: "Apple",
  TSLA: "Tesla",
};

function shortAccount(a: string): string {
  return a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

export default async function NotebookPage() {
  const gifts = await getGifts();

  return (
    <>
      <main className="wrap">
        <nav className="nav">
          <a href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <WaveLogo /> StockWave
          </a>
          <a className="pill" href="/#send">Send a gift</a>
        </nav>

        <section style={{ maxWidth: 720, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">The notebook</span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", margin: "14px 0 10px", lineHeight: 1.1 }}>
            A record of every gift
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.75, maxWidth: 540, margin: "0 0 40px" }}>
            Inspired by the Tamil custom of writing wedding gifts in a family notebook — so each
            gift can be remembered and returned one day.
          </p>

          {gifts.length === 0 ? (
            <div className="preview" style={{ textAlign: "center", padding: "32px 24px" }}>
              No gifts recorded yet. <a href="/#send" style={{ color: "inherit" }}>Send the first one →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {gifts.map((g, i) => (
                <div key={g.id} className="crow" style={{ gap: 16, padding: "16px 20px" }}>
                  <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, fontSize: 13, opacity: 0.4, minWidth: 28 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      ${g.usd} of {STOCK_NAMES[g.stock] ?? g.stock}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>
                      from {shortAccount(g.senderAccount)}
                      {g.note ? ` · "${g.note}"` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      className={`badge${g.status === "CLAIMED" ? " live" : ""}`}
                      style={{ fontSize: 11 }}
                    >
                      {STATUS_LABEL[g.status] ?? g.status}
                    </span>
                    <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
                      {new Date(g.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, opacity: 0.5, marginTop: 32, lineHeight: 1.6 }}>
            Sender names are wallet addresses. Gift amounts and stocks are public.
            Notes are shown as entered. Unclaimed and failed gifts are included for completeness.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
