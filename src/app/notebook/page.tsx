import type { Metadata } from "next";
import WaveLogo from "@/components/WaveLogo";
import Footer from "@/components/Footer";
import { getAllGifts } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StockWave Notebook",
  description: "A public record of stock gifts — inspired by the Tamil custom of writing wedding gifts in a family notebook.",
};

const STATUS_LABEL: Record<string, { label: string; live: boolean }> = {
  AWAITING_DEPOSIT: { label: "pending payment", live: false },
  FUNDED:           { label: "funded",           live: false },
  CLAIMED:          { label: "claimed ✓",        live: true  },
  REFUNDED:         { label: "refunded",          live: false },
  FAILED:           { label: "failed",            live: false },
};

const STOCK_NAMES: Record<string, string> = {
  GOOGL: "Google",
  AAPL:  "Apple",
  TSLA:  "Tesla",
};

function shortAccount(a: string): string {
  return a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

export default async function NotebookPage() {
  const all = await getAllGifts();
  const gifts = all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);

  const totalClaimed = gifts.filter((g) => g.status === "CLAIMED").length;
  const totalUsd = gifts
    .filter((g) => g.status === "CLAIMED")
    .reduce((s, g) => s + g.usd, 0);

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
          <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.75, maxWidth: 540, margin: "0 0 28px" }}>
            Inspired by the Tamil custom of writing wedding gifts in a family notebook — so each
            gift can be remembered and returned one day.
          </p>

          {/* Stats bar */}
          {gifts.length > 0 && (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 36 }}>
              {[
                { label: "Gifts sent", value: gifts.length },
                { label: "Claimed", value: totalClaimed },
                { label: "Total gifted", value: `$${totalUsd.toLocaleString()}` },
              ].map((s) => (
                <div key={s.label} style={{ padding: "14px 20px", borderRadius: 16, border: "1px solid var(--glass-line)", background: "var(--glass)", backdropFilter: "blur(10px)", minWidth: 110 }}>
                  <div style={{ fontFamily: "var(--font-num)", fontWeight: 700, fontSize: 24 }}>{s.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {gifts.length === 0 ? (
            <div className="preview" style={{ textAlign: "center", padding: "32px 24px" }}>
              No gifts recorded yet.{" "}
              <a href="/#send" style={{ color: "inherit" }}>Send the first one →</a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {gifts.map((g, i) => {
                const st = STATUS_LABEL[g.status] ?? { label: g.status, live: false };
                return (
                  <div key={g.id} className="crow" style={{ gap: 14, padding: "14px 18px" }}>
                    <span style={{ fontFamily: "var(--font-num)", fontWeight: 700, fontSize: 12, opacity: 0.35, minWidth: 26, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        ${g.usd} of {STOCK_NAMES[g.stock] ?? g.stock}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        from {shortAccount(g.senderAccount)}
                        {g.note ? ` · "${g.note}"` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span className={`badge${st.live ? " live" : ""}`} style={{ fontSize: 11 }}>
                        {st.label}
                      </span>
                      <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                        {new Date(g.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: 12, opacity: 0.45, marginTop: 28, lineHeight: 1.6 }}>
            Sender accounts and amounts are public. Notes are shown as entered.
            Claim keys and phone numbers are never stored here.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
