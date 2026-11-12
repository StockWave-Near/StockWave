"use client";

import StockIcon from "./StockIcon";
import ShareButtons from "./ShareButtons";
import { useState, useEffect, useRef } from "react";
import { useNearIdentity } from "./NearAuthProvider";
// import { usePrivy } from "@privy-io/react-auth";

const STOCKS = [
  { key: "GOOGL", name: "Google", sub: "Alphabet Class A", logo: "https://cdn.simpleicons.org/google/4285F4", color: "#4285F4" },
  { key: "AAPL", name: "Apple", sub: "Apple Inc.", logo: "https://cdn.simpleicons.org/apple/1d1d1f", color: "#1d1d1f" },
  { key: "TSLA", name: "Tesla", sub: "Tesla Inc.", logo: "https://cdn.simpleicons.org/tesla/CC0000", color: "#CC0000" },
] as const;
type Key = (typeof STOCKS)[number]["key"];
const AMOUNTS = [5, 10, 20, 50];

type Quote = { cached?: boolean; quote?: { quote?: { amountOutFormatted?: string; amountOutUsd?: string; timeEstimate?: number } } };

type GiftPending = {
  id: string;
  depositAddress: string;
  link: string;   // full URL with #k= fragment — never sent to server
  stock: Key;
  usd: number;
};

type GiftCreated = {
  link: string;
  stock: Key;
  usd: number;
};

// Possible UI stages
type Stage = "build" | "funding" | "ready";

