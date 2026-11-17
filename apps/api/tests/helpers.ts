import { app } from "@/app";
import { eq } from "drizzle-orm";
import { bidang, jenisKegiatan, user } from "@/db/schema";
import { db } from "@/db";
import type { Role } from "@/types/umum.types";
import { suratTerakhir, tokenDari } from "./surel-palsu";

export const SANDI = "sandiuji12345";

type Opsi = {
  method?: string;
  json?: unknown;
  form?: FormData;
  cookie?: string;
  ip?: string;
  origin?: string | null;
};

const acak = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export const ipAcak = () => `10.${acak(0, 255)}.${acak(0, 255)}.${acak(1, 254)}`;

export const emailAcak = (awalan = "uji") => `${awalan}-${crypto.randomUUID().slice(0, 8)}@uji.local`;

export function nipAcak() {
  const thnLahir = acak(1970, 1995);
  const lahir = `${thnLahir}${String(acak(1, 12)).padStart(2, "0")}${String(acak(1, 28)).padStart(2, "0")}`;
  const tmt = `${thnLahir + acak(20, 25)}${String(acak(1, 12)).padStart(2, "0")}`;
  return `${lahir}${tmt}${acak(1, 2)}${String(acak(1, 999)).padStart(3, "0")}`;
}

export async function panggil(path: string, opsi: Opsi = {}) {
  const headers = new Headers({ "x-forwarded-for": opsi.ip ?? ipAcak() });
  const origin = opsi.origin === undefined ? process.env.FRONTEND_URL! : opsi.origin;
  if (origin) headers.set("origin", origin);
  if (opsi.cookie) headers.set("cookie", opsi.cookie);
  let body: string | FormData | undefined;
  if (opsi.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(opsi.json);
  }
  if (opsi.form) body = opsi.form;
  const res = await app.handle(new Request(`http://localhost/api${path}`, { method: opsi.method ?? (body ? "POST" : "GET"), headers, body }));
  const tipe = res.headers.get("content-type") ?? "";
  const data = tipe.includes("json") ? await res.json() : tipe.startsWith("text/") ? await res.text() : new Uint8Array(await res.arrayBuffer());
  return { status: res.status, data: data as any, headers: res.headers };
}

export async function login(email: string, password: string, ip?: string) {
  const res = await panggil("/auth/sign-in/email", { json: { email, password }, ip });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { ...res, cookie };
}

export const tokenTerakhir = (email: string) => tokenDari(suratTerakhir(email)!);

export async function aktifkan(email: string, password = SANDI) {
  const res = await panggil("/aktivasi", { json: { token: tokenTerakhir(email), password } });
  if (res.status !== 200) throw new Error(`Aktivasi gagal ${res.status}: ${JSON.stringify(res.data)}`);
}

export async function isiAkun(ubah: Record<string, unknown> = {}) {
  return { name: `Akun Uji ${crypto.randomUUID().slice(0, 4)}`, email: emailAcak(), bidangId: await idUnit("SEKSI-DATA"), role: "PEGAWAI", ...ubah };
}

let cookieAdmin: string | undefined;

export async function loginAdmin() {
  if (!cookieAdmin) {
    const res = await login(process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
    if (res.status !== 200) throw new Error(`Login admin gagal: ${JSON.stringify(res.data)}`);
    cookieAdmin = res.cookie;
  }
  return cookieAdmin;
}

export async function idUnit(kode: string) {
  const [b] = await db.select({ id: bidang.id }).from(bidang).where(eq(bidang.kode, kode));
  return b!.id;
}

export async function idJenis(nama = "Rapat") {
  const [j] = await db.select({ id: jenisKegiatan.id }).from(jenisKegiatan).where(eq(jenisKegiatan.nama, nama));
  return j!.id;
}

export async function buatBidang(awalan = "Bidang Uji") {
  const admin = await loginAdmin();
  const res = await panggil("/admin/bidang", { cookie: admin, json: { nama: `${awalan} ${crypto.randomUUID().slice(0, 6)}`, parentId: null } });
  if (res.status !== 201) throw new Error(JSON.stringify(res.data));
  const [b] = await db.select().from(bidang).where(eq(bidang.id, res.data.id));
  return b!;
}

type Pengguna = { cookie: string; userId: string; pegawaiId: number; email: string; nip: string };

export async function buatPengguna({ role = "PEGAWAI", unitId }: { role?: Role; unitId?: number } = {}): Promise<Pengguna> {
  const admin = await loginAdmin();
  const nip = nipAcak();
  const email = emailAcak(role.toLowerCase());
  const isi = await isiAkun({ name: `Uji ${role} ${crypto.randomUUID().slice(0, 4)}`, email, nip, role, bidangId: unitId ?? (await idUnit("SEKSI-DATA")) });
  const akun = await panggil("/admin/akun", { cookie: admin, json: isi });
  if (akun.status !== 201) throw new Error(JSON.stringify(akun.data));
  await aktifkan(email);
  const masuk = await login(email, SANDI);
  if (masuk.status !== 200) throw new Error(JSON.stringify(masuk.data));
  const [{ pegawaiId }] = (await db.select({ pegawaiId: user.pegawaiId }).from(user).where(eq(user.id, akun.data.id))) as [{ pegawaiId: number | null }];
  return { cookie: masuk.cookie, userId: akun.data.id, pegawaiId: pegawaiId!, email, nip };
}

export const jamLagi = (jam: number) => new Date(Date.now() + jam * 3600_000).toISOString();

export async function isiKegiatan(penanggungJawabId: number, ubah: Record<string, unknown> = {}) {
  return {
    judul: `Kegiatan uji ${crypto.randomUUID().slice(0, 6)}`,
    jenisId: await idJenis(),
    penanggungJawabId,
    tglMulai: jamLagi(24),
    tglSelesai: jamLagi(26),
    lokasiNama: "Ruang rapat",
    jumlahPeserta: 10,
    ...ubah,
  };
}

export async function buatKegiatan(cookie: string, isi: Record<string, unknown>) {
  const res = await panggil("/kegiatan", { cookie, json: isi });
  if (res.status !== 201) throw new Error(`Buat kegiatan gagal ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data as { id: number; updatedAt: string };
}

export const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

export function formBerkas(isi: Uint8Array, nama = "foto.png") {
  const fd = new FormData();
  fd.append("berkas", new File([isi], nama));
  return fd;
}
