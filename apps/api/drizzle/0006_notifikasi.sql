-- Notifikasi dalam aplikasi (ikon lonceng) untuk pegawai, mis. hasil pemeriksaan kegiatan.
-- Tabel baru, tidak mengubah data yang sudah ada.
-- CreateTable
CREATE TABLE "notifikasi" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "jenis" VARCHAR(30) NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "isi" TEXT,
    "kegiatan_id" INTEGER,
    "dibaca_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifikasi_user_id_created_at_idx" ON "notifikasi"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_kegiatan_id_kegiatan_id_fk" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

