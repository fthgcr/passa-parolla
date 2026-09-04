/** Türkçe alfabe ve harf yardımcıları (tüm kelime modları buradan kullanır) */

export const TR_ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('');

/** Türkçe kurallı büyük harf (i -> İ, ı -> I) */
export function trUpper(text: string): string {
  return text.toLocaleUpperCase('tr-TR');
}

/** Türkçe kurallı küçük harf (I -> ı, İ -> i) */
export function trLower(text: string): string {
  return text.toLocaleLowerCase('tr-TR');
}

export function isTrLetter(ch: string): boolean {
  return TR_ALPHABET.includes(ch);
}

/** FNV-1a: aynı tohum her cihazda aynı indeksi versin diye */
export function seededIndex(seed: string, size: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % size;
}

/** YYYY-MM-DD (yerel saat) */
export function todayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
