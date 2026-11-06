import nodemailer from "nodemailer";
import { env } from "@/config/env";

/**
 * Nodemailer mengirim email lewat server SMTP (di development biasanya Mailpit di port 1025).
 * `transport` dibuat sekali di awal dan dipakai ulang untuk semua email.
 */
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

/**
 * Bahan satu email. Service cukup mengisi bagian-bagian ini, tata letaknya disusun di file ini agar semua email seragam.
 */
export type IsiEmail = {
  judul: string;
  /** Cuplikan satu kalimat yang tampil di daftar kotak masuk (preheader) */
  pratinjau: string;
  paragraf: string[];
  /** Rincian berlabel, mis. waktu dan lokasi kegiatan */
  rincian?: { label: string; nilai: string }[];
  tombol?: { label: string; url: string };
  catatan?: string;
};

const NAVY = "#1a2a6e";
const TEKS = "#0d1b3e";
const REDUP = "#5b6785"; // 5,6:1 di putih, 5,2:1 di latar abu
const LATAR = "#f4f6fb";
const GARIS = "#e3e7f0";

/**
 * Mengamankan teks sebelum dimasukkan ke HTML (mencegah injeksi HTML/XSS)
 */
const escapeHtml = (teks: string) =>
  teks.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Logo dilayani frontend dari public/images; gambar perlu URL publik agar tampil di aplikasi email
 */
const urlLogo = () => `${env.FRONTEND_URL}/images/logo-email.png`;

/**
 * Menyusun badan email versi HTML dengan kepala logo dinas
 *
 * Email HTML memakai <table> dan style di setiap tag (inline style), bukan CSS modern,
 * karena banyak aplikasi email (Gmail, Outlook) hanya mendukung HTML model lama.
 * Semua teks dari luar melewati escapeHtml terlebih dahulu sebelum disisipkan.
 */
function htmlEmail(subjek: string, { judul, pratinjau, paragraf, rincian, tombol, catatan }: IsiEmail) {
  const p = paragraf.map((t) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(t)}</p>`).join("");
  const r = rincian?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;background:${LATAR};border-radius:10px">
${rincian
  .map(
    (x, i) => `<tr><td style="padding:${i ? 4 : 12}px 0 ${i === rincian.length - 1 ? 12 : 4}px 16px;width:96px;font-size:13px;color:${REDUP};vertical-align:top">${escapeHtml(x.label)}</td>
<td style="padding:${i ? 4 : 12}px 16px ${i === rincian.length - 1 ? 12 : 4}px 8px;font-size:14px;font-weight:600;vertical-align:top">${escapeHtml(x.nilai)}</td></tr>`,
  )
  .join("")}
</table>`
    : "";
  const t = tombol
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px"><tr><td style="border-radius:10px;background:${NAVY}"><a href="${escapeHtml(tombol.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(tombol.label)}</a></td></tr></table>
<p style="margin:0;font-size:12px;color:${REDUP};line-height:1.5">Tombol tidak berfungsi? <a href="${escapeHtml(tombol.url)}" style="color:${NAVY};font-weight:600">Buka tautan ini</a>.</p>`
    : "";
  const c = catatan
    ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid ${GARIS};font-size:12px;color:${REDUP};line-height:1.5">${escapeHtml(catatan)}</p>`
    : "";

  /**
   * Spasi kosong setelah preheader mencegah aplikasi email menarik teks badan ke cuplikan
   */
  const pengisi = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subjek)}</title></head>
<body style="margin:0;background:${LATAR};font-family:Segoe UI,Arial,sans-serif;color:${TEKS}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(pratinjau)}${pengisi}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LATAR};padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
<tr><td style="padding:0 4px 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${escapeHtml(urlLogo())}" width="43" height="48" alt="" style="display:block;border:0"></td>
<td style="vertical-align:middle"><div style="font-size:15px;font-weight:700;line-height:1.3">Pendataan Kegiatan</div><div style="font-size:13px;color:${REDUP};line-height:1.4">Diskominfo Kota Palembang</div></td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${GARIS};border-top:4px solid ${NAVY};border-radius:16px;padding:32px 28px">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:800;color:${TEKS}">${escapeHtml(judul)}</h1>
<div style="font-size:15px">${p}${r}${t}${c}</div>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

/**
 * Menyusun badan email versi teks biasa (untuk aplikasi email tanpa HTML)
 */
function teksEmail({ judul, paragraf, rincian, tombol, catatan }: IsiEmail) {
  return [
    judul,
    "",
    ...paragraf,
    ...(rincian?.length ? ["", ...rincian.map((x) => `${x.label}: ${x.nilai}`)] : []),
    ...(tombol ? ["", `${tombol.label}: ${tombol.url}`] : []),
    ...(catatan ? ["", catatan] : []),
    "",
    "Pendataan Kegiatan, Diskominfo Kota Palembang",
  ].join("\n");
}

/**
 * Memecah "Nama <alamat@email>" menjadi { name, email } untuk API Brevo
 */
function pengirim(dari: string) {
  const cocok = dari.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return cocok ? { name: cocok[1]!.trim(), email: cocok[2]!.trim() } : { email: dari.trim() };
}

/**
 * Mengirim email lewat REST API Brevo
 *
 * KONSEP async/await: `fetch` mengirim permintaan ke internet dan butuh waktu, jadi hasilnya ditunggu dengan `await`.
 * Bila Brevo menjawab gagal (res.ok bernilai false), galat dilempar supaya pemanggil tahu email tidak terkirim.
 */
async function kirimLewatBrevo(kepada: string, subjek: string, isi: IsiEmail) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: pengirim(env.SMTP_FROM),
      to: [{ email: kepada }],
      subject: subjek,
      htmlContent: htmlEmail(subjek, isi),
      textContent: teksEmail(isi),
    }),
  });
  if (!res.ok) throw new Error(`Brevo menolak email (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

/**
 * Mengirim email: lewat Brevo bila BREVO_API_KEY diisi, selain itu lewat SMTP
 */
export async function kirimEmail(kepada: string, subjek: string, isi: IsiEmail) {
  /**
   * Brevo dipakai di hosting yang memblokir port SMTP; selain itu memakai SMTP biasa.
   */
  if (env.BREVO_API_KEY) return kirimLewatBrevo(kepada, subjek, isi);
  await transport.sendMail({ from: env.SMTP_FROM, to: kepada, subject: subjek, html: htmlEmail(subjek, isi), text: teksEmail(isi) });
}
