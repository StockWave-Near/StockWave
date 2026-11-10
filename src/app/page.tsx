import GiftBuilder from "@/components/GiftBuilder";

function Sun() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="13" cy="13" r="4.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={13 + Math.cos(a) * 8} y1={13 + Math.sin(a) * 8} x2={13 + Math.cos(a) * 11} y2={13 + Math.sin(a) * 11} />;
      })}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand"><Sun /> StockWave</div>
        <div className="links">
          <a href="#stocks">Stocks</a>
          <a href="#how">How it works</a>
          <a href="#send">Send a gift</a>
        </div>
        <a className="pill" href="#send">Send a gift <span className="arrow">↗</span></a>
      </nav>

      <section className="hero">
        <h1>Send a share<br />like you send a text</h1>
        <p>Give a friend their first stock as a link. They sign in with Google and own a real tokenized share, with no wallet, seed phrase or gas fee.</p>
        <a className="pill" href="#send">Get started today <span className="arrow">↗</span></a>
      </section>

      <GiftBuilder />

      <section className="steps" id="how">
        <div className="step"><b>01</b><h4>Pick a stock</h4><p>Choose Google, Apple or Tesla and an amount. See the price before anything is signed.</p></div>
        <div className="step"><b>02</b><h4>Share the link</h4><p>Send it on WhatsApp or anywhere. The claim key stays in the link, so StockWave never holds it.</p></div>
        <div className="step"><b>03</b><h4>They claim it</h4><p>Your friend signs in with Google and taps Claim. We pay the network fee.</p></div>
      </section>
    </main>
  );
}
