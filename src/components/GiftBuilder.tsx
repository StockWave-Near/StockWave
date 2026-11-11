"use client";

import StockIcon from "./StockIcon";
import ShareButtons from "./ShareButtons";
import { useState } from "react";

const STOCKS = [
  { key: "GOOGL", name: "Google", sub: "Alphabet Class A", logo: "https://cdn.simpleicons.org/google/4285F4", color: "#4285F4" },
  { key: "AAPL", name: "Apple", sub: "Apple Inc.", logo: "https://cdn.simpleicons.org/apple/1d1d1f", color: "#1d1d1f" },
  { key: "TSLA", name: "Tesla", sub: "Tesla Inc.", logo: "https://cdn.simpleicons.org/tesla/CC0000", color: "#CC0000" },
] as const;
type Key = (typeof STOCKS)[number]["key"];
const AMOUNTS = [5, 10, 20, 50];

type Quote = { quote?: { amountOutFormatted?: string; amountOutUsd?: string; amountInUsd?: string } };

type GiftCreated = {
  /** The full gift URL including #k= fragment — lives only in the browser. */
  link: string;
  stock: Key;
  usd: number;
};

export default function GiftBuilder() {
  const [stock, setStock] = useState<Key>("GOOGL");
  const [usd, setUsd] = useState(20);
  const [note, setNote] = useState("");
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState<GiftCreated | null>(null);

  const chosen = STOCKS.find((s) => s.key === stock)!;

  async function preview() {
    setBusy(true);
    setResult(null);
    try {
      const elig = await (await fetch(`/api/eligible?declared=${declared ? 1 : 0}`)).json();
      if (!elig.eligible) {
        setResult({
          ok: false,
          text:
            elig.reason === "region_blocked"
              ? "Sorry, tokenized stocks are not available in your region yet."
              : "Please confirm the checkbox below first.",
        });
        return;
      }
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stock, usd }),
      });
      if (!res.ok) throw new Error("quote");
      const data = (await res.json()) as Quote;
      const out = data.quote?.amountOutFormatted;
      setResult({
        ok: true,
        text: `You pay about $${usd}. Your friend gets ${out ? `${Number(out).toFixed(4)} shares of` : "a share of"} ${chosen.name}. Nothing is signed yet.`,
      });
    } catch {
      setResult({ ok: false, text: "We could not get a price right now. Please try again in a moment." });
    } finally {
      setBusy(false);
    }
  }

  // ── Create link ────────────────────────────────────────────────────────────
  // Generates an ed25519 keypair in the browser, calls /api/gift with the public key only,
  // and shows the resulting link. The private key never leaves the browser.
  async function createLink() {
    setBusy(true);
    setResult(null);
    try {
      // Generate a one-time ed25519 keypair for this gift.
      const rawKey = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      const rawPriv = await crypto.subtle.exportKey("pkcs8", rawKey.privateKey);
      const rawPub = await crypto.subtle.exportKey("raw", rawKey.publicKey);

      // Encode as base58 (NEAR uses ed25519:<base58> format).
      const privB58 = `ed25519:${toBase58(new Uint8Array(rawPriv).slice(-32))}`;
      const pubB58 = `ed25519:${toBase58(new Uint8Array(rawPub))}`;

      const idemKey = crypto.randomUUID();
      const res = await fetch("/api/gift", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idemKey,
        },
        body: JSON.stringify({
          stock,
          usd,
          note,
          declaredEligible: declared,
          // Use a placeholder sender account for now; Ayush's social-login flow will set this.
          senderAccount: "sender.near",
          claimPublicKey: pubB58,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 451) throw new Error("region_blocked");
        if (res.status === 503) throw new Error("vault_not_configured");
        throw new Error(err.error ?? "gift_create_failed");
      }
      const { id } = (await res.json()) as { id: string };
      const link = `${window.location.origin}/g/${encodeURIComponent(id)}#k=${privB58}`;
      setCreated({ link, stock, usd });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      const text =
        msg === "region_blocked" ? "Tokenized stocks are not available in your region." :
        msg === "vault_not_configured" ? "The vault is not configured yet. Check back soon." :
        "Could not create the gift. Please try again.";
      setResult({ ok: false, text });
    } finally {
      setBusy(false);
    }
  }

  // If the gift has been created, show the share screen instead of the builder.
  if (created) {
    return (
      <section className="panel" id="send" aria-live="polite">
        <h2>Gift ready to send 🎁</h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, margin: "0 0 4px" }}>
          Share this link with your friend. They sign in with Google and claim the{" "}
          <strong>
            ${created.usd} of {STOCKS.find((s) => s.key === created.stock)!.name}
          </strong>{" "}
          with no wallet or gas fees.
        </p>

        <div className="link-box">
          <strong>Gift link</strong>
          {/* Show the link without the fragment so it's readable; the full link is used for sharing */}
          {created.link.split("#")[0]}
          <span style={{ opacity: 0.45 }}>#k=…</span>
        </div>

        <ShareButtons
          link={created.link}
          stock={STOCKS.find((s) => s.key === created.stock)!.name}
          usd={created.usd}
        />

        <p className="fine" style={{ marginTop: 20 }}>
          Keep this link safe — only the person who opens it can claim the gift. The claim key
          lives after the # and is never sent to StockWave.
        </p>

        <button
          className="pill"
          style={{ marginTop: 24, background: "rgba(44,58,34,0.12)", color: "inherit" }}
          onClick={() => {
            setCreated(null);
            setResult(null);
          }}
        >
          Send another gift
        </button>
      </section>
    );
  }

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
            <button key={a} className="chip" aria-pressed={usd === a} onClick={() => setUsd(a)}>
              ${a}
            </button>
          ))}
        </div>

        <label className="field" htmlFor="note">A short note (optional)</label>
        <input id="note" className="input" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy birthday!" />

        <label className="check">
          <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
          <span>I confirm I am not a resident of the United States or Canada.</span>
        </label>

        <div className="row" style={{ marginTop: 4 }}>
          <button className="pill" onClick={preview} disabled={busy} style={{ background: "rgba(44,58,34,0.12)", color: "inherit" }}>
            {busy ? "Checking…" : "Preview price"} <span className="arrow">↗</span>
          </button>
          <button className="pill" onClick={createLink} disabled={busy || !declared}>
            {busy ? "Creating…" : "Create gift link"} <span className="arrow">↗</span>
          </button>
        </div>

        {result && <div className={`preview ${result.ok ? "" : "err"}`}>{result.text}</div>}
        <p className="fine">
          Tokenized shares are not a brokerage account.
        </p>
      </section>
    </>
  );
}

// ── Base58 encoder (NEAR key format) ──────────────────────────────────────────
// No external dependency. Standard alphabet identical to Bitcoin/NEAR.
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
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  // Add leading '1's for leading zero bytes.
  let result = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += "1";
  return result + digits.reverse().map((d) => BASE58_ALPHABET[d]).join("");
}
