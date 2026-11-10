//! Moi vault.
//!
//! The vault account holds tokenized stocks as NEAR Intents balances (NEP-245 inside the
//! intents verifier contract). Each gift is tied to one ed25519 public key. That key is added
//! to this account as a function-call access key limited to `claim`, and its private half is
//! put in the gift link fragment. Whoever holds the link can call `claim(recipient)` with no
//! NEAR of their own: the vault account pays the gas, bounded by the key's allowance.
//!
//! Rules this contract keeps:
//!  - only the gift's own key can release it, and only once;
//!  - only the sender can reclaim, and only after expiry;
//!  - the owner can pause and edit the token allowlist, and CANNOT move or redirect a gift;
//!  - a failed payout puts the gift back, so a gift is never lost;
//!  - there is no upgrade or migrate method.
//!
//! [U] Payout assumes the intents contract exposes `mt_transfer(receiver_id, token_id, amount,
//! memo, msg)` with 1 yoctoNEAR attached. Verify on testnet/mainnet before relying on it.

use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, LookupSet};
use near_sdk::{
    env, ext_contract, near, require, AccountId, Allowance, Gas, NearToken, PanicOnDefault,
    Promise, PublicKey,
};

const PAYOUT_GAS: Gas = Gas::from_tgas(30);
const CALLBACK_GAS: Gas = Gas::from_tgas(15);
/// Gas budget a single link key may burn (~0.01 NEAR). Limits drain from a leaked key.
const KEY_ALLOWANCE: NearToken = NearToken::from_millinear(10);

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Gift {
    /// Who funded the gift; the only account allowed to reclaim it.
    pub sender: AccountId,
    /// Intents token id, e.g. `nep141:bnb-0x....omdep.near`.
    pub token_id: String,
    pub amount: U128,
    /// Block timestamp (ns) after which only the sender can reclaim.
    pub expires_at_ns: u64,
}

#[ext_contract(ext_intents)]
trait IntentsContract {
    fn mt_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: String,
        amount: U128,
        memo: Option<String>,
        msg: Option<String>,
    );
}

#[ext_contract(ext_self)]
trait VaultCallbacks {
    fn on_payout(&mut self, key: PublicKey, gift: Gift) -> bool;
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct MoiVault {
    owner: AccountId,
    /// Backend account allowed to register gifts after it has seen the swap succeed.
    registrar: AccountId,
    /// The NEAR Intents verifier contract that holds the balances.
    intents: AccountId,
    paused: bool,
    allowed_tokens: LookupSet<String>,
    gifts: LookupMap<PublicKey, Gift>,
}

#[near]
impl MoiVault {
    #[init]
    pub fn new(owner: AccountId, registrar: AccountId, intents: AccountId) -> Self {
        Self {
            owner,
            registrar,
            intents,
            paused: false,
            allowed_tokens: LookupSet::new(b"t"),
            gifts: LookupMap::new(b"g"),
        }
    }

    // ---------- registrar ----------

    /// Record a funded gift and add its link key as a `claim`-only function-call key.
    pub fn register_gift(
        &mut self,
        key: PublicKey,
        sender: AccountId,
        token_id: String,
        amount: U128,
        expires_at_ns: u64,
    ) -> Promise {
        self.assert_not_paused();
        require!(
            env::predecessor_account_id() == self.registrar,
            "only the registrar can register gifts"
        );
        require!(self.allowed_tokens.contains(&token_id), "token not allowed");
        require!(amount.0 > 0, "amount must be positive");
        require!(
            expires_at_ns > env::block_timestamp(),
            "expiry must be in the future"
        );
        require!(!self.gifts.contains_key(&key), "key already used");

        self.gifts.insert(
            key.clone(),
            Gift { sender, token_id, amount, expires_at_ns },
        );
        Promise::new(env::current_account_id()).add_access_key_allowance(
            key,
            Allowance::limited(KEY_ALLOWANCE).unwrap(),
            env::current_account_id(),
            "claim".to_string(),
        )
    }

