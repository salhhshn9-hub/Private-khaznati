const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function extractTotpSecret(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      const secretParam = url.searchParams.get('secret') || '';
      return secretParam.replace(/[\s-]/g, '').toUpperCase();
    } catch {
      const match = trimmed.match(/secret=([A-Za-z2-7=]+)/i);
      return match ? match[1].replace(/[\s-]/g, '').toUpperCase() : '';
    }
  }

  return trimmed.replace(/[\s-=]/g, '').toUpperCase();
}

function decodeBase32(input: string): Uint8Array | null {
  const clean = extractTotpSecret(input).replace(/=+$/, '');
  if (!clean || clean.length < 8) return null;

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export interface TotpResult {
  code: string;
  remainingSeconds: number;
  period: number;
}

export async function generateTotpCode(
  secretInput: string,
  nowMs = Date.now(),
  period = 30
): Promise<TotpResult | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const keyBytes = decodeBase32(secretInput);
  if (!keyBytes || keyBytes.length === 0) return null;

  const epochSec = Math.floor(nowMs / 1000);
  const counter = Math.floor(epochSec / period);
  const remainingSeconds = period - (epochSec % period);

  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  try {
    const rawKey = new Uint8Array(keyBytes);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      rawKey.buffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const hmac = new Uint8Array(signature);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const otp = (binary % 1_000_000).toString().padStart(6, '0');
    return { code: otp, remainingSeconds, period };
  } catch {
    return null;
  }
}
