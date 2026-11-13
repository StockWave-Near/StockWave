"use client";

import { useEffect, useRef, useState } from "react";
import StockIcon from "./StockIcon";
import ShareButtons from "./ShareButtons";
import { useNearIdentity } from "./NearAuthProvider";
import { BASKETS, basketLegAmounts, minBasketUsd, type BasketDef } from "@/lib/baskets";
import { generateClaimKeypair } from "@/lib/keys";
import { MAX_USD } from "@/lib/stocks";

// Same logos as the single-stock builder.
const META: Record<string, { name: string; logo: string; color: string }> = {
  GOOGL: { name: "Google", logo: "/logos/brands/google.svg", color: "#4285F4" },
  AAPL: { name: "Apple", logo: "/logos/brands/apple.svg", color: "#1d1d1f" },
  TSLA: { name: "Tesla", logo: "/logos/brands/tesla.svg", color: "#CC0000" },
};
const AMOUNTS = [20, 30, 50, 100];
const LIST = Object.values(BASKETS);

type LegState = { giftId: string; stock: string; usd: number; depositAddress: string; status: string };
type Pending = { id: string; link: string; basket: BasketDef; usd: number; legs: LegState[] };

const statusText = (s: string) =>
  s === "SUCCESS" ? "Funded" :
  s === "PROCESSING" || s === "KNOWN_DEPOSIT_TX" ? "Payment received, swapping…" :
  s === "REFUNDED" ? "Refunded" :
  s === "FAILED" ? "Failed" : "Waiting for payment";

function Mix({ b, size = 40 }: { b: BasketDef; size?: number }) {
  return (
    <span style={{ display: "inline-flex" }}>
      {b.legs.map((l, i) => (
        <span key={l.stock} style={{ marginLeft: i ? -size * 0.28 : 0 }}>
          <StockIcon a={{ ...META[l.stock], ticker: l.stock }} size={size} />
        </span>
      ))}
    </span>
  );
}

