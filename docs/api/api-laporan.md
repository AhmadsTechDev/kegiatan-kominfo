# API Dashboard, Kalender, Rekap, Pantau, dan Ekspor

Kembali ke [ringkasan](README.md).

Semua endpoint di sini butuh header `Cookie`. Data `PEGAWAI` otomatis dibatasi ke bidangnya dan kegiatan miliknya; kegiatan yang dihapus tidak pernah dihitung.

Beberapa endpoint memakai **kegiatan ringkas** dengan bentuk:

```json
{
  "id": 1,
  "judul": "Rapat koordinasi data",
  "tglMulai": "2026-11-05T02:00:00.000Z",
  "tglSelesai": "2026-11-05T04:00:00.000Z",
  "lokasiNama": "Ruang rapat",
  "bidang": "Seksi Pengelolaan Data dan Persediaan",
  "jenis": "Rapat",
  "penanggungJawab": "Andi Saputra",
  "statusPelaksanaan": "akan_datang"
}
```

---

## Dashboard

### `GET /api/dashboard`

Dashboard bulanan untuk pimpinan dan admin (semua unit).

**Akses**: PIMPINAN, ADMIN

**Query**

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `periode` | `YYYY-MM` | Opsional, bawaan bulan berjalan (WIB) |

**Respons 200**

```json
{
  "periode": "2026-11",
  "periodeSekarang": "2026-11",
  "kpi": {
    "total": 14,
    "berlangsung": 1,
    "akanDatang": 5,
    "selesai": 8,
    "totalPeriodeSebelumnya": 11
  },
  "trenUnitBulanan": {
    "unitInduk": [{ "id": 4, "kode": "BID-TIP", "nama": "Bidang Teknologi Informasi dan Persandian" }],
    "data": [
      { "bulan": "2026-06", "jumlah": { "BID-TIP": 3 } },
      { "bulan": "2026-11", "jumlah": { "BID-TIP": 4 } }
    ]
  },
  "sebaranJenis": [{ "id": 1, "nama": "Rapat", "jumlah": 8 }, { "id": 5, "nama": "Bimtek", "jumlah": 0 }],
  "peta": [{ "...kegiatan ringkas": "", "lat": -2.976074, "lng": 104.775431 }],
  "akanDatang": ["...kegiatan ringkas (maks. 5)"],
  "admin": { "menungguAktivasi": 1 }
}
```

| Field | Keterangan |
| --- | --- |
| `kpi` | Angka bulan terpilih. `selesai` = sudah selesai (tidak dibatalkan) |
| `trenUnitBulanan` | 6 bulan terakhir sampai `periode`. Kunci di `jumlah` adalah `kode` unit induk; unit turunan digabung ke induknya |
| `sebaranJenis` | Jumlah per jenis, terbanyak di atas; jenis aktif tanpa kegiatan ikut di belakang dengan `jumlah` 0 |
| `peta` | Kegiatan bulan ini yang punya koordinat |
| `akanDatang` | 5 kegiatan terdekat yang akan datang (tidak terbatas bulan) |
| `admin` | Hanya untuk ADMIN: jumlah akun yang menunggu aktivasi. `null` untuk PIMPINAN |

### `GET /api/dashboard/saya`

Beranda pribadi.

**Akses**: Login

**Respons 200**

```json
{
  "hariIni": "2026-11-02",
  "perluDokumentasi": { "total": 1, "items": ["...kegiatan ringkas"] },
  "agenda": { "total": 2, "items": ["...kegiatan ringkas"] },
  "pekanIni": ["...item kalender (lihat GET /api/kalender)"],
  "unit": { "id": 10, "jumlahBulanIni": 4 }
}
```

| Field | Keterangan |
| --- | --- |
| `perluDokumentasi` | Kegiatan saya yang sudah selesai tetapi belum berdokumentasi (maks. 5 item) |
| `agenda` | Kegiatan saya yang sedang berlangsung atau akan datang (maks. 5 item) |
| `pekanIni` | Kegiatan dalam 7 hari ke depan yang boleh saya lihat, tanpa yang dibatalkan |
| `unit` | Bidang saya dan jumlah kegiatannya bulan ini; `null` bila akun belum tertaut ke pegawai |

---

## Kalender

### `GET /api/kalender`

**Akses**: Login

**Query**

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `bulan` | `YYYY-MM` | Opsional, bawaan bulan berjalan |

**Respons 200**

```json
{
  "bulan": "2026-11",
  "bulanSekarang": "2026-11",
  "unitInduk": [{ "id": 4, "nama": "Bidang Teknologi Informasi dan Persandian" }],
  "items": [
    {
      "id": 1,
      "judul": "Rapat koordinasi data",
      "tglMulai": "2026-11-05T02:00:00.000Z",
      "tglSelesai": "2026-11-05T04:00:00.000Z",
      "lokasiNama": "Ruang rapat",
      "bidang": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
      "jenis": "Rapat",
      "penanggungJawab": "Andi Saputra",
      "statusPelaksanaan": "akan_datang",
      "unitIndukId": 4
    }
  ],
  "terpotong": false
}
```

- `items` berisi kegiatan yang beririsan dengan bulan itu, maksimal 1.000.
- `unitIndukId` dipakai untuk mewarnai kegiatan per unit induk.
- `terpotong: true` berarti ada lebih dari 1.000 kegiatan dan sisanya tidak ditampilkan.

