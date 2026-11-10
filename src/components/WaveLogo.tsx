import Image from "next/image";

// StockWave mark: the sage badge, a waving hand drawn as a custom SVG.
export default function WaveLogo({ size = 40 }: { size?: number }) {
  return <Image src="/brand/stockwave-logo.svg" alt="StockWave logo" width={size} height={size} priority />;
}
