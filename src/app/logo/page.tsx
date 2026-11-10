import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "StockWave logo options" };

const LOGOS = [
  { id: "1-line-wordmark", name: "1. Line wordmark", use: "Navbar, light backgrounds", bg: "#EEF0E4" },
  { id: "2-app-icon", name: "2. App icon", use: "Favicon, WhatsApp profile, app tile", bg: "#EEF0E4" },
  { id: "3-sage-badge", name: "3. Sage badge", use: "Social avatar, stickers", bg: "#EEF0E4" },
  { id: "4-stacked", name: "4. Stacked with tagline", use: "Splash screen, slides, posters", bg: "#EEF0E4" },
  { id: "5-on-dark", name: "5. On dark", use: "Dark headers, demo video end card", bg: "#EEF0E4" },
  { id: "6-mono", name: "6. Black and white", use: "Print, one-colour needs", bg: "#EEF0E4" },
];

const SQUARE = [
  { id: "3a-sage-square", name: "3a. Sage square", use: "Same sage glow as 3, in a rounded square" },
  { id: "3b-mint-square", name: "3b. Mint square", use: "Fresher, lighter green gradient" },
  { id: "3c-cream-outline", name: "3c. Cream outline", use: "Quiet and minimal, moss border" },
  { id: "3d-deep-moss", name: "3d. Deep moss", use: "Dark tile with a light hand" },
  { id: "3e-sunlit", name: "3e. Sunlit", use: "Warm light, matches the page glow" },
  { id: "3f-ring-square", name: "3f. Ring square", use: "Sage square with a soft inner ring" },
];

export default function LogoPage() {
  return (
    <main className="wrap" style={{ paddingBottom: 80 }}>
      <nav className="nav"><Link className="brand" href="/">← StockWave</Link></nav>
      <h1 className="h2">Logo options</h1>
      <p className="lede">One waving hand, drawn as a custom SVG, with two motion lines. Pick a favourite and I will use it everywhere. Each file can be downloaded.</p>
      <div className="logogrid">
        {LOGOS.map((l) => (
          <figure className="logocard" key={l.id}>
            <div className="logostage" style={{ background: l.bg }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/logo-${l.id}.svg`} alt={l.name} />
            </div>
            <figcaption>
              <b>{l.name}</b>
              <small>{l.use}</small>
              <a href={`/brand/logo-${l.id}.svg`} download>Download SVG</a>
            </figcaption>
          </figure>
        ))}
      </div>

      <h2 className="h2" style={{ marginTop: 56 }}>Sage badge, square versions</h2>
      <p className="lede">Variations of option 3 in a rounded square, good for app icons and avatars.</p>
      <div className="logogrid">
        {SQUARE.map((l) => (
          <figure className="logocard" key={l.id}>
            <div className="logostage" style={{ background: "#EEF0E4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/logo-${l.id}.svg`} alt={l.name} style={{ width: 150, height: 150 }} />
            </div>
            <figcaption>
              <b>{l.name}</b>
              <small>{l.use}</small>
              <a href={`/brand/logo-${l.id}.svg`} download>Download SVG</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
