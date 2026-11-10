import Image from "next/image";
import WaveLogo from "./WaveLogo";

export default function Footer() {
  return (
    <div className="wrap">
      <footer className="site-footer">
        <div className="fgrid">
          <div className="fbrand">
            <div className="brand"><WaveLogo /> StockWave</div>
            <p>Send a share like you send a text. Gift a friend their first stock as a link, with no wallet, seed phrase or gas fee.</p>
          </div>
          <div className="fcol">
            <h5>Product</h5>
            <ul>
              <li><a href="#send">Send a gift</a></li>
              <li><a href="#catalog">All stocks</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Build</h5>
            <ul>
              <li><a href="https://github.com/ayushsingh82/Onchainstock-near" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://github.com/ayushsingh82/Onchainstock-near/blob/main/ARCHITECTURE.md" target="_blank" rel="noreferrer">Architecture</a></li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Powered by</h5>
            <ul>
              <li><a href="https://near.org" target="_blank" rel="noreferrer">NEAR Protocol</a></li>
              <li><a href="https://near-intents.org" target="_blank" rel="noreferrer">NEAR Intents</a></li>
              <li><a href="https://ondo.finance" target="_blank" rel="noreferrer">Ondo tokenized stocks</a></li>
            </ul>
          </div>
        </div>
        <div className="fbottom">
          <span>© 2026 StockWave. All rights reserved.</span>
          <span className="by"><Image src="/logos/near.jpg" alt="NEAR" width={20} height={20} className="nearlogo" /> Powered by NEAR Intents</span>
        </div>
      </footer>
    </div>
  );
}
