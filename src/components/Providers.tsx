"use client";

import NearAuthProvider from "./NearAuthProvider";

// Login is NEAR Auth (Google / Apple / email / passkey -> a real NEAR key). The on-chain claim
// is authorised by the claim key in the link fragment; login only supplies the recipient account.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <NearAuthProvider>{children}</NearAuthProvider>;
}

// ── Previous login provider (Privy), kept for reference ─────────────────────────────────────
// import { PrivyProvider } from "@privy-io/react-auth";
// const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
// export default function Providers({ children }: { children: React.ReactNode }) {
//   if (!appId) return <>{children}</>;
//   return (
//     <PrivyProvider
//       appId={appId}
//       config={{
//         loginMethods: ["google", "twitter"],
//         embeddedWallets: {
//           ethereum: { createOnLogin: "off" },
//           solana: { createOnLogin: "off" },
//         },
//         appearance: { theme: "light", accentColor: "#4285F4" },
//       }}
//     >
//       {children}
//     </PrivyProvider>
//   );
// }
