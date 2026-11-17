export function wajib(kunci: string): string {
  const nilai = process.env[kunci];
  if (!nilai) throw new Error(`Environment variable wajib belum diisi: ${kunci}`);
  return nilai;
}
