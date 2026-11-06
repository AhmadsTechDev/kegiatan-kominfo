// Kompres foto di peramban sebelum diunggah agar lebih cepat dan hemat kuota

const SISI_MAKS = 1920;
const KUALITAS = 0.85;
export const JENIS_FOTO = ["image/jpeg", "image/png", "image/webp"];

export async function kompresGambar(berkas: File): Promise<File> {
  if (!JENIS_FOTO.includes(berkas.type)) return berkas;
  let gambar: ImageBitmap;
  try {
    gambar = await createImageBitmap(berkas, { imageOrientation: "from-image" });
  } catch {
    return berkas;
  }

  const skala = Math.min(1, SISI_MAKS / Math.max(gambar.width, gambar.height));
  const lebar = Math.round(gambar.width * skala);
  const tinggi = Math.round(gambar.height * skala);
  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;
  kanvas.getContext("2d")?.drawImage(gambar, 0, 0, lebar, tinggi);
  gambar.close();

  const blob = await new Promise<Blob | null>((selesai) => kanvas.toBlob(selesai, berkas.type, KUALITAS));
  if (!blob || (skala === 1 && blob.size >= berkas.size)) return berkas;
  return new File([blob], berkas.name, { type: berkas.type, lastModified: berkas.lastModified });
}
