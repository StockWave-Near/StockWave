"use client";

import StockIcon from "./StockIcon";
import { useState } from "react";

const STOCKS = [
  { key: "GOOGL", name: "Google", sub: "Alphabet Class A", logo: "https://cdn.simpleicons.org/google/4285F4", color: "#4285F4" },
  { key: "AAPL", name: "Apple", sub: "Apple Inc.", logo: "https://cdn.simpleicons.org/apple/1d1d1f", color: "#1d1d1f" },
  { key: "TSLA", name: "Tesla", sub: "Tesla Inc.", logo: "https://cdn.simpleicons.org/tesla/CC0000", color: "#CC0000" },
] as const;
type Key = (typeof STOCKS)[number]["key"];
const AMOUNTS = [5, 10, 20, 50];

type Quote = { quote?: { amountOutFormatted?: string; amountOutUsd?: string; amountInUsd?: string } };

export default function GiftBuilder() {
  const [stock, setStock] = useState<Key>("GOOGL");
  const [usd, setUsd] = useState(20);
  const [note, setNote] = useState("");
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

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

        <button className="pill" onClick={preview} disabled={busy}>
          {busy ? "Checking..." : "See what they will get"} <span className="arrow">↗</span>
        </button>

        {result && <div className={`preview ${result.ok ? "" : "err"}`}>{result.text}</div>}
        <p className="fine">
          Tokenized shares are not a brokerage account.
        </p>
      </section>
    </>
  );
}
