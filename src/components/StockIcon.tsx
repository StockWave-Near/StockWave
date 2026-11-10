"use client";

import { useState } from "react";
import type { OndoAsset } from "@/lib/ondo-catalog";

// Logo from an image URL (brand SVG or Ondo token icon). Falls back to a clean monogram
// if the image is missing or blocked.
type Props = { a: Pick<OndoAsset, "logo" | "color" | "ticker" | "name">; size?: number };

export default function StockIcon({ a, size = 56 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size * 0.28 } as const;
  if (!a.logo || failed) {
    return (
      <span className="sicon mono" style={{ ...box, background: a.color, fontSize: size * (a.ticker.length > 3 ? 0.26 : 0.32) }} role="img" aria-label={`${a.name} icon`}>
        {a.ticker.slice(0, 4)}
      </span>
    );
  }
  const brand = a.logo.includes("simpleicons.org");
  return (
    <span className="sicon" style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={a.logo}
        alt={`${a.name} logo`}
        width={brand ? size * 0.58 : size}
        height={brand ? size * 0.58 : size}
        style={{ borderRadius: brand ? 0 : size * 0.28, objectFit: "cover" }}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
