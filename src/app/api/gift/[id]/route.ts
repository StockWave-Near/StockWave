import { oneClick } from "@/lib/oneclick";
import { getGift, saveGift } from "@/lib/store";
import { STOCKS } from "@/lib/stocks";

// Public gift info for the claim page. Never returns depositAddress or keys.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "not_found" }, { status: 404 });
  if (gift.status === "AWAITING_DEPOSIT") {
    try {
      const s = await oneClick.status(gift.depositAddress);
      if (s.status === "SUCCESS") { gift.status = "FUNDED"; await saveGift(gift); }
      else if (s.status === "REFUNDED") { gift.status = "REFUNDED"; await saveGift(gift); }
      else if (s.status === "FAILED") { gift.status = "FAILED"; await saveGift(gift); }
    } catch { /* keep current status */ }
  }
  return Response.json({
    id: gift.id, stock: gift.stock, name: STOCKS[gift.stock].name, usd: gift.usd,
    note: gift.note, status: gift.status, createdAt: gift.createdAt,
  });
}
