"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// Privy handles identity only (Google login). The on-chain claim is authorised by the
// claim key in the link fragment, so no embedded wallet is created.
export default function Providers({ children }: { children: React.ReactNode }) {
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        appearance: { theme: "light", accentColor: "#4285F4" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
