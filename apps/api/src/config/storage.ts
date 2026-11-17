import { wajib } from "./env";

export const storageConfig = {
  get cloudinaryUrl() {
    return wajib("CLOUDINARY_URL");
  },
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "kominfo-kegiatan",
} as const;
