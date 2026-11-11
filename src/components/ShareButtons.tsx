"use client";

import { useState } from "react";

type Props = {
  /** The full gift URL including #k= fragment, never sent to the server. */
  link: string;
  senderName?: string;
  stock?: string;
  usd?: number;
  recipientPhone?: string;
};

export default function ShareButtons({ link, senderName, stock, usd, recipientPhone }: Props) {
  const [copied, setCopied] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  async function openWhatsApp() {
    setWaError(null);
    try {
      const res = await fetch("/api/whatsapp/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link, senderName, stock, usd, phone: recipientPhone }),
      });
      if (!res.ok) throw new Error("share_failed");
      const { url } = (await res.json()) as { url: string };
      // Open in the same tab on mobile (better UX than a popup that gets blocked).
      window.location.href = url;
    } catch {
      setWaError("Could not build the share link. Try copying instead.");
    }
  }

  // ── Copy link ─────────────────────────────────────────────────────────────
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API blocked (e.g. HTTP, old browser) — fall back to a prompt.
      window.prompt("Copy this link:", link);
    }
  }

  // ── Native share sheet ────────────────────────────────────────────────────
  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "StockWave gift",
        text: stock && usd ? `$${usd} of ${stock}` : "A stock gift for you",
        url: link,
      });
    } catch {
      /* user cancelled or denied — silently ignore */
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <div className="share-row" role="group" aria-label="Share options">
      {/* WhatsApp */}
      <button className="share-btn wa" onClick={openWhatsApp} aria-label="Share on WhatsApp">
        {/* WhatsApp icon (inline SVG, no external dependency) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.546 5.877L0 24l6.336-1.516A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.126-1.447l-.365-.221-3.763.9.95-3.65-.243-.383A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
        </svg>
        WhatsApp
      </button>

      {/* Copy link */}
      <button className="share-btn copy" onClick={copyLink} aria-label="Copy gift link">
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy link
          </>
        )}
      </button>

      {/* Native share (phones only) */}
      {canNativeShare && (
        <button className="share-btn native" onClick={nativeShare} aria-label="Share via phone">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      )}

      {waError && <p className="share-err">{waError}</p>}
    </div>
  );
}