---

## Rekap

### `GET /api/rekap`

Jumlah kegiatan menurut periode, pegawai, unit, dan jenis.

**Akses**: PIMPINAN, ADMIN (PEGAWAI ditolak 403)

**Query**: sama dengan filter `GET /api/kegiatan` (`unit`, `jenis`, `pegawai`, `status`, `pemeriksaan`, `periode`, `dari`, `sampai`, `q`), tanpa `milik`, `page`, `pageSize`. Ditambah:

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `satuan` | `hari` \| `bulan` \| `tahun` | Satuan grafik tren, bawaan `bulan` |

**Respons 200**

```json
{
  "periodeSekarang": "2026-11",
  "satuan": "bulan",
  "total": { "total": 1, "akanDatang": 0, "berlangsung": 0, "selesai": 1, "dibatalkan": 0, "peserta": 12 },
  "tren": [{ "periode": "2026-10", "jumlah": 1 }],
  "perPegawai": [{ "id": 1, "nama": "Andi Saputra", "bidang": "Seksi Pengelolaan Data dan Persediaan", "jumlah": 1 }],
  "perUnit": [
    {
      "unit": { "id": 4, "kode": "BID-TIP", "nama": "Bidang Teknologi Informasi dan Persandian" },
      "total": 1,
      "akanDatang": 0,
      "berlangsung": 0,
      "selesai": 1,
      "dibatalkan": 0,
      "peserta": 12
    }
  ],
  "perJenis": [{ "id": 1, "nama": "Rapat", "jumlah": 1 }]
}
```

| Field | Keterangan |
| --- | --- |
| `tren` | Jumlah per hari/bulan/tahun. Periode tanpa kegiatan tetap muncul dengan `jumlah: 0` |
| `perUnit` | PIMPINAN/ADMIN: digabung per unit induk tertinggi, semua unit induk aktif tetap tampil. PEGAWAI: per bidang apa adanya |
| `peserta` | Jumlah total `jumlahPeserta` |

**Galat**: 422 bila rentang terlalu panjang untuk satuannya (lebih dari 400 titik tren, misalnya per hari selama 2 tahun).

---

## Pantau pemeriksaan

### `GET /api/pantau/ringkasan`

Jumlah kegiatan per status pemeriksaan, untuk pimpinan.

**Akses**: PIMPINAN (admin ditolak 403)

**Query** (opsional): `unit`, `pegawai`, `dari`, `sampai` (lihat filter `GET /api/kegiatan`)

**Respons 200**

```json
{ "total": 1, "draf": 0, "terkirim": 0, "diperiksa": 0, "perluPerbaikan": 1 }
```

`draf` = jumlah draf yang belum dikirim pegawai pada filter yang sama.

---

## Ekspor laporan

**Query kedua endpoint ekspor**: sama dengan filter `GET /api/rekap` tanpa `satuan`. Maksimal 5.000 kegiatan per laporan (lebih dari itu dijawab 422; persempit filternya).

### `GET /api/ekspor/kegiatan.pdf`

**Akses**: PIMPINAN, ADMIN; PEGAWAI ditolak 403 (maks. 10 ekspor per menit per akun)

**Respons 200**: berkas PDF A4 mendatar berkop dinas (`Content-Type: application/pdf`).

| Header respons | Nilai |
| --- | --- |
| `Content-Disposition` | `attachment; filename="rekap-kegiatan-2026-11-2026-11-02.pdf"` |
| `X-Jumlah-Kegiatan` | Jumlah kegiatan di berkas |
| `Cache-Control` | `no-store` |

### `GET /api/ekspor/pratinjau`

Isi laporan PDF dalam bentuk JSON, untuk ditampilkan sebelum diunduh. Tidak dihitung ke batas laju dan tidak dicatat di audit log.

**Respons 200**

```json
{
  "kop": { "pemerintah": "PEMERINTAH KOTA PALEMBANG", "dinas": "DINAS KOMUNIKASI DAN INFORMATIKA", "alamat": null },
  "judul": "REKAP KEGIATAN",
  "subjudul": "Semua periode  ·  Semua bidang  ·  Semua jenis  ·  Semua status",
  "ringkasan": [
    { "label": "Total kegiatan", "nilai": 1 },
    { "label": "Akan datang", "nilai": 0 },
    { "label": "Berlangsung", "nilai": 0 },
    { "label": "Selesai", "nilai": 1 },
    { "label": "Dibatalkan", "nilai": 0 }
  ],
  "kolom": [{ "judul": "No", "lebar": "4%" }, { "judul": "Kegiatan", "lebar": "27%" }],
  "baris": [
    {
      "id": 1,
      "judul": "Rapat koordinasi data",
      "lokasi": "Ruang rapat",
      "jenis": "Rapat",
      "bidang": "Seksi Pengelolaan Data dan Persediaan",
      "penanggungJawab": "Andi Saputra",
      "waktu": "31 Okt 2026, 05.10–07.10",
      "peserta": "12",
      "status": "Selesai"
    }
  ],
  "kaki": "Dicetak oleh Administrator pada 02 Nov 2026 05.11 WIB"
}
```
