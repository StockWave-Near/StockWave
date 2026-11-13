// Browser-side claim keys. The private key goes into the link fragment only and is never
// sent to the server; only the public key is.
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function toBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let result = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += "1";
  return result + digits.reverse().map((d) => BASE58_ALPHABET[d]).join("");
}

/** One fresh ed25519 keypair in NEAR string format. */
export async function generateClaimKeypair(): Promise<{ privateKey: string; publicKey: string }> {
  const key = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("pkcs8", key.privateKey);
  const pub = await crypto.subtle.exportKey("raw", key.publicKey);
  return {
    privateKey: `ed25519:${toBase58(new Uint8Array(priv).slice(-32))}`,
    publicKey: `ed25519:${toBase58(new Uint8Array(pub))}`,
  };
}