    // ---------- claim (signed by the link key) ----------

    /// Release the gift tied to the signing key to `recipient`. The gift is removed BEFORE
    /// the payout, so a second call from the same key finds nothing.
    pub fn claim(&mut self, recipient: AccountId) -> Promise {
        self.assert_not_paused();
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "claim must be signed by a gift key"
        );
        let key = env::signer_account_pk();
        let gift = self
            .gifts
            .remove(&key)
            .unwrap_or_else(|| env::panic_str("no gift for this key"));
        require!(env::block_timestamp() < gift.expires_at_ns, "gift expired");
        self.payout(key, gift, recipient)
    }

    // ---------- sender reclaim ----------

    /// After expiry the sender takes the gift back and the link key is deleted.
    pub fn reclaim(&mut self, key: PublicKey) -> Promise {
        self.assert_not_paused();
        let gift = self
            .gifts
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no such gift"));
        require!(
            env::predecessor_account_id() == gift.sender,
            "only the sender can reclaim"
        );
        require!(env::block_timestamp() >= gift.expires_at_ns, "gift not expired yet");
        self.gifts.remove(&key);
        let sender = gift.sender.clone();
        self.payout(key, gift, sender)
    }

    // ---------- callback ----------

    #[private]
    pub fn on_payout(&mut self, key: PublicKey, gift: Gift) -> bool {
        if near_sdk::is_promise_success() {
            // Gift is gone for good; kill the link key so it cannot be reused or spam calls.
            Promise::new(env::current_account_id()).delete_key(key);
            true
        } else {
            // Transfer failed: restore the gift so nothing is lost and the key can retry.
            self.gifts.insert(key, gift);
            false
        }
    }

    // ---------- owner (cannot touch gifts) ----------

    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
    }

    pub fn set_registrar(&mut self, registrar: AccountId) {
        self.assert_owner();
        self.registrar = registrar;
    }

    pub fn allow_token(&mut self, token_id: String) {
        self.assert_owner();
        self.allowed_tokens.insert(token_id);
    }

    pub fn disallow_token(&mut self, token_id: String) {
        self.assert_owner();
        self.allowed_tokens.remove(&token_id);
    }

    // ---------- views ----------

    pub fn get_gift(&self, key: PublicKey) -> Option<Gift> {
        self.gifts.get(&key).cloned()
    }

    pub fn is_token_allowed(&self, token_id: String) -> bool {
        self.allowed_tokens.contains(&token_id)
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    pub fn get_config(&self) -> (AccountId, AccountId, AccountId) {
        (self.owner.clone(), self.registrar.clone(), self.intents.clone())
    }
}

