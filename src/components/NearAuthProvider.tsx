"use client";

import { createContext, useContext, useEffect, useState } from "react";
// NOTE: @fast-auth-near/react-sdk ships its <FastAuthProvider> as raw JSX in a .js file, which
// Turbopack cannot parse, and hardcodes a localhost relayer. We only need login + the user's
// public key (no signing), so we use its framework-free FastAuthClient directly.
import { FastAuthClient } from "@fast-auth-near/react-sdk/dist/core";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
// The SDK still expects the v4 `Connection` object; the app itself uses v7.
import { connect } from "near-api-js-v4";

// NEAR Auth (docs.auth.near.org): Google / Apple / email / passkey login that controls a real
// NEAR key held by an MPC network. Testnet uses the shared dev clientId from
// docs.auth.near.org/resources/testnet. Mainnet needs our own whitelisted clientId:
// set NEXT_PUBLIC_NEAR_AUTH_NETWORK=mainnet and NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID.
const network = (process.env.NEXT_PUBLIC_NEAR_AUTH_NETWORK ?? "testnet") as "testnet" | "mainnet";
const clientId = process.env.NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID ?? "np8paqIpMWmNbzT4xAvOOapZBjsOpptl";
const nodeUrl = network === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org";

export type NearIdentity = {
  /** SDK initialised and login state known. */
  ready: boolean;
  loggedIn: boolean;
  /** Implicit NEAR account id (64-char hex of the user's ed25519 public key), or null. */
  accountId: string | null;
  login: () => void;
  logout: () => void;
};

const EMPTY: NearIdentity = { ready: false, loggedIn: false, accountId: null, login: () => {}, logout: () => {} };
const Ctx = createContext<NearIdentity>(EMPTY);

/** Components read the signed-in user through this; it is safe to call anywhere in the app. */
export const useNearIdentity = () => useContext(Ctx);

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export default function NearAuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<NearIdentity>(EMPTY);

  useEffect(() => {
    let live = true;
    (async () => {
      const { connection } = await connect({ networkId: network, nodeUrl });
      const provider = new JavascriptProvider({ network, clientId });
      // The relayer URL is only used for signing/gasless flows, which we do not use.
      const client = new FastAuthClient(provider, connection, network, "");
      const login = () => client.login();
      const logout = () => client.logout();
      let loggedIn = false;
      let accountId: string | null = null;
      try {
        loggedIn = await client.isLoggedIn();
        if (loggedIn) {
          const signer = await client.getSigner();
          const pk = await signer.getPublicKey("ed25519");
          accountId = hex(pk.data as Uint8Array);
        }
      } catch (e) {
        console.error("NEAR Auth session check failed", e);
      }
      if (live) setIdentity({ ready: true, loggedIn, accountId, login, logout });
    })().catch((e) => console.error("NEAR Auth init failed", e));
    return () => { live = false; };
  }, []);

  return (
    <Ctx.Provider value={identity}>
      {children}
    </Ctx.Provider>
  );
}
