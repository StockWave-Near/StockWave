"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNearIdentity } from "@/components/NearAuthProvider";
import WaveLogo from "@/components/WaveLogo";
import StockIcon from "@/components/StockIcon";
import { parseBasketHash } from "@/lib/gift-link";

const ICONS: Record<string, { logo: string; color: string }> = {
  GOOGL: { logo: "/logos/brands/google.svg", color: "#4285F4" },
  AAPL: { logo: "/logos/brands/apple.svg", color: "#1d1d1f" },
  TSLA: { logo: "/logos/brands/tesla.svg", color: "#CC0000" },
};

type Leg = { giftId: string; stock: string; name: string; usd: number; status: string };
type Info = { id: string; name: string; usd: number; note: string; legs: Leg[] };
type Result = "idle" | "claiming" | "done" | "error";

export default function BasketClaim({ id }: { id: string }) {
  const { ready, loggedIn, accountId, login } = useNearIdentity();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState<string[] | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/basket/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Info) => {
        setInfo(d);
        setKeys(parseBasketHash(window.location.hash, d.legs.length));
      })
      .catch((s) => setError(s === 404 ? "not_found" : "load_failed"));
  }, [id]);

  async function claimAll() {
    if (!info || !keys || !accountId) return;
    setBusy(true);
    // One claim per stock. Legs run one after another so a failure in one doesn't hide the rest.
    for (let i = 0; i < info.legs.length; i++) {
      const leg = info.legs[i];
      if (leg.status !== "FUNDED" || results[leg.giftId] === "done") continue;
      setResults((r) => ({ ...r, [leg.giftId]: "claiming" }));
      try {
        const res = await fetch("/api/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ giftId: leg.giftId, claimKey: keys[i], recipientAccountId: accountId }),
        });
        setResults((r) => ({ ...r, [leg.giftId]: res.ok ? "done" : "error" }));
      } catch {
        setResults((r) => ({ ...r, [leg.giftId]: "error" }));
      }
    }
    setBusy(false);
  }

  if (error) {
    return <Shell><p style={{ opacity: 0.75, fontSize: 15 }}>
      {error === "not_found" ? "This basket link is not recognised." : "Could not load this basket right now. Please try again."}
    </p></Shell>;
  }
  if (!info) return <Shell><p style={{ opacity: 0.6, fontSize: 14 }}>Loading basket…</p></Shell>;

  const claimable = info.legs.filter((l) => l.status === "FUNDED" || results[l.giftId] === "done");
  const allDone = info.legs.every((l) => l.status === "CLAIMED" || results[l.giftId] === "done");
  const waiting = info.legs.some((l) => l.status === "AWAITING_DEPOSIT");
  const failed = info.legs.some((l) => l.status === "REFUNDED" || l.status === "FAILED");
  const hadError = Object.values(results).includes("error");

  return (
    <Shell>
      <small style={{ opacity: 0.6 }}>You&apos;ve been given</small>
      <strong style={{ fontSize: 30, fontFamily: "var(--font-num)" }}>${info.usd} of {info.name}</strong>
      {info.note && <em style={{ fontFamily: "var(--font-serif)", opacity: 0.72 }}>&ldquo;{info.note}&rdquo;</em>}

      <div style={{ width: "100%", display: "grid", gap: 8, marginTop: 10 }}>
        {info.legs.map((l) => {
          const r = results[l.giftId];
          const label =
            l.status === "CLAIMED" || r === "done" ? "Claimed" :
            r === "claiming" ? "Claiming…" :
            r === "error" ? "Failed, try again" :
            l.status === "FUNDED" ? "Ready" :
            l.status === "AWAITING_DEPOSIT" ? "Being funded" : "Refunded";
          const ic = ICONS[l.stock];
          return (
            <div key={l.giftId} className="crow" style={{ textAlign: "left" }}>
              {ic && <StockIcon a={{ ...ic, ticker: l.stock, name: l.name }} size={40} />}
              <div className="cmeta"><b>{l.name}</b><small>${l.usd.toFixed(2)}</small></div>
              <span className={`badge ${label === "Ready" ? "live" : ""}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div className="preview" style={{ textAlign: "center" }}>
          🎉 All claimed! The shares are on their way to {accountId ? `${accountId.slice(0, 8)}…${accountId.slice(-6)}` : "your account"}.
        </div>
      ) : !keys ? (
        <div className="preview err" style={{ textAlign: "center" }}>
          The claim keys were not found in the link. Open the full link including the part after the #.
        </div>
      ) : waiting && claimable.length === 0 ? (
        <div className="preview" style={{ textAlign: "center" }}>The sender is still funding this basket. Come back in a moment.</div>
      ) : (
        <>
          {waiting && <p className="fine">Some stocks are still being funded. You can claim the ready ones now.</p>}
          {failed && <p className="fine">A refunded stock goes back to the sender.</p>}
          <button
            className="pill"
            disabled={!ready || busy || (loggedIn && !accountId)}
            onClick={loggedIn ? claimAll : () => login()}
          >
            {busy ? "Claiming…" : loggedIn ? `Claim ${claimable.length} share${claimable.length === 1 ? "" : "s"}` : "Sign in to claim"}
          </button>
          {hadError && <p className="fine" style={{ color: "#c0392b" }}>Some claims failed. Tap again to retry them.</p>}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="wrap" style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <nav className="nav">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}><WaveLogo /> StockWave</Link>
      </nav>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 24px", textAlign: "center" }}>
        <div className="panel" style={{ maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {children}
        </div>
      </div>
    </main>
  );
}
