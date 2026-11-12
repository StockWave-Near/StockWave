"use client";

import { useEffect, useRef, useState } from "react";
import { useNearIdentity } from "./NearAuthProvider";

const NETWORK = process.env.NEXT_PUBLIC_NEAR_AUTH_NETWORK === "mainnet" ? "mainnet" : "testnet";
const EXPLORER = NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";

const short = (id: string) => `${id.slice(0, 6)}…${id.slice(-4)}`;

// A stable colour per account, so the avatar looks the same every visit.
function avatarColor(id: string) {
  const hue = parseInt(id.slice(0, 6), 16) % 360;
  return `hsl(${hue} 45% 45%)`;
}

const menuItem = {
  display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: 0,
  background: "transparent", borderRadius: 10, font: "500 13px var(--font-body)", color: "inherit",
  cursor: "pointer", textDecoration: "none",
} as const;

// Always-visible login state: a Sign in button, or an account chip with a small menu.
export default function AuthStatus() {
  const { ready, loggedIn, accountId, error, login, logout } = useNearIdentity();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!ready) return <span style={{ fontSize: 13, opacity: 0.55 }}>Loading sign-in…</span>;

  if (!loggedIn) {
    return (
      <button className="pill" onClick={() => login()} style={{ background: "rgba(44,58,34,0.12)", color: "inherit", padding: "9px 18px" }}>
        Sign in
      </button>
    );
  }

  async function copy() {
    if (!accountId) return;
    try { await navigator.clipboard.writeText(accountId); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  }

  return (
    <span ref={box} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(44,58,34,0.15)",
          background: "rgba(255,255,255,0.55)", borderRadius: 999, padding: "5px 12px 5px 6px",
          cursor: "pointer", font: "500 13px var(--font-body)", color: "inherit",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center",
            background: accountId ? avatarColor(accountId) : "#c0392b", color: "#fff", fontSize: 11, fontWeight: 700,
          }}
        >
          {accountId ? accountId.slice(0, 2).toUpperCase() : "!"}
        </span>
        <span>{accountId ? short(accountId) : "Account unavailable"}</span>
        <span aria-hidden style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 270, zIndex: 20,
            background: "#fbfcf6", border: "1px solid rgba(44,58,34,0.15)", borderRadius: 16,
            boxShadow: "0 12px 32px rgba(40,49,31,0.18)", padding: 10, textAlign: "left",
          }}
        >
          <div style={{ padding: "6px 12px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3aa655" }} />
              Signed in with NEAR Auth · {NETWORK}
            </div>
            {accountId ? (
              <code style={{ display: "block", marginTop: 8, fontSize: 11.5, wordBreak: "break-all", lineHeight: 1.45 }}>
                {accountId}
              </code>
            ) : (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#c0392b" }}>
                {error ? error.slice(0, 140) : "Your NEAR account could not be read."}
              </p>
            )}
          </div>
          {accountId && (
            <>
              <button style={menuItem} onClick={copy}>{copied ? "Copied ✓" : "Copy account id"}</button>
              <a style={menuItem} href={`${EXPLORER}/address/${accountId}`} target="_blank" rel="noreferrer">
                View on explorer
              </a>
            </>
          )}
          <button style={{ ...menuItem, color: "#c0392b" }} onClick={() => { setOpen(false); logout(); }}>
            Sign out
          </button>
        </div>
      )}
    </span>
  );
}
