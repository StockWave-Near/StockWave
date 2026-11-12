import type { NextRequest } from "next/server";
import { oneClick } from "@/lib/oneclick";
import { findByDeposit } from "@/lib/store";
import { syncGiftFunding } from "@/lib/vault";

export async function GET(request: NextRequest) {
  const addr = request.nextUrl.searchParams.get("depositAddress");
  if (!addr || addr.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    // Single 1Click call — pass the result to syncGiftFunding to avoid double-fetching.
    const res = await oneClick.status(addr) as { status: string; swapDetails?: { amountOut?: string } };
    if (res.status === "SUCCESS") {
      const gift = await findByDeposit(addr);
      if (gift && gift.status === "AWAITING_DEPOSIT") {
        await syncGiftFunding(gift, res as Parameters<typeof syncGiftFunding>[1]).catch(() => {});
        // Re-fetch to get the updated status after syncGiftFunding ran.
        const updated = await findByDeposit(addr);
        if (updated && updated.status !== "FUNDED") {
          return Response.json({ ...res, status: "PROCESSING" });
        }
      }
    }
    return Response.json(res);
  } catch {
    return Response.json({ error: "status_unavailable" }, { status: 502 });
  }
}
