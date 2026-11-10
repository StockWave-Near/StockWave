// Region gate. Ondo tokenized stocks are reported to be unavailable to US and Canadian users.
// Re-check Ondo's terms before launch; the list lives in one place so it is easy to change.
export const BLOCKED_COUNTRIES = ["US", "CA"] as const;

export function countryFrom(headers: Headers): string | null {
  const c = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  return c && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null;
}

export type Eligibility = { eligible: boolean; country: string | null; reason?: string };

// Unknown country is allowed (VPNs are out of scope) but the declaration is always required.
export function checkEligibility(headers: Headers, declared: boolean): Eligibility {
  const country = countryFrom(headers);
  if (country && (BLOCKED_COUNTRIES as readonly string[]).includes(country)) {
    return { eligible: false, country, reason: "region_blocked" };
  }
  if (!declared) return { eligible: false, country, reason: "declaration_required" };
  return { eligible: true, country };
}
