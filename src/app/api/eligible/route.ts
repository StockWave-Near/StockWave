import { checkEligibility } from "@/lib/eligibility";

// GET /api/eligible?declared=1  -> { eligible, country, reason? }
export function GET(request: Request) {
  const declared = new URL(request.url).searchParams.get("declared") === "1";
  return Response.json(checkEligibility(request.headers, declared));
}
