import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "@/config/env";
import { PayloadTooLarge } from "@/lib/errors";

// Kontrak penyimpanan berkas; isinya bisa disk lokal atau Cloudinary
export interface DocumentStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  read(key: string): Promise<Blob | null>;
  delete(key: string): Promise<void>;
}

// Penyimpanan di folder disk lokal (development dan VPS tanpa Cloudinary)
class LocalStorage implements DocumentStorage {
  private readonly akar: string;

  constructor(folder: string) {
    this.akar = resolve(folder);
  }

  // Mengubah key menjadi path lengkap dan menolak key yang keluar dari folder akar (path traversal)
  private path(key: string) {
    const lengkap = resolve(this.akar, key);
    if (!lengkap.startsWith(this.akar + sep)) throw new Error(`Key penyimpanan tidak valid: ${key}`);
    return lengkap;
  }

  // Menulis berkas, membuat foldernya bila belum ada
  async put(key: string, bytes: Uint8Array) {
    const tujuan = this.path(key);
    await mkdir(dirname(tujuan), { recursive: true });
    await Bun.write(tujuan, bytes);
  }

  // Membaca berkas; null bila tidak ada
  async read(key: string) {
    const berkas = Bun.file(this.path(key));
    return (await berkas.exists()) ? berkas : null;
  }

  // Menghapus berkas (tidak galat bila berkas sudah tidak ada)
  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

// Penyimpanan di Cloudinary sebagai berkas privat (hanya bisa dibaca dengan URL bertanda tangan)
class CloudinaryStorage implements DocumentStorage {
  private readonly opsi = { resource_type: "raw", type: "authenticated" } as const;

  constructor(
    url: string,
    private readonly folder: string,
  ) {
    const u = new URL(url);
    cloudinary.config({
      cloud_name: u.hostname,
      api_key: decodeURIComponent(u.username),
      api_secret: decodeURIComponent(u.password),
      secure: true,
    });
  }

  // Mengubah key menjadi public_id Cloudinary dan menolak key mencurigakan
  private publicId(key: string) {
    if (key.split("/").some((bagian) => bagian === ".." || bagian === "")) throw new Error(`Key penyimpanan tidak valid: ${key}`);
    return `${this.folder}/${key}`;
  }

  // Mengunggah berkas ke Cloudinary
  async put(key: string, bytes: Uint8Array) {
    try {
      await new Promise<UploadApiResponse>((selesai, gagal) => {
        const aliran = cloudinary.uploader.upload_stream({ ...this.opsi, public_id: this.publicId(key), overwrite: false }, (galat, hasil) =>
          galat || !hasil ? gagal(galat ?? new Error("Unggah ke Cloudinary gagal")) : selesai(hasil),
        );
        aliran.end(Buffer.from(bytes));
      });
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      if (/file size too large/i.test(pesan)) throw PayloadTooLarge("Berkas melebihi batas ukuran penyimpanan Cloudinary. Perkecil berkasnya lalu coba lagi.");
      throw new Error(`Unggah ke Cloudinary gagal: ${pesan}`);
    }
  }

  // Mengunduh berkas lewat URL bertanda tangan; null bila tidak ada
  async read(key: string) {
    const url = cloudinary.url(this.publicId(key), { ...this.opsi, sign_url: true });
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Gagal membaca berkas dari Cloudinary (${res.status})`);
    return res.blob();
  }

  // Menghapus berkas dari Cloudinary
  async delete(key: string) {
    await cloudinary.uploader.destroy(this.publicId(key), { ...this.opsi, invalidate: true });
  }
}

// Penyimpanan aktif: Cloudinary bila CLOUDINARY_URL diisi, selain itu disk lokal
export const storage: DocumentStorage = env.CLOUDINARY_URL
  ? new CloudinaryStorage(env.CLOUDINARY_URL, env.CLOUDINARY_FOLDER)
  : new LocalStorage(env.STORAGE_DIR);
