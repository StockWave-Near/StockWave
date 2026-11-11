import { giftsForPhone, type Gift } from "./store";
import { STOCKS } from "./stocks";

// WhatsApp bot brain. Pure async function: (sender phone, text) -> reply text. Easy to test.
// Plain words only: "share", not "token". The bot never sees or sends a claim key (it lives
// only in the link the sender shared), so it can show gifts but the claim happens from the link.

const HELP = [
  "Commands:",
  "*gifts*: see gifts sent to you and who sent them",
  "*stocks*: which stocks you can get",
  "*help*: this message",
].join("\n");

const WELCOME = [
  "Hi! This is a simple way to own real stocks like Google, Apple and Tesla.",
  "",
  "1. A friend sends you a gift link.",
  "2. You open it and sign in with Google. No wallet app, no fees to pay.",
  "3. The share is yours.",
  "",
  "Type *gifts* to see what was sent to you.",
].join("\n");

const STATUS_TEXT: Record<Gift["status"], string> = {
  AWAITING_DEPOSIT: "being paid for, not ready yet",
  FUNDED: "ready to claim",
  CLAIMED: "already claimed",
  REFUNDED: "refunded to the sender",
  FAILED: "failed",
};

function describe(g: Gift, i: number): string {
  const who = shortAccount(g.senderAccount);
  const note = g.note ? `\n   "${g.note}"` : "";
  return `${i + 1}. $${g.usd} of ${STOCKS[g.stock].name} from ${who}: ${STATUS_TEXT[g.status]}${note}`;
}

// alice-long-wallet-name.near -> alice-lo…near (keeps it readable on a phone)
export function shortAccount(a: string): string {
  return a.length > 20 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

export async function handleBotMessage(phone: string, text: string): Promise<string> {
  const cmd = text.trim().toLowerCase();
  if (!cmd || ["hi", "hello", "hey", "start", "menu"].includes(cmd)) return `${WELCOME}\n\n${HELP}`;

  if (["gifts", "gift", "inbox", "my gifts"].includes(cmd)) {
    const mine = await giftsForPhone(phone);
    if (mine.length === 0) {
      return "No gifts for this number yet. Ask your friend to send one to this WhatsApp number.";
    }
    const ready = mine.filter((g) => g.status === "FUNDED").length;
    const tail = ready
      ? "\nTo claim, open the gift link your friend sent you and sign in with Google."
      : "";
    return `Your gifts:\n${mine.slice(0, 10).map(describe).join("\n")}${tail}`;
  }

  if (["stocks", "stock", "list"].includes(cmd)) {
    return `You can get:\n${Object.values(STOCKS).map((s) => `• ${s.name}`).join("\n")}\n\nThese are tokenized shares, not a brokerage account.`;
  }

  return `I did not get that.\n\n${HELP}`;
}
