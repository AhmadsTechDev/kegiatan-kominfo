import { app } from "@/app";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/umum.types";
import { suratTerakhir, tokenDari } from "./surel-palsu";

export const SANDI = "sandiuji12345";

type Opsi = {
  method?: string;
  json?: unknown;
  form?: FormData;
  cookie?: string;
  ip?: string;
  // Header Origin; null = tanpa Origin (bawaan: origin frontend)
  origin?: string | null;
};

// Angka acak bulat antara a dan b (termasuk keduanya)
const acak = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// IP palsu acak, agar pembatas laju per IP tidak saling mengganggu antar-uji
export const ipAcak = () => `10.${acak(0, 255)}.${acak(0, 255)}.${acak(1, 254)}`;

// Email unik untuk akun uji
export const emailAcak = (awalan = "uji") => `${awalan}-${crypto.randomUUID().slice(0, 8)}@uji.local`;

// NIP 18 digit yang sah (tanggal lahir, tahun pengangkatan, jenis kelamin, nomor urut) dan hampir pasti unik
export function nipAcak() {
  const thnLahir = acak(1970, 1995);
  const lahir = `${thnLahir}${String(acak(1, 12)).padStart(2, "0")}${String(acak(1, 28)).padStart(2, "0")}`;
  const tmt = `${thnLahir + acak(20, 25)}${String(acak(1, 12)).padStart(2, "0")}`;
  return `${lahir}${tmt}${acak(1, 2)}${String(acak(1, 999)).padStart(3, "0")}`;
}

// Memanggil API lewat app.handle (tanpa membuka port). Mengembalikan status, data (JSON/teks/bytes), dan header
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

// Login dengan email; mengembalikan respons beserta cookie sesinya
export async function login(email: string, password: string, ip?: string) {
  const res = await panggil("/auth/sign-in/email", { json: { email, password }, ip });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { ...res, cookie };
}

// Token dari tautan email terakhir yang dikirim ke alamat tertentu
export const tokenTerakhir = (email: string) => tokenDari(suratTerakhir(email)!);

// Membuat kata sandi lewat tautan aktivasi terakhir yang dikirim ke email tersebut
export async function aktifkan(email: string, password = SANDI) {
  const res = await panggil("/aktivasi", { json: { token: tokenTerakhir(email), password } });
  if (res.status !== 200) throw new Error(`Aktivasi gagal ${res.status}: ${JSON.stringify(res.data)}`);
}

// Isian form Buat akun yang sah
export async function isiAkun(ubah: Record<string, unknown> = {}) {
  return { name: `Akun Uji ${crypto.randomUUID().slice(0, 4)}`, email: emailAcak(), jabatan: "Staf", unitKerjaId: await idUnit("SEKSI-DATA"), role: "PEGAWAI", ...ubah };
}

let cookieAdmin: string | undefined;

// Cookie admin bawaan dari seed (login sekali lalu disimpan)
export async function loginAdmin() {
  if (!cookieAdmin) {
    const res = await login(process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
    if (res.status !== 200) throw new Error(`Login admin gagal: ${JSON.stringify(res.data)}`);
    cookieAdmin = res.cookie;
  }
  return cookieAdmin;
}

// Id unit kerja dari kodenya
export async function idUnit(kode: string) {
  return (await prisma.unitKerja.findUniqueOrThrow({ where: { kode } })).id;
}

// Id jenis kegiatan dari namanya
export async function idJenis(nama = "Rapat") {
  return (await prisma.jenisKegiatan.findUniqueOrThrow({ where: { nama } })).id;
}

// Membuat unit tertinggi baru (Bidang) dengan nama unik; berguna agar angka rekap uji tidak tercampur
export async function buatBidang(awalan = "Bidang Uji") {
  const admin = await loginAdmin();
  const res = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: `${awalan} ${crypto.randomUUID().slice(0, 6)}`, jenisUnitId: 2, parentId: null } });
  if (res.status !== 201) throw new Error(JSON.stringify(res.data));
  return (await prisma.unitKerja.findUniqueOrThrow({ where: { id: res.data.id } })) as { id: number; kode: string; nama: string };
}

type Pengguna = { cookie: string; userId: string; pegawaiId: number; email: string; nip: string };

// Membuat akun (beserta data pegawainya) dengan role tertentu, mengaktifkannya lewat email undangan, lalu login
export async function buatPengguna({ role = "PEGAWAI", unitId }: { role?: Role; unitId?: number } = {}): Promise<Pengguna> {
  const admin = await loginAdmin();
  const nip = nipAcak();
  const email = emailAcak(role.toLowerCase());
  const isi = await isiAkun({ name: `Uji ${role} ${crypto.randomUUID().slice(0, 4)}`, email, nip, role, unitKerjaId: unitId ?? (await idUnit("SEKSI-DATA")) });
  const akun = await panggil("/admin/akun", { cookie: admin, json: isi });
  if (akun.status !== 201) throw new Error(JSON.stringify(akun.data));
  await aktifkan(email);
  const masuk = await login(email, SANDI);
  if (masuk.status !== 200) throw new Error(JSON.stringify(masuk.data));
  const { pegawaiId } = await prisma.user.findUniqueOrThrow({ where: { id: akun.data.id }, select: { pegawaiId: true } });
  return { cookie: masuk.cookie, userId: akun.data.id, pegawaiId: pegawaiId!, email, nip };
}

// Waktu ISO sekian jam dari sekarang (negatif = lampau)
export const jamLagi = (jam: number) => new Date(Date.now() + jam * 3600_000).toISOString();

// Isian kegiatan yang sah untuk penanggung jawab tertentu
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

// Membuat kegiatan lewat API dan memastikan berhasil
export async function buatKegiatan(cookie: string, isi: Record<string, unknown>) {
  const res = await panggil("/kegiatan", { cookie, json: isi });
  if (res.status !== 201) throw new Error(`Buat kegiatan gagal ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data as { id: number; updatedAt: string };
}

// Berkas PNG 1x1 piksel yang sah
export const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

// FormData berisi satu berkas di field "berkas"
export function formBerkas(isi: Uint8Array, nama = "foto.png") {
  const fd = new FormData();
  fd.append("berkas", new File([isi], nama));
  return fd;
}

// Catatan audit untuk entitas tertentu, terbaru di atas
export function auditUntuk(entitas: string, entitasId: string | number) {
  return prisma.auditLog.findMany({ where: { entitas, entitasId: String(entitasId) }, orderBy: { id: "desc" } });
}
