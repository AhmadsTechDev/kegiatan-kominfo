export const mailConfig = {
  from: process.env.EMAIL_FROM || "Pendataan Kegiatan <no-reply@diskominfo.local>",
  brevoApiKey: process.env.BREVO_API_KEY || undefined,
} as const;

