const CUSTOM = 'KLMPQRSTUVWXYZABCGHdefIJjkNOlmnopqrstuvwxyzabcghiDEF34501289+67/';
const STANDARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeCustomBase64(encoded) {
  let standard = '';
  for (const ch of encoded.trim()) {
    const idx = CUSTOM.indexOf(ch);
    standard += idx >= 0 ? STANDARD[idx] : ch;
  }
  const pad = standard.length % 4;
  if (pad) standard += '='.repeat(4 - pad);
  return JSON.parse(atob(standard));
}
