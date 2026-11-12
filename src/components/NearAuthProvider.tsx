"use client";

import { createContext, useContext, useEffect, useState } from "react";
// NOTE: @fast-auth-near/react-sdk ships its <FastAuthProvider> as raw JSX in a .js file, which
// Turbopack cannot parse, and hardcodes a localhost relayer. We only need login + the user's
// public key (no signing), so we use its framework-free FastAuthClient directly.
import { FastAuthClient } from "@fast-auth-near/react-sdk/dist/core";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
// The SDK still expects the v4 `Connection` object; the app itself uses v7.
import { connect } from "near-api-js-v4";
import { keyToImplicitAddress } from "near-api-js";

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
  /** Why the account could not be read, when signed in but key derivation failed. */
  error: string | null;
  login: () => void | Promise<void>;
  logout: () => void | Promise<void>;
};

const EMPTY: NearIdentity = { ready: false, loggedIn: false, accountId: null, error: null, login: () => {}, logout: () => {} };
const Ctx = createContext<NearIdentity>(EMPTY);

/** Components read the signed-in user through this; it is safe to call anywhere in the app. */
export const useNearIdentity = () => useContext(Ctx);


export default function NearAuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<NearIdentity>(EMPTY);

  useEffect(() => {
    let live = true;
    (async () => {
      const { connection } = await connect({ networkId: network, nodeUrl });
      const provider = new JavascriptProvider({ network, clientId });
      // The relayer URL is only used for signing/gasless flows, which we do not use.
      const client = new FastAuthClient(provider, connection, network, "");
      // Re-read the session. Called on load and again after every login/logout, because the
      // login popup finishes after our first check and would otherwise never be noticed.
      const refresh = async (): Promise<Pick<NearIdentity, "loggedIn" | "accountId" | "error">> => {
        let loggedIn = false;
        try {
          loggedIn = await client.isLoggedIn();
          if (!loggedIn) return { loggedIn: false, accountId: null, error: null };
          const signer = await client.getSigner();
          // The SDK returns the MPC contract's raw answer: a string like "ed25519:<base58>".
          const pk = String(await signer.getPublicKey("ed25519"));
          return { loggedIn: true, accountId: keyToImplicitAddress(pk), error: null };
        } catch (e) {
          console.error("NEAR Auth session check failed", e);
          // Keep loggedIn true if the login itself worked, so the UI can show what failed.
          return { loggedIn, accountId: null, error: e instanceof Error ? e.message : String(e) };
        }
      };
      const apply = async () => {
        const state = await refresh();
        if (live) setIdentity((prev) => ({ ...prev, ...state, ready: true }));
      };
      const login = async () => {
        try { await client.login(); } catch (e) { console.error("NEAR Auth login failed", e); }
        await apply();
      };
      const logout = async () => {
        try { await client.logout(); } catch (e) { console.error("NEAR Auth logout failed", e); }
        await apply();
      };
      if (live) setIdentity({ ready: true, loggedIn: false, accountId: null, error: null, login, logout });
      await apply();
    })().catch((e) => console.error("NEAR Auth init failed", e));
    return () => { live = false; };
  }, []);

  return (
    <Ctx.Provider value={identity}>
      {children}
    </Ctx.Provider>
  );
}