export default function BasketBuilder() {
  const { ready: authReady, loggedIn, accountId, error: authError, login } = useNearIdentity();
  const [basketKey, setBasketKey] = useState<string>("bigtech");
  const [usd, setUsd] = useState(20);
  const [note, setNote] = useState("");
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [stage, setStage] = useState<"build" | "funding" | "ready">("build");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const basket = BASKETS[basketKey];
  const min = minBasketUsd(basket);
  const amount = Math.min(Math.max(usd, min), MAX_USD);
  const split = basketLegAmounts(basket, amount);

  // Poll every leg until all are funded.
  useEffect(() => {
    if (stage !== "funding" || !pending) return;
    const current = pending;
    async function poll() {
      const next = await Promise.all(current.legs.map(async (leg) => {
        if (leg.status === "SUCCESS") return leg;
        try {
          const r = await fetch(`/api/status?depositAddress=${encodeURIComponent(leg.depositAddress)}`);
          if (!r.ok) return leg;
          const d = (await r.json()) as { status?: string };
          return { ...leg, status: d.status ?? leg.status };
        } catch { return leg; }
      }));
      setPending((p) => (p && p.id === current.id ? { ...p, legs: next } : p));
      if (next.every((l) => l.status === "SUCCESS")) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStage("ready");
      }
    }
    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // Re-run only when the stage or basket id changes, not on every status update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pending?.id]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const pairs = await Promise.all(basket.legs.map(() => generateClaimKeypair()));
      const res = await fetch("/api/basket", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          basket: basket.key, usd: amount, note, declaredEligible: declared,
          senderAccount: accountId ?? "",
          claimPublicKeys: pairs.map((p) => p.publicKey),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 451) throw new Error("region_blocked");
        if (res.status === 429) throw new Error("rate_limited");
        throw new Error(err.error ?? "basket_create_failed");
      }
      const data = (await res.json()) as { id: string; legs: Omit<LegState, "status">[] };
      // Keys go in the fragment only; the browser never sends a fragment to any server.
      const link = `${window.location.origin}/b/${encodeURIComponent(data.id)}#k=${pairs.map((p) => p.privateKey).join(",")}`;
      setPending({
        id: data.id, link, basket, usd: amount,
        legs: data.legs.map((l) => ({ ...l, status: "PENDING_DEPOSIT" })),
      });
      setStage("funding");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg === "region_blocked" ? "Tokenized stocks are not available in your region." :
        msg === "rate_limited" ? "Too many tries. Wait a minute and try again." :
        msg === "vault_not_configured" ? "The vault is not configured yet. Check back soon." :
        "Could not create the basket. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPending(null);
    setStage("build");
    setError(null);
  };

  // ── Funding ────────────────────────────────────────────────────────────────
  if (stage === "funding" && pending) {
    const done = pending.legs.filter((l) => l.status === "SUCCESS").length;
    const failed = pending.legs.some((l) => l.status === "REFUNDED" || l.status === "FAILED");
    return (
      <section className="panel" id="send" aria-live="polite">
        <h2>Pay to create the basket</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, margin: "0 0 16px" }}>
          One small USDC payment per stock, <strong>${pending.usd} in total</strong>. Your link appears when all {pending.legs.length} are in.
        </p>
        {pending.legs.map((leg) => (
          <div className="link-box" key={leg.giftId}>
            <strong>
              {META[leg.stock]?.name ?? leg.stock}: send {leg.usd.toFixed(2)} USDC · {statusText(leg.status)}
            </strong>
            {leg.depositAddress}
          </div>
        ))}
        <div className="funding-status">
          <span className="funding-dot" />
          {done} of {pending.legs.length} funded
        </div>
        {failed && (
          <p className="fine" style={{ color: "#c0392b" }}>
            One payment was refunded or failed. Cancel and try again; refunds go back to your account.
          </p>
        )}
        <button className="pill" style={{ marginTop: 20, background: "rgba(44,58,34,0.12)", color: "inherit" }} onClick={reset}>
          Cancel
        </button>
      </section>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  if (stage === "ready" && pending) {
    return (
      <section className="panel" id="send" aria-live="polite">
        <h2>Basket ready to send 🎁</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, margin: "0 0 4px" }}>
          Share this link. Your friend signs in once and claims{" "}
          <strong>${pending.usd} of {pending.basket.name}</strong>: {pending.basket.legs.map((l) => META[l.stock].name).join(", ")}.
        </p>
        <div className="link-box">
          <strong>Basket link</strong>
          {pending.link.split("#")[0]}
          <span style={{ opacity: 0.45 }}>#k=…</span>
        </div>
        <ShareButtons link={pending.link} stock={pending.basket.name} usd={pending.usd} />
        <p className="fine" style={{ marginTop: 20 }}>
          Keep this link safe. The claim keys live after the # and never reach StockWave.
        </p>
        <button className="pill" style={{ marginTop: 24, background: "rgba(44,58,34,0.12)", color: "inherit" }} onClick={reset}>
          Send another gift
        </button>
      </section>
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="cards" id="baskets">
        {LIST.map((b) => (
          <button key={b.key} className="card" aria-pressed={basketKey === b.key} onClick={() => setBasketKey(b.key)}>
            <div>
              <Mix b={b} size={44} />
              <h3 style={{ marginTop: 12 }}>{b.name}</h3>
              <small>{b.tagline}</small>
            </div>
            <span className="tag">{b.legs.map((l) => `${l.stock} ${l.weight}%`).join(" · ")}</span>
          </button>
        ))}
      </div>

      <section className="panel" id="send">
        <h2>Send {basket.name} to a friend</h2>

        <label className="field">Total amount</label>
        <div className="row">
          {AMOUNTS.map((a) => (
            <button key={a} className="chip" aria-pressed={usd === a} disabled={a < min} onClick={() => setUsd(a)}>${a}</button>
          ))}
        </div>
        <p className="fine">Minimum ${min} for this basket, maximum ${MAX_USD}.</p>

        <div className="preview" style={{ marginTop: 4 }}>
          {split.map((l) => `${META[l.stock].name} $${l.usd.toFixed(2)}`).join(" · ")}
        </div>

        <label className="field" htmlFor="bnote">A short note (optional)</label>
        <input id="bnote" className="input" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy birthday!" />

        <label className="check">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
          <span>I confirm I am not a resident of the United States or Canada.</span>
        </label>

        <div className="row" style={{ marginTop: 4, flexWrap: "wrap" }}>
          {!authReady ? null : !loggedIn ? (
            <button className="pill" onClick={() => login()} style={{ background: "rgba(44,58,34,0.12)", color: "inherit" }}>
              Sign in to send
            </button>
          ) : (
            <button className="pill" onClick={create} disabled={busy || !declared || !accountId}>
              {busy ? "Creating…" : "Create basket link"}
            </button>
          )}
        </div>

        {loggedIn && !accountId && (
          <p className="fine" style={{ color: "#c0392b" }}>
            Signed in, but your NEAR account could not be read{authError ? `: ${authError.slice(0, 140)}` : "."}
          </p>
        )}
        {error && <div className="preview err">{error}</div>}
        <p className="fine">Tokenized shares are not a brokerage account. You pay once per stock.</p>
      </section>
    </>
  );
}
