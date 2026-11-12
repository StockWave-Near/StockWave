"use client";

import { useEffect, useState } from "react";
import { useNearIdentity } from "@/components/NearAuthProvider";
// import { usePrivy } from "@privy-io/react-auth";
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
            Sign in to claim this share. No wallet, no fees, no crypto.
          </p>
          <ClaimAction claimKey={claimKey} giftId={id} gift={gift} />
        </>
      )}
    </ClaimShell>
  );
}

function ClaimAction({ claimKey, giftId, gift }: { claimKey: string; giftId: string; gift: GiftInfo }) {
  return <NearClaimButton claimKey={claimKey} giftId={giftId} gift={gift} />;
}

function NearClaimButton({ claimKey, giftId, gift }: { claimKey: string; giftId: string; gift: GiftInfo }) {
  const { ready, loggedIn, accountId, login } = useNearIdentity();
  const [status, setStatus] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The recipient is the user's real NEAR account (implicit id from their NEAR Auth key).
  const recipientAccountId = () => accountId ?? "";

  async function claim() {
    setStatus("claiming");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ giftId, claimKey, recipientAccountId: recipientAccountId() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "claim_failed");
      }
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      setErrorMsg(
        msg === "already_claimed" ? "This gift has already been claimed." :
        msg === "not_ready" ? "The gift is not ready to claim yet. Come back in a moment." :
        "Something went wrong. Please try again."
      );
      setStatus("error");
    }
  }

  if (status === "done") {
    // Build a prefilled URL for "Return the favour" — sender becomes the new recipient.
    const returnUrl = `/?returnFavour=1&stock=${gift?.stock ?? ""}&usd=${gift?.usd ?? 20}`;
    return (
      <>
        <div className="preview" style={{ textAlign: "center", maxWidth: 340 }}>
          🎉 Claimed! The share is on its way to your account.
        </div>
        <p className="fine" style={{ textAlign: "center" }}>
          Account: {recipientAccountId()}
        </p>
        <a
          href={returnUrl}
          className="pill"
          style={{ marginTop: 8, background: "rgba(44,58,34,0.12)", color: "inherit", textDecoration: "none" }}
        >
          Return the favour 🔁
        </a>
        <a
          href="/notebook"
          style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}
        >
          View the gift notebook →
        </a>
      </>
    );
  }

  return (
    <>
      <button
        className="pill"
        disabled={!ready || status === "claiming" || (loggedIn && !accountId)}
        onClick={loggedIn ? claim : () => login()}
      >
        {status === "claiming" ? "Claiming…" : loggedIn ? "Claim my share" : "Sign in to claim"}
      </button>
      {loggedIn && accountId && status === "idle" && (
        <p className="fine" style={{ textAlign: "center" }}>
          Signed in as {accountId.slice(0, 8)}…{accountId.slice(-6)}
        </p>
      )}
      {status === "error" && (
        <p className="fine" style={{ textAlign: "center", color: "#c0392b" }}>{errorMsg}</p>
      )}
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


// ── Previous login (Privy), kept for reference ──────────────────────────────────────────────
// function PrivyClaimButton({ claimKey, giftId, gift }: { claimKey: string; giftId: string; gift: GiftInfo }) {
//   const { ready, authenticated, user, login } = usePrivy();
//   // Derive a NEAR-compatible account id from the Privy user.
//   function recipientAccountId(): string {
//     if (!user) return "";
//     if (user.google?.email) {
//       const local = user.google.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 50);
//       return `${local}.near`;
//     }
//     if (user.twitter?.username) {
//       return `${user.twitter.username.toLowerCase().replace(/[^a-z0-9._-]/g, "-")}.near`;
//     }
//     return `${user.id.replace(/[^a-z0-9]/g, "").slice(0, 20)}.near`;
//   }
//   // ...claim() and the JSX were identical to NearClaimButton, with `authenticated` for `loggedIn`.
// }
// if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) { /* "Sign-in is not configured yet" message */ }
