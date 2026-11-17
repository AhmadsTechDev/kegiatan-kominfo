import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { storageConfig } from "@/config/storage";
import { PayloadTooLarge } from "@/lib/errors";

const OPSI = { resource_type: "raw", type: "authenticated" } as const;
let terkonfigurasi = false;

function siapkan() {
  if (terkonfigurasi) return;
  const u = new URL(storageConfig.cloudinaryUrl);
  cloudinary.config({
    cloud_name: u.hostname,
    api_key: decodeURIComponent(u.username),
    api_secret: decodeURIComponent(u.password),
    secure: true,
  });
  terkonfigurasi = true;
}

function publicId(key: string) {
  if (key.split("/").some((bagian) => bagian === ".." || bagian === "")) throw new Error(`Key penyimpanan tidak valid: ${key}`);
  return `${storageConfig.cloudinaryFolder}/${key}`;
}

export const storage = {
  async put(key: string, bytes: Uint8Array) {
    siapkan();
    try {
      await new Promise<UploadApiResponse>((selesai, gagal) => {
        const aliran = cloudinary.uploader.upload_stream({ ...OPSI, public_id: publicId(key), overwrite: false }, (galat, hasil) =>
          galat || !hasil ? gagal(galat ?? new Error("Unggah ke Cloudinary gagal")) : selesai(hasil),
        );
        aliran.end(Buffer.from(bytes));
      });
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      if (/file size too large/i.test(pesan)) throw PayloadTooLarge("Berkas melebihi batas ukuran penyimpanan Cloudinary. Perkecil berkasnya lalu coba lagi.");
      throw new Error(`Unggah ke Cloudinary gagal: ${pesan}`);
    }
  },

  async read(key: string) {
    siapkan();
    const url = cloudinary.url(publicId(key), { ...OPSI, sign_url: true });
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Gagal membaca berkas dari Cloudinary (${res.status})`);
    return res.blob();
  },

  async delete(key: string) {
    siapkan();
    await cloudinary.uploader.destroy(publicId(key), { ...OPSI, invalidate: true });
  },
};
