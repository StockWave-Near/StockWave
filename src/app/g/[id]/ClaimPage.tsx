"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import WaveLogo from "@/components/WaveLogo";
import StockIcon from "@/components/StockIcon";

// Stock logos map (matches GiftBuilder)
const STOCK_ICONS: Record<string, { logo: string; color: string }> = {
  GOOGL: { logo: "https://cdn.simpleicons.org/google/4285F4", color: "#4285F4" },
  AAPL:  { logo: "https://cdn.simpleicons.org/apple/1d1d1f", color: "#1d1d1f" },
  TSLA:  { logo: "https://cdn.simpleicons.org/tesla/CC0000", color: "#CC0000" },
};

type GiftInfo = {
  id: string;
  stock: string;
  name: string;
  usd: number;
  note: string;
  status: "AWAITING_DEPOSIT" | "FUNDED" | "CLAIMED" | "REFUNDED" | "FAILED";
};

export default function ClaimPage({ id }: { id: string }) {
  const [gift, setGift] = useState<GiftInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimKey, setClaimKey] = useState<string | null>(null);

  // Read the #k= fragment on the client only (fragments are never sent to the server).
  useEffect(() => {
    const hash = window.location.hash;
    const m = /^#k=([A-Za-z0-9:_\-+/=.]+)$/.exec(hash);
    if (m) setClaimKey(m[1]);
  }, []);

  // Load gift details.
  useEffect(() => {
    fetch(`/api/gift/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: GiftInfo) => setGift(data))
      .catch((s) => setError(s === 404 ? "not_found" : "load_failed"));
  }, [id]);

  const icon = gift ? STOCK_ICONS[gift.stock] : null;

  // ── Error states ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <ClaimShell>
        <p style={{ opacity: 0.75, fontSize: 15 }}>
          {error === "not_found"
            ? "This gift link is not recognised. It may have already been claimed."
            : "Could not load this gift right now. Please try again."}
        </p>
      </ClaimShell>
    );
  }

  if (!gift) {
    return (
      <ClaimShell>
        <p style={{ opacity: 0.6, fontSize: 14 }}>Loading gift…</p>
      </ClaimShell>
    );
  }

  // ── Already claimed / refunded ─────────────────────────────────────────────
  if (gift.status === "CLAIMED") {
    return (
      <ClaimShell>
        <p style={{ opacity: 0.75 }}>This gift has already been claimed.</p>
      </ClaimShell>
    );
  }
  if (gift.status === "REFUNDED" || gift.status === "FAILED") {
    return (
      <ClaimShell>
        <p style={{ opacity: 0.75 }}>This gift has expired or was refunded to the sender.</p>
      </ClaimShell>
    );
  }

  // ── Awaiting funding ───────────────────────────────────────────────────────
  if (gift.status === "AWAITING_DEPOSIT") {
    return (
      <ClaimShell>
        {icon && (
          <StockIcon a={{ logo: icon.logo, color: icon.color, ticker: gift.stock, name: gift.name }} size={64} />
        )}
        <small style={{ opacity: 0.6, marginTop: 12 }}>You&apos;ve been given</small>
        <strong style={{ fontSize: 28, fontFamily: "var(--font-num)" }}>
          ${gift.usd} of {gift.name}
        </strong>
        {gift.note && (
          <em style={{ fontFamily: "var(--font-serif)", opacity: 0.7 }}>&ldquo;{gift.note}&rdquo;</em>
        )}
        <div className="preview" style={{ textAlign: "center", maxWidth: 320 }}>
          The sender is still funding this gift. Come back in a moment.
        </div>
      </ClaimShell>
    );
  }

  // ── Ready to claim ─────────────────────────────────────────────────────────
  return (
    <ClaimShell>
      {icon && (
        <StockIcon a={{ logo: icon.logo, color: icon.color, ticker: gift.stock, name: gift.name }} size={72} />
      )}
      <small style={{ opacity: 0.6, marginTop: 14 }}>You&apos;ve been given</small>
      <strong style={{ fontSize: 32, fontFamily: "var(--font-num)", margin: "2px 0" }}>
        ${gift.usd} of {gift.name}
      </strong>
      {gift.note && (
        <em style={{ fontFamily: "var(--font-serif)", fontSize: 15, opacity: 0.72 }}>
          &ldquo;{gift.note}&rdquo;
        </em>
      )}

      {!claimKey ? (
        <div className="preview err" style={{ textAlign: "center", maxWidth: 340 }}>
          The claim key was not found in the link. Make sure you opened the full link
          including the part after the #.
        </div>
      ) : (
        <>
          <p style={{ fontSize: 14, opacity: 0.75, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            Sign in with Google to claim this share. No wallet, no fees, no crypto.
          </p>
          <ClaimAction claimKey={claimKey} />
        </>
      )}
    </ClaimShell>
  );
}

function ClaimAction({ claimKey }: { claimKey: string }) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <p className="fine" style={{ textAlign: "center" }}>
        Sign-in is not configured yet (missing NEXT_PUBLIC_PRIVY_APP_ID).
      </p>
    );
  }
  return <PrivyClaimButton claimKey={claimKey} />;
}

function PrivyClaimButton({ claimKey }: { claimKey: string }) {
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const [status, setStatus] = useState<string | null>(null);

  async function claim() {
    setStatus(null);
    const token = await getAccessToken();
    // TODO: POST /api/claim with { claimKey, token } once the claim endpoint exists.
    void claimKey;
    void token;
    setStatus("Signed in. Claim endpoint is not wired yet.");
  }

  return (
    <>
      <button className="pill" disabled={!ready} onClick={authenticated ? claim : () => login()}>
        {authenticated ? "Claim my share" : "Sign in to claim"}
      </button>
      {authenticated && (
        <p className="fine" style={{ textAlign: "center" }}>
          Signed in as {user?.google?.email ?? (user?.twitter?.username ? `@${user.twitter.username}` : "your account")}
        </p>
      )}
      {status && <p className="fine" style={{ textAlign: "center" }}>{status}</p>}
    </>
  );
}

function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="wrap" style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <nav className="nav">
        <a href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <WaveLogo /> StockWave
        </a>
      </nav>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div className="panel" style={{ maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {children}
        </div>
      </div>
    </main>
  );
}
