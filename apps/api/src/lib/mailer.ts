import nodemailer from "nodemailer";
import { env } from "@/config/env";

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export type IsiEmail = {
  judul: string;
  paragraf: string[];
  tombol?: { label: string; url: string };
  catatan?: string;
};

// Mengamankan teks sebelum dimasukkan ke HTML (mencegah injeksi HTML/XSS)
const escapeHtml = (teks: string) =>
  teks.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Menyusun badan email versi HTML dengan tampilan resmi Diskominfo
function htmlEmail({ judul, paragraf, tombol, catatan }: IsiEmail) {
  const p = paragraf.map((t) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(t)}</p>`).join("");
  const t = tombol
    ? `<p style="margin:22px 0"><a href="${escapeHtml(tombol.url)}" style="background:#1a2a6e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${escapeHtml(tombol.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;color:#5b6785;line-height:1.5">Bila tombol tidak berfungsi, salin tautan ini ke peramban:<br><span style="word-break:break-all">${escapeHtml(tombol.url)}</span></p>`
    : "";
  const c = catatan ? `<p style="margin:18px 0 0;font-size:12px;color:#5b6785;line-height:1.5">${escapeHtml(catatan)}</p>` : "";
  return `<!doctype html><html lang="id"><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0d1b3e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e7f0;border-radius:16px;padding:28px">
<tr><td style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#1a2a6e;text-transform:uppercase;padding-bottom:6px">Diskominfo Kota Palembang</td></tr>
<tr><td style="font-size:20px;font-weight:800;padding-bottom:16px">${escapeHtml(judul)}</td></tr>
<tr><td style="font-size:14px">${p}${t}${c}</td></tr>
</table>
<p style="font-size:11px;color:#8b97b0;margin-top:16px">Email otomatis dari Aplikasi Pendataan Kegiatan. Jangan membalas email ini.</p>
</td></tr></table></body></html>`;
}

// Menyusun badan email versi teks biasa (untuk aplikasi email tanpa HTML)
function teksEmail({ judul, paragraf, tombol, catatan }: IsiEmail) {
  return [judul, "", ...paragraf, ...(tombol ? ["", `${tombol.label}: ${tombol.url}`] : []), ...(catatan ? ["", catatan] : [])].join("\n");
}

// Memecah "Nama <alamat@email>" menjadi { name, email } untuk API Brevo
function pengirim(dari: string) {
  const cocok = dari.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return cocok ? { name: cocok[1]!.trim(), email: cocok[2]!.trim() } : { email: dari.trim() };
}

// Mengirim email lewat REST API Brevo
async function kirimLewatBrevo(kepada: string, subjek: string, isi: IsiEmail) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: pengirim(env.SMTP_FROM),
      to: [{ email: kepada }],
      subject: subjek,
      htmlContent: htmlEmail(isi),
      textContent: teksEmail(isi),
    }),
  });
  if (!res.ok) throw new Error(`Brevo menolak email (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

// Mengirim email: lewat Brevo bila BREVO_API_KEY diisi, selain itu lewat SMTP
export async function kirimEmail(kepada: string, subjek: string, isi: IsiEmail) {
  if (env.BREVO_API_KEY) return kirimLewatBrevo(kepada, subjek, isi);
  await transport.sendMail({ from: env.SMTP_FROM, to: kepada, subject: subjek, html: htmlEmail(isi), text: teksEmail(isi) });
}
