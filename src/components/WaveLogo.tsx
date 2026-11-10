// StockWave mark: one waving hand (custom SVG, not an emoji) with two motion arcs.
export default function WaveLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-2 0 26 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="wavehand">
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      <path d="M3.4 3.2c-1.5 1.5-1.5 3.9 0 5.4" opacity=".75" />
      <path d="M.6 1.2c-2.3 2.6-2.3 6.4 0 9" opacity=".4" />
    </svg>
  );
}