export default function GiftBuilder() {
  const [stock, setStock] = useState<Key>("GOOGL");
  const [usd, setUsd] = useState(20);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [stage, setStage] = useState<Stage>("build");
  const [pending, setPending] = useState<GiftPending | null>(null);
  const [created, setCreated] = useState<GiftCreated | null>(null);
  const [fundingStatus, setFundingStatus] = useState<string>("Waiting for payment…");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // NEAR Auth gives us the signed-in user; their account is a real implicit NEAR account.
  const { ready: authReady, loggedIn, accountId, error: authError, login: authLogin } = useNearIdentity();
  const senderAccountId = () => accountId ?? "";

  // ── Previous login (Privy), kept for reference ──
  // Privy gives us the logged-in user. PrivyProvider wraps the whole app in Providers.tsx
  // so usePrivy() is always safe to call. If the app id is missing it returns unauthenticated.
  // const { ready: privyReady, user: privyUser, login: privyLogin } = usePrivy();
  //
  // Derive a NEAR-compatible account id from the Privy user (same logic as ClaimPage).
  // function senderAccountId(): string {
  //   if (!privyUser) return "sender.near"; // fallback for unauthenticated / no Privy
  //   if (privyUser.google?.email) {
  //     const local = privyUser.google.email
  //       .split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 50);
  //     return `${local}.near`;
  //   }
  //   if (privyUser.twitter?.username) {
  //     return `${privyUser.twitter.username.toLowerCase().replace(/[^a-z0-9._-]/g, "-")}.near`;
  //   }
  //   return `${privyUser.id.replace(/[^a-z0-9]/g, "").slice(0, 20)}.near`;
  // }

  const chosen = STOCKS.find((s) => s.key === stock)!;

  // ── Status polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "funding" || !pending) return;

    async function poll() {
      if (!pending) return;
      try {
        const res = await fetch(`/api/status?depositAddress=${encodeURIComponent(pending.depositAddress)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        const s = data.status ?? "";
        if (s === "SUCCESS") {
          clearInterval(pollRef.current!);
          setStage("ready");
          setCreated({ link: pending.link, stock: pending.stock, usd: pending.usd });
        } else if (s === "REFUNDED" || s === "FAILED") {
          clearInterval(pollRef.current!);
          setStage("build");
          setResult({ ok: false, text: s === "REFUNDED" ? "Payment was refunded. Please try again." : "Something went wrong with the payment. Please try again." });
          setPending(null);
        } else if (s === "PROCESSING" || s === "KNOWN_DEPOSIT_TX") {
          setFundingStatus("Payment received — processing swap…");
        } else if (s === "PENDING_DEPOSIT") {
          setFundingStatus("Waiting for your payment…");
        }
      } catch { /* keep polling */ }
    }

    poll(); // immediate first check
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stage, pending]);

  async function preview() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stock, usd }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(`quote_${res.status}_${err.error ?? "unknown"}`);
      }
      const data = (await res.json()) as Quote;
      const out = data.quote?.quote?.amountOutFormatted;
      const outUsd = data.quote?.quote?.amountOutUsd;
      const eta = data.quote?.quote?.timeEstimate;
      const sharesText = out ? `${Number(out).toFixed(6)} shares` : "a share";
      const usdText = outUsd ? ` (~$${Number(outUsd).toFixed(2)})` : "";
      const etaText = eta ? ` · arrives in ~${eta}s` : "";
      const staleNote = (data as { cached?: boolean }).cached ? " (indicative price)" : "";
      setResult({
        ok: true,
        text: `You pay $${usd}. Your friend gets ${sharesText} of ${chosen.name}${usdText}${etaText}${staleNote}. Nothing is signed yet.`,
      });
    } catch (e) {
      console.error("preview failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      const userText = msg.includes("429")
        ? "Too many requests — please wait a moment and try again."
        : msg.includes("502") || msg.includes("504")
        ? "Price service is busy right now. Please try again in a few seconds."
        : "We could not get a price right now. Please try again in a moment.";
      setResult({ ok: false, text: userText });
    } finally {
      setBusy(false);
    }
  }

  // ── Create link ────────────────────────────────────────────────────────────
  async function createLink() {
    setBusy(true);
    setResult(null);
    try {
      const rawKey = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      const rawPriv = await crypto.subtle.exportKey("pkcs8", rawKey.privateKey);
      const rawPub = await crypto.subtle.exportKey("raw", rawKey.publicKey);
      const privB58 = `ed25519:${toBase58(new Uint8Array(rawPriv).slice(-32))}`;
      const pubB58 = `ed25519:${toBase58(new Uint8Array(rawPub))}`;

      const idemKey = crypto.randomUUID();
      const res = await fetch("/api/gift", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idemKey },
        body: JSON.stringify({
          stock, usd, note, declaredEligible: declared,
          senderAccount: senderAccountId(),
          claimPublicKey: pubB58,
          recipientPhone: phone.replace(/\D/g, "") || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 451) throw new Error("region_blocked");
        if (res.status === 503) throw new Error("vault_not_configured");
        throw new Error(err.error ?? "gift_create_failed");
      }
      const { id, depositAddress } = (await res.json()) as { id: string; depositAddress: string };
      const link = `${window.location.origin}/g/${encodeURIComponent(id)}#k=${privB58}`;
      setPending({ id, depositAddress, link, stock, usd });
      setFundingStatus("Waiting for your payment…");
      setStage("funding");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      setResult({
        ok: false,
        text: msg === "region_blocked" ? "Tokenized stocks are not available in your region."
          : msg === "vault_not_configured" ? "The vault is not configured yet. Check back soon."
          : "Could not create the gift. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  // ── Funding screen ─────────────────────────────────────────────────────────
  if (stage === "funding" && pending) {
    return (
      <section className="panel" id="send" aria-live="polite">
        <h2>Pay to create the gift</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, margin: "0 0 16px" }}>
          Send <strong>${pending.usd} USDC</strong> to the address below. Once received, your gift link will appear automatically.
        </p>

        <div className="link-box">
          <strong>Deposit address</strong>
          {pending.depositAddress}
        </div>

        <div className="funding-status" aria-live="polite">
          <span className="funding-dot" />
          {fundingStatus}
        </div>

        <p className="fine" style={{ marginTop: 16 }}>
          Your claim link is ready — it will appear as soon as the payment confirms. Keep this page open.
        </p>

        <button
          className="pill"
          style={{ marginTop: 20, background: "rgba(44,58,34,0.12)", color: "inherit" }}
          onClick={() => {
            if (pollRef.current) clearInterval(pollRef.current);
            setStage("build");
            setPending(null);
          }}
        >
          Cancel
        </button>
      </section>
    );
  }

  // ── Gift ready screen ──────────────────────────────────────────────────────
  if (stage === "ready" && created) {
    const s = STOCKS.find((s) => s.key === created.stock)!;
    return (
      <section className="panel" id="send" aria-live="polite">
        <h2>Gift ready to send 🎁</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, margin: "0 0 4px" }}>
          Share this link with your friend. They sign in with Google and claim{" "}
          <strong>${created.usd} of {s.name}</strong> with no wallet or gas fees.
        </p>

        <div className="link-box">
          <strong>Gift link</strong>
          {created.link.split("#")[0]}
          <span style={{ opacity: 0.45 }}>#k=…</span>
        </div>

        <ShareButtons
          link={created.link}
          stock={s.name}
          usd={created.usd}
          senderName={undefined}
          recipientPhone={phone.replace(/\D/g, "") || undefined}
        />

        <p className="fine" style={{ marginTop: 20 }}>
          Keep this link safe — only the person who opens it can claim the gift. The claim key lives after the # and is never sent to StockWave.
        </p>

        <button
          className="pill"
          style={{ marginTop: 24, background: "rgba(44,58,34,0.12)", color: "inherit" }}
          onClick={() => { setStage("build"); setCreated(null); setResult(null); setPending(null); setPhone(""); }}
        >
          Send another gift
        </button>
      </section>
    );
  }

  // ── Builder ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="cards" id="stocks">
        {STOCKS.map((s) => (
          <button key={s.key} className="card" aria-pressed={stock === s.key} onClick={() => setStock(s.key)}>
            <div>
              <StockIcon a={{ logo: s.logo, color: s.color, ticker: s.key, name: s.name }} size={56} />
              <h3>{s.name}</h3>
              <small>{s.sub}</small>
            </div>
            <span className="tag">Tokenized share · {s.key}</span>
          </button>
        ))}
      </div>

      <section className="panel" id="send">
        <h2>Send {chosen.name} to a friend</h2>

        <label className="field">Amount</label>
        <div className="row">
          {AMOUNTS.map((a) => (
            <button key={a} className="chip" aria-pressed={usd === a} onClick={() => setUsd(a)}>${a}</button>
          ))}
        </div>

        <label className="field" htmlFor="note">A short note (optional)</label>
        <input id="note" className="input" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy birthday!" />

        <label className="field" htmlFor="phone">Recipient WhatsApp number (optional)</label>
        <input
          id="phone"
          className="input"
          type="tel"
          maxLength={20}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
        />

        <label className="check">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
          <span>I confirm I am not a resident of the United States or Canada.</span>
        </label>

        <div className="row" style={{ marginTop: 4, flexWrap: "wrap" }}>
          <button className="pill" onClick={preview} disabled={busy} style={{ background: "rgba(44,58,34,0.12)", color: "inherit" }}>
            {busy ? "Checking…" : "Preview price"}
          </button>
          {!authReady ? null : !loggedIn ? (
            <button className="pill" onClick={() => authLogin()} style={{ background: "rgba(44,58,34,0.12)", color: "inherit" }}>
              Sign in to send
            </button>
          ) : (
            <button className="pill" onClick={createLink} disabled={busy || !declared || !accountId}>
              {busy ? "Creating…" : "Create gift link"}
            </button>
          )}
        </div>

        {loggedIn && !accountId && (
          <p className="fine" style={{ color: "#c0392b" }}>
            Signed in, but your NEAR account could not be read{authError ? `: ${authError.slice(0, 140)}` : "."}
          </p>
        )}
        {loggedIn && accountId && (
          <p className="fine">
            Sending as{" "}
            <strong>{accountId.slice(0, 8)}…{accountId.slice(-6)}</strong>
          </p>
        )}

        {result && <div className={`preview ${result.ok ? "" : "err"}`}>{result.text}</div>}
        <p className="fine">Tokenized shares are not a brokerage account.</p>
      </section>
    </>
  );
}

// ── Base58 encoder (NEAR key format, no external dependency) ──────────────────
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function toBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let result = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += "1";
  return result + digits.reverse().map((d) => BASE58_ALPHABET[d]).join("");
}
