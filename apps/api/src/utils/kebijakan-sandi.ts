export const SANDI_MIN = 8;
export const SANDI_MAKS = 128;

export function periksaSandi(sandi: string, konteks: { email?: string | null } = {}): string | null {
  if (sandi.length < SANDI_MIN) return `Kata sandi minimal ${SANDI_MIN} karakter`;
  if (sandi.length > SANDI_MAKS) return `Kata sandi maksimal ${SANDI_MAKS} karakter`;
  if (!/\p{L}/u.test(sandi) || !/\p{N}/u.test(sandi)) return "Kata sandi harus berisi huruf dan angka";
  if (/^(.)\1+$/u.test(sandi)) return "Kata sandi tidak boleh berupa satu karakter berulang";
  const namaEmail = konteks.email?.split("@")[0]?.toLowerCase();
  if (namaEmail && namaEmail.length >= 4 && sandi.toLowerCase().includes(namaEmail)) return "Kata sandi tidak boleh memuat alamat email Anda";
  return null;
}
