"use client";

import { useState } from "react";
import StockIcon from "./StockIcon";
import { ONDO_CATALOG, ONDO_SNAPSHOT_DATE, SENDABLE, type OndoAsset } from "@/lib/ondo-catalog";

const TABS = ["All", "Stocks", "ETFs", "Bonds & cash", "Portfolios"] as const;
const BLURB: Record<OndoAsset["category"], string> = {
  Stocks: "Shares in well-known companies",
  ETFs: "Baskets that track an index or a commodity",
  "Bonds & cash": "Lower-risk treasury and bond exposure",
  Portfolios: "Ready-made Ondo strategies",
};

function Row({ a }: { a: OndoAsset }) {
  const live = SENDABLE.includes(a.ticker);
  return (
    <div className="crow">
      <StockIcon a={a} size={46} />
      <div className="cmeta">
        <b title={a.name}>{a.name}</b>
        <small><span className="tick">{a.ticker}</span>{a.category}</small>
      </div>
      <div className="cprice"><span>${a.price.toFixed(2)}</span><small>per share</small></div>
      {live ? (
        <a className="badge live" href="#send">Send now</a>
      ) : (
        <span className="badge">Coming soon</span>
      )}
    </div>
  );
}

export default function Catalog() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const rows = ONDO_CATALOG.filter(
    (a) => (tab === "All" || a.category === tab) && `${a.ticker} ${a.name}`.toLowerCase().includes(query),
  );
  const cats = (["Stocks", "ETFs", "Bonds & cash", "Portfolios"] as const).filter((c) => rows.some((r) => r.category === c));

  return (
    <section id="catalog" className="catalog">
      <div className="chead">
        <span className="eyebrow">Supported on NEAR</span>
        <h2 className="h2">Every stock you can gift</h2>
        <p className="lede">
          All {ONDO_CATALOG.length} Ondo tokenized assets available through NEAR Intents. Google, Apple and Tesla are ready to send now; the rest are coming next.
        </p>
      </div>

      <div className="cshell">
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Asset type">
            {TABS.map((t) => (
              <button key={t} className="chip" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                {t}
                <span className="count">{t === "All" ? ONDO_CATALOG.length : ONDO_CATALOG.filter((a) => a.category === t).length}</span>
              </button>
            ))}
          </div>
          <input className="input search" placeholder="Search a stock or ticker" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stocks" />
        </div>

        {cats.map((c) => (
          <div className="cgroup" key={c}>
            <div className="cgtitle">
              <h3>{c}</h3>
              <span>{BLURB[c]}</span>
            </div>
            <div className="clist">
              {rows.filter((r) => r.category === c).map((a) => <Row key={a.ticker} a={a} />)}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="fine center">No match. Try another name.</p>}

        <p className="fine center">
          Indicative prices as of {ONDO_SNAPSHOT_DATE}. Tokenized assets are not a brokerage account and may not be available in every region.
        </p>
      </div>
    </section>
  );
}