impl MoiVault {
    fn payout(&self, key: PublicKey, gift: Gift, to: AccountId) -> Promise {
        ext_intents::ext(self.intents.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(PAYOUT_GAS)
            .mt_transfer(to, gift.token_id.clone(), gift.amount, None, None)
            .then(
                ext_self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .on_payout(key, gift),
            )
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
    }

    fn assert_not_paused(&self) {
        require!(!self.paused, "vault is paused");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    const TOKEN: &str = "nep141:bnb-0x091fc7778e6932d4009b087b191d1ee3bac5729a.omdep.near";

    fn acct(s: &str) -> AccountId { s.parse().unwrap() }
    fn key(n: u8) -> PublicKey {
        let mut b = vec![0u8]; // ed25519 prefix
        b.extend([n; 32]);
        PublicKey::try_from(b).unwrap()
    }

    fn ctx(predecessor: &str, signer_pk: Option<PublicKey>, ts: u64) {
        let mut b = VMContextBuilder::new();
        b.current_account_id(acct("vault.near"))
            .predecessor_account_id(acct(predecessor))
            .signer_account_id(acct(predecessor))
            .block_timestamp(ts);
        if let Some(pk) = signer_pk { b.signer_account_pk(pk); }
        testing_env!(b.build());
    }

    fn vault() -> MoiVault {
        ctx("owner.near", None, 0);
        let mut v = MoiVault::new(acct("owner.near"), acct("backend.near"), acct("intents.near"));
        v.allow_token(TOKEN.to_string());
        v
    }

    fn registered(v: &mut MoiVault, k: PublicKey) {
        ctx("backend.near", None, 100);
        v.register_gift(k, acct("alice.near"), TOKEN.to_string(), U128(1_000), 10_000);
    }

    #[test]
    fn register_then_get() {
        let mut v = vault();
        registered(&mut v, key(1));
        let g = v.get_gift(key(1)).unwrap();
        assert_eq!(g.sender, acct("alice.near"));
        assert_eq!(g.amount.0, 1_000);
    }

    #[test]
    #[should_panic(expected = "only the registrar")]
    fn only_registrar_registers() {
        let mut v = vault();
        ctx("mallory.near", None, 100);
        v.register_gift(key(1), acct("alice.near"), TOKEN.to_string(), U128(1), 10_000);
    }

    #[test]
    #[should_panic(expected = "token not allowed")]
    fn rejects_unknown_token() {
        let mut v = vault();
        ctx("backend.near", None, 100);
        v.register_gift(key(1), acct("alice.near"), "nep141:evil".to_string(), U128(1), 10_000);
    }

    #[test]
    #[should_panic(expected = "key already used")]
    fn rejects_duplicate_key() {
        let mut v = vault();
        registered(&mut v, key(1));
        registered(&mut v, key(1));
    }

    #[test]
    fn claim_removes_gift_before_payout() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("vault.near", Some(key(1)), 200);
        let _ = v.claim(acct("bob.near"));
        assert!(v.get_gift(key(1)).is_none());
    }

    #[test]
    #[should_panic(expected = "no gift for this key")]
    fn second_claim_fails() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("vault.near", Some(key(1)), 200);
        let _ = v.claim(acct("bob.near"));
        let _ = v.claim(acct("bob.near"));
    }

    #[test]
    #[should_panic(expected = "no gift for this key")]
    fn wrong_key_cannot_claim() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("vault.near", Some(key(2)), 200);
        let _ = v.claim(acct("mallory.near"));
    }

    #[test]
    #[should_panic(expected = "claim must be signed by a gift key")]
    fn claim_needs_key_signature() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("mallory.near", Some(key(1)), 200);
        let _ = v.claim(acct("mallory.near"));
    }

    #[test]
    #[should_panic(expected = "gift expired")]
    fn expired_gift_cannot_be_claimed() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("vault.near", Some(key(1)), 20_000);
        let _ = v.claim(acct("bob.near"));
    }

    #[test]
    #[should_panic(expected = "gift not expired yet")]
    fn reclaim_before_expiry_fails() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("alice.near", None, 200);
        let _ = v.reclaim(key(1));
    }

    #[test]
    #[should_panic(expected = "only the sender can reclaim")]
    fn reclaim_by_other_fails() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("mallory.near", None, 20_000);
        let _ = v.reclaim(key(1));
    }

    #[test]
    fn sender_reclaims_after_expiry() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("alice.near", None, 20_000);
        let _ = v.reclaim(key(1));
        assert!(v.get_gift(key(1)).is_none());
    }

    #[test]
    #[should_panic(expected = "vault is paused")]
    fn paused_blocks_claim() {
        let mut v = vault();
        registered(&mut v, key(1));
        ctx("owner.near", None, 200);
        v.set_paused(true);
        ctx("vault.near", Some(key(1)), 200);
        let _ = v.claim(acct("bob.near"));
    }

    #[test]
    #[should_panic(expected = "owner only")]
    fn only_owner_pauses() {
        let mut v = vault();
        ctx("mallory.near", None, 0);
        v.set_paused(true);
    }
}
