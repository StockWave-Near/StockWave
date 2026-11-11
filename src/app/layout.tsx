import type { Metadata } from "next";
import { Brygada_1918, Poppins, Urbanist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const brygada = Brygada_1918({ variable: "--font-serif", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });
const urbanist = Urbanist({ variable: "--font-num", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StockWave: send a share like you send a text",
  description:
    "Gift a friend their first stock as a link. They sign in with Google and never see a wallet, seed phrase or gas fee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${brygada.variable} ${poppins.variable} ${urbanist.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
