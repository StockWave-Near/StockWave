import AuthStatus from "@/components/AuthStatus";
import Image from "next/image";
import GiftBuilder from "@/components/GiftBuilder";
import Catalog from "@/components/Catalog";
import WaveLogo from "@/components/WaveLogo";
import StockIcon from "@/components/StockIcon";
import Footer from "@/components/Footer";

const FEATURES = [
  { t: "No wallet to install", d: "Your friend signs in with Google. A real account is created for them in the background." },
  { t: "No gas, no fees to pay", d: "The network fee is covered when they claim, so they never need to buy anything first." },
  { t: "Pay from any chain", d: "Fund the gift with USDC. NEAR Intents turns it into the stock for you." },
  { t: "Your link, your control", d: "The claim key lives only inside the link. StockWave never holds it, and unclaimed gifts return to you." },
  { t: "Share it anywhere", d: "Send the link on WhatsApp, copy it, or use your phone's share sheet." },
  { t: "Real tokenized shares", d: "Google, Apple and Tesla from Ondo, held on-chain. Not a brokerage account." },
];

const FAQ = [
  { q: "Is this a brokerage account?", a: "No. These are tokenized shares issued by Ondo and held on-chain. They track the stock price but are not a brokerage account." },
  { q: "What does my friend need?", a: "A Google account and the link. No wallet app, no seed phrase and no crypto." },
  { q: "Who pays the network fee?", a: "The StockWave vault pays it when your friend claims, within a small per-gift limit." },
  { q: "What if the gift is never claimed?", a: "Every gift has an expiry. After it, only the sender can take the gift back." },
  { q: "Is the link safe to share?", a: "The claim key sits after the # in the link, which browsers never send to any server. Share it only with the person you mean to gift." },
  { q: "Where is it available?", a: "Tokenized stocks are not available to residents of the United States or Canada. You confirm this before sending a gift." },
];

export default function Home() {
  return (
    <>
    <main className="wrap">
      <nav className="nav">
        <div className="brand"><WaveLogo /> StockWave</div>
        <div className="links">
          <a href="#catalog">Stocks</a>
          <a href="#how">How it works</a>
          <a href="#why">Why StockWave</a>
          <a href="#faq">FAQ</a>
        </div>
        <AuthStatus />
        <a className="pill" href="#send">Send a gift</a>
      </nav>

      <section className="hero">
        <span className="eyebrow">Gift a first stock</span>
        <h1>Send a share<br />like you send a text</h1>
        <p>Give a friend their first stock as a link. They sign in with Google and own a real tokenized share, with no wallet, seed phrase or gas fee.</p>
        <a className="pill" href="#send">Get started today</a>
        <ul className="trust">
          <li>No wallet</li><li>No gas</li><li>Works on WhatsApp</li>
        </ul>
      </section>

      <GiftBuilder />

      <section className="steps" id="how">
        <div className="step"><b>01</b><h4>Pick a stock</h4><p>Choose Google, Apple or Tesla and an amount. See the price before anything is signed.</p></div>
        <div className="step"><b>02</b><h4>Share the link</h4><p>Send it on WhatsApp or anywhere. The claim key stays in the link, so StockWave never holds it.</p></div>
        <div className="step"><b>03</b><h4>They claim it</h4><p>Your friend signs in with Google and taps Claim. We pay the network fee.</p></div>
      </section>

      <Catalog />

      <section className="showcase">
        <div>
          <h2 className="h2">What your friend sees</h2>
          <p className="lede">One screen, one tap. No jargon, nothing to install.</p>
          <div className="phone" aria-label="Example claim screen">
            <div className="phone-card">
              <StockIcon a={{ logo: "/logos/brands/tesla.svg", color: "#CC0000", ticker: "TSLA", name: "Tesla" }} size={56} />
              <small>You&apos;ve been given</small>
              <strong>$20 of Tesla</strong>
              <em>&ldquo;Happy birthday!&rdquo;</em>
              <span className="pill">Sign in with Google to claim</span>
            </div>
          </div>
          <p className="fine">Example screen.</p>
        </div>
        <div>
          <h2 className="h2">Or just ask on WhatsApp</h2>
          <p className="lede">A simple bot shows who sent you a gift and gets you started.</p>
          <div className="chat" aria-label="Example WhatsApp chat">
            <div className="bub me">gifts</div>
            <div className="bub bot">Your gifts:<br />1. $20 of Tesla from alice.near: ready to claim<br />&ldquo;Happy birthday!&rdquo;<br /><br />To claim, open the gift link your friend sent you and sign in with Google.</div>
            <div className="bub me">stocks</div>
            <div className="bub bot">You can get:<br />• Google (Alphabet)<br />• Apple<br />• Tesla</div>
          </div>
          <p className="fine">Example conversation.</p>
        </div>
      </section>

      <section id="why" className="why">
        <h2 className="h2 center">Why StockWave</h2>
        <div className="grid">
          {FEATURES.map((f) => (
            <div className="feat" key={f.t}><h4>{f.t}</h4><p>{f.d}</p></div>
          ))}
        </div>
      </section>

      <section id="faq" className="faq">
        <h2 className="h2 center">Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </section>

      <section className="cta">
        <h2 className="h2">Give someone their first stock today</h2>
        <a className="pill" href="#send">Send a gift</a>
      </section>

    </main>
    <Footer />
  </>
  );
}
