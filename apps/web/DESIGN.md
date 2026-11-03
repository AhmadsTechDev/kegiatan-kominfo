# DESIGN.md — Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Dokumen ini mengatur tampilan dan perilaku UI. Urusan arsitektur, struktur kode, dan aturan komentar ada di `AGENTS.md`; bila ada konflik, `AGENTS.md` menang. Kebutuhan fitur ada di `PRD v0.2` (ID FR dan NFR di bawah merujuk ke sana).

Semua aturan di sini ditulis agar bisa diikuti agent maupun manusia tanpa menebak: ada nilai konkret, lokasi file, dan cara memanggilnya.

---

## 1. Prinsip desain

1. **Terbaca dulu, cantik kemudian.** Pengguna adalah pegawai dinas dan pimpinan yang membuka sistem untuk satu tugas. Setiap halaman harus menjawab "apa yang saya lakukan di sini?" dalam tiga detik.
2. **Hierarki, bukan dekorasi.** Dashboard terasa monoton bila semua elemen sama besar dan sama warna. Kita membedakan lewat ukuran, kontras, dan satu warna aksen per fungsi, bukan lewat ornamen.
3. **Status selalu berupa teks plus warna.** Warna saja tidak cukup (buta warna, cetak hitam putih). Lihat bagian 9.
4. **Satu pola untuk satu masalah.** Tabel selalu memakai komponen `DataTable`, status selalu `StatusBadge`, konfirmasi hapus selalu `ConfirmDialog`. Jangan membuat varian baru tanpa alasan.
5. **Ramah ponsel.** Pegawai kemungkinan mengisi dari lapangan (NFR-13). Alur FR-04 sampai FR-06 harus selesai di layar 375 px.

Gaya yang dipilih: **institusional modern**, yaitu bersih, tenang, kontras tinggi, dengan sidebar gelap sebagai jangkar visual. Bukan neobrutalism: dashboard pemerintah dibaca berjam-jam oleh pimpinan, dan border tebal dengan bayangan keras melelahkan serta sulit dibuat konsisten pada tabel padat.

---

## 2. Token desain

Semua warna, radius, dan bayangan berasal dari CSS variable. **Dilarang menulis hex atau nilai px mentah di komponen.** Pakai kelas Tailwind yang memetakan ke token.

### 2.1 Warna

Lokasi: `src/app/globals.css`.

```css
/* Token warna. Nilai hex dipilih agar semua pasangan teks dan latar lolos kontras WCAG AA.
 * Palet mengacu pada identitas visual Diskominfo Kota Palembang:
 *   - Biru navy (#1a2a6e) dari header website kominfo.palembang.go.id
 *   - Kuning emas (#c8a951) dari lambang Kota Palembang
 */
:root {
  --radius: 0.75rem;

  /* Permukaan */
  --background: #f4f6fb;            /* latar halaman, sedikit biru untuk kesan institusional */
  --foreground: #0d1b3e;            /* teks utama — navy sangat gelap */
  --card: #ffffff;
  --card-foreground: #0d1b3e;
  --popover: #ffffff;
  --popover-foreground: #0d1b3e;

  /* Aksi utama: biru navy institusional Diskominfo */
  --primary: #1a2a6e;
  --primary-foreground: #ffffff;
  --secondary: #e8ecf8;
  --secondary-foreground: #1a2a6e;

  /* Netral */
  --muted: #edf0f7;
  --muted-foreground: #4a5578;      /* teks sekunder, kontras 7.2:1 di atas putih */
  --accent: #dce3f5;
  --accent-foreground: #1a2a6e;
  --border: #d1d8ec;
  --input: #7f8aa8;                 /* batas kolom isian, 3,44:1 di atas putih (komponen UI minimal 3:1). Gelap: #61708f */
  --ring: #1a2a6e;

  /* Bahaya dan peringatan */
  --destructive: #b91c1c;
  --destructive-foreground: #ffffff;

  /* Sidebar: navy gelap Diskominfo — jangkar visual agar halaman tidak datar.
   * --sidebar      : biru navy sangat gelap (#0f1e52) mirip header kominfo.palembang.go.id
   * --sidebar-accent: kuning emas (#c8a951) dari lambang Kota Palembang, dipakai sebagai
   *                   penanda item aktif dan chip role agar identitas kota terasa di sidebar */
  --sidebar: #0f1e52;
  --sidebar-foreground: #c8d4f0;
  --sidebar-muted: #7b8fc4;
  --sidebar-active: #1a2a6e;
  --sidebar-active-foreground: #ffffff;
  --sidebar-accent: #c8a951;

  /* Status pelaksanaan (latar lembut + teks gelap) */
  --status-akan-datang-bg: #e0f2fe;  --status-akan-datang-fg: #075985;
  --status-berlangsung-bg: #fef3c7;  --status-berlangsung-fg: #92400e;
  --status-selesai-bg:     #dcfce7;  --status-selesai-fg:     #166534;
  --status-dibatalkan-bg:  #ffe4e6;  --status-dibatalkan-fg:  #9f1239;

  /* Palet grafik (6 warna, aman untuk buta warna umum).
   * chart-1 adalah navy primary, chart-3 adalah emas lambang kota. */
  --chart-1: #1a2a6e;
  --chart-2: #0d9488;
  --chart-3: #c8a951;
  --chart-4: #7c3aed;
  --chart-5: #e11d48;
  --chart-6: #64748b;
}
```

Daftarkan ke Tailwind agar bisa dipakai sebagai kelas (`bg-status-selesai`, `text-muted-foreground`, dan seterusnya):

```css
/* Tailwind v4. Bila proyek memakai Tailwind v3, daftarkan pemetaan yang sama di tailwind.config.ts pada theme.extend.colors. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-destructive: var(--destructive);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-active: var(--sidebar-active);

  --color-status-akan-datang: var(--status-akan-datang-bg);
  --color-status-akan-datang-foreground: var(--status-akan-datang-fg);
  --color-status-berlangsung: var(--status-berlangsung-bg);
  --color-status-berlangsung-foreground: var(--status-berlangsung-fg);
  --color-status-selesai: var(--status-selesai-bg);
  --color-status-selesai-foreground: var(--status-selesai-fg);
  --color-status-dibatalkan: var(--status-dibatalkan-bg);
  --color-status-dibatalkan-foreground: var(--status-dibatalkan-fg);

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

Aturan pemakaian warna:

| Peran | Token | Dipakai untuk |
| --- | --- | --- |
| Aksi utama | `primary` | Satu tombol utama per layar, tautan, item aktif, fokus |
| Informasi lembut | `secondary`, `accent` | Latar chip, baris terpilih, ikon latar |
| Teks sekunder | `muted-foreground` | Label, deskripsi, metadata |
| Bahaya | `destructive` | Hapus, batalkan, pesan error |
| Status | `status-*` | Hanya lewat `StatusBadge` |
| Grafik | `chart-1` sampai `chart-6` | Hanya lewat komponen `ChartContainer` shadcn |

**Aksen peran pimpinan.** Akun pimpinan memakai emas lambang kota sebagai aksen (`--aksen-peran`, `--sidebar-primary` di bawah `:root[data-peran="pimpinan"]`): penanda menu aktif, avatar sidebar, garis eyebrow, dan titik di label peran. Terang `#8a6d1f` (4,9:1 di putih), gelap `#e2c46f` dengan teks `#241a00`. Pegawai dan admin tetap biru.

**Daftar panjang.** Pilihan yang bisa berisi ratusan baris (pegawai, aktor audit) memakai `PilihCari` (`components/shared/pilih-cari.tsx`), bukan `Select`: ketik untuk menyaring, maksimal 50 hasil dirender.

Mode gelap tidak termasuk versi pertama. Token sudah dipisah, jadi menambahkannya nanti cukup dengan blok `.dark`.

### 2.2 Tipografi

Dua keluarga huruf, dimuat lewat `next/font/google` di `src/app/layout.tsx`. `next/font` mengunduh file huruf saat build dan menyajikannya dari server sendiri, sehingga tidak ada permintaan ke Google saat runtime.

| Peran | Font | Alasan |
| --- | --- | --- |
| Judul dan angka besar | Plus Jakarta Sans (600, 700) | Karakter lebih hangat daripada font sistem, membedakan judul dari isi tanpa menambah warna |
| Isi, tabel, form | Inter (400, 500, 600) | Sangat terbaca pada ukuran kecil, mendukung angka tabular |

```tsx
// src/app/layout.tsx
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
```

```css
/* globals.css: pemetaan keluarga huruf */
@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-jakarta), var(--font-inter), sans-serif;
}
```

Skala ukuran (jangan keluar dari skala ini):

| Pemakaian | Kelas Tailwind | Catatan |
| --- | --- | --- |
| Judul halaman | `font-heading text-2xl font-bold tracking-tight` | Satu per halaman |
| Judul kartu atau seksi | `font-heading text-base font-semibold` | |
| Angka KPI | `font-heading text-3xl font-bold tabular-nums` | `tabular-nums` wajib agar angka sejajar |
| Isi, form, tabel | `text-sm` (14 px) | Standar aplikasi data |
| Label dan metadata | `text-xs text-muted-foreground` | Jangan di bawah 12 px |

---

## 3. Layout dan jarak

- **Satuan dasar 4 px.** Pakai skala Tailwind (`p-2`, `p-4`, `p-6`, `gap-4`, `gap-6`). Tidak ada nilai di luar skala.
- **Radius:** kartu dan dialog `rounded-xl`, input dan tombol `rounded-md`, badge `rounded-full`.
- **Bayangan:** kartu memakai `shadow-sm` plus `border`. Bayangan lebih besar hanya untuk popover dan dialog.
- **Kerangka aplikasi** (komponen `AppShell`, `src/components/layout/app-shell.tsx`):

| Bagian | Ukuran |
| --- | --- |
| Sidebar | 256 px, bisa diciutkan menjadi 72 px (ikon saja). Di bawah `md` menjadi drawer. |
| Topbar | Tinggi 64 px: judul halaman di kiri, pemilih periode atau aksi di kanan, menu pengguna paling kanan |
| Konten | `max-w-7xl` (1280 px), padding `px-4 md:px-6 lg:px-8`, jarak antar blok `gap-6` |

- **Grid dashboard:** 12 kolom di `lg`, 6 di `md`, 1 di bawahnya. Kartu tidak pernah lebih sempit dari 280 px.

Menu sidebar per role (item yang tidak diizinkan **tidak ditampilkan**, bukan dinonaktifkan; otorisasi sebenarnya tetap di backend):

| Item | Pegawai | Pimpinan | Admin |
| --- | --- | --- | --- |
| Dashboard | Ya | Ya | Ya |
| Kegiatan | Ya | Ya (baca) | Ya |
| Rekap dan ekspor | Ya | Ya | Ya |
| Master data | Tidak | Tidak | Ya |
| Akun | Tidak | Tidak | Ya |
| Audit log | Tidak | Tidak | Ya |

---

## 4. Komponen

Dasar: **shadcn/ui** (disalin ke `src/components/ui/`, jangan diubah kecuali lewat varian). Komponen buatan sendiri yang dipakai di banyak halaman ada di `src/components/shared/`.

### 4.1 Komponen shadcn yang dipakai

`button`, `input`, `textarea`, `select`, `calendar` + `popover` (pemilih tanggal), `table`, `badge`, `card`, `dialog`, `alert-dialog`, `tabs`, `skeleton`, `sonner` (toast), `dropdown-menu`, `sheet` (drawer mobile), `pagination`, `chart` (berbasis Recharts), `form` (react-hook-form + Zod).

### 4.2 Komponen buatan sendiri

| Komponen | File | Fungsi |
| --- | --- | --- |
| `AppShell` | `components/layout/app-shell.tsx` | Sidebar, topbar, area konten |
| `PageHeader` | `components/shared/page-header.tsx` | Judul, deskripsi, dan slot aksi di atas konten |
| `StatCard` | `components/shared/stat-card.tsx` | Angka KPI dengan ikon, label, dan keterangan tren |
| `StatusBadge` | `components/shared/status-badge.tsx` | Status pelaksanaan (FR-05) |
| `DataTable` | `components/shared/data-table.tsx` | Tabel dengan paginasi, pengurutan, dan keadaan kosong |
| `FilterBar` | `components/shared/filter-bar.tsx` | Baris filter periode, bidang, jenis, status, dan pencarian |
| `EmptyState` | `components/shared/empty-state.tsx` | Ikon, judul, penjelasan, dan satu aksi |
| `ConfirmDialog` | `components/shared/confirm-dialog.tsx` | Konfirmasi hapus dan batalkan |
| `MapPicker` | `components/shared/map-picker.tsx` | Memilih titik lokasi di peta (FR-07) |
| `MapOverview` | `components/shared/map-overview.tsx` | Peta sebaran kegiatan di dashboard |
| `FileDropzone` | `components/shared/file-dropzone.tsx` | Unggah dokumentasi dengan pratinjau dan progres (FR-06) |

### 4.3 StatusBadge

Status pelaksanaan dihitung di backend (PRD bagian 7) dan datang sebagai field `status_pelaksanaan` pada respons API. **UI tidak menghitung status sendiri.**

```tsx
// src/components/shared/status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusPelaksanaan = "akan_datang" | "berlangsung" | "selesai" | "dibatalkan";

// Label dan kelas warna per status. Teks selalu tampil, jadi arti status tidak bergantung pada warna.
const KONFIGURASI: Record<StatusPelaksanaan, { label: string; kelas: string }> = {
  akan_datang: {
    label: "Akan datang",
    kelas: "bg-status-akan-datang text-status-akan-datang-foreground",
  },
  berlangsung: {
    label: "Berlangsung",
    kelas: "bg-status-berlangsung text-status-berlangsung-foreground",
  },
  selesai: {
    label: "Selesai",
    kelas: "bg-status-selesai text-status-selesai-foreground",
  },
  dibatalkan: {
    label: "Dibatalkan",
    kelas: "bg-status-dibatalkan text-status-dibatalkan-foreground",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusPelaksanaan;
  className?: string;
}) {
  const { label, kelas } = KONFIGURASI[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-transparent font-medium", kelas, className)}>
      {/* Titik penanda dekoratif; arti status ada pada teks di sebelahnya */}
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
```

Cara memanggilnya, misalnya di kolom tabel kegiatan:

```tsx
// src/features/kegiatan/components/kegiatan-columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatTanggal } from "@/lib/format";
import type { Kegiatan } from "@/features/kegiatan/types";

export const kolomKegiatan: ColumnDef<Kegiatan>[] = [
  { accessorKey: "judul", header: "Kegiatan" },
  { accessorKey: "tgl_mulai", header: "Tanggal", cell: ({ row }) => formatTanggal(row.original.tgl_mulai) },
  { accessorKey: "status_pelaksanaan", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status_pelaksanaan} /> },
];
```

Hubungannya: `kolomKegiatan` diberikan ke `DataTable` di `KegiatanListPage`; data berasal dari hook `useKegiatan` (TanStack Query) yang memanggil `GET /api/kegiatan`.

### 4.4 Tombol

| Varian | Dipakai untuk | Aturan |
| --- | --- | --- |
| `default` (biru) | Aksi utama | **Satu per layar.** Contoh: "Simpan kegiatan", "Tambah kegiatan" |
| `outline` | Aksi sekunder | Contoh: "Ekspor", "Batal" |
| `ghost` | Aksi di baris tabel dan toolbar | Ikon plus `aria-label` |
| `destructive` | Hapus dan batalkan kegiatan | Selalu lewat `ConfirmDialog` |

Tinggi tombol 40 px (`h-10`) di desktop, 44 px di layar sentuh. Saat menyimpan, tombol menampilkan spinner dan dinonaktifkan agar tidak terkirim dua kali.

### 4.5 Formulir

- Label di atas input, selalu terlihat (tanpa placeholder sebagai pengganti label).
- Kolom wajib ditandai tanda bintang merah dan `aria-required`.
- Validasi dengan Zod, pesan error di bawah kolom, dalam Bahasa Indonesia: "Judul wajib diisi", "Tanggal selesai tidak boleh sebelum tanggal mulai".
- Validasi klien hanya kemudahan; backend tetap memvalidasi (NFR-02). Error 422 dari server dipetakan ke kolom yang sama.
- Satu kolom di ponsel, dua kolom di `md` ke atas. Tombol "Simpan" dan "Batal" menempel di bagian bawah halaman di ponsel.

---

## 5. Halaman

Setiap halaman memakai `AppShell` dan `PageHeader`. Kotak ASCII di bawah menunjukkan susunan, bukan ukuran piksel.

### 5.1 Login

Kartu di tengah layar dengan garis emas lambang kota di tepi atas (`border-t-chart-3`), diulang di semua kartu publik. Lambang dinas dan nama sistem tampil satu kali di dalam kartu; kaki halaman hanya nama instansi. Judul "Masuk", kolom email (email pribadi adalah satu-satunya identitas login; NIP tidak dipakai untuk masuk), kata sandi (dengan tombol tampilkan dan tautan "Lupa kata sandi?" sejajar kanan pada labelnya), tombol "Masuk ke aplikasi", dan kalimat "Belum punya akun? Minta akun" dengan "Minta akun" sebagai tautan ke formulir permintaan akun. Setiap keadaan halaman publik (formulir, berhasil, tautan tidak berlaku) menulis satu judul `h1`-nya sendiri; fokus otomatis ke kolom pertama hanya pada perangkat dengan mouse. Setelah penguncian akun (NFR-01), tampilkan pesan "Terlalu banyak percobaan. Coba lagi dalam 15 menit." beserta hitung mundur. Tidak ada tautan pendaftaran (akun dibuat admin).

### 5.2 Dashboard pimpinan (FR-09)

Inilah halaman yang paling perlu terasa hidup. Ia dibangun dari lima jenis visual berbeda, bukan lima kartu yang sama.

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ SIDEBAR      │ Dashboard                          [Periode: Okt 2026  v]  │
│ (gelap)      ├────────────────────────────────────────────────────────────┤
│              │ [Total bulan ini] [Berlangsung] [Akan datang] [Tanpa dok.] │ 4 StatCard
│ Dashboard    ├─────────────────────────────────┬──────────────────────────┤
│ Kegiatan     │ Kegiatan per bidang per bulan   │ Sebaran jenis kegiatan   │
│ Rekap        │ (batang bertumpuk, 6 bulan)     │ (batang horizontal)      │
│              ├─────────────────────────────────┼──────────────────────────┤
│              │ Peta sebaran kegiatan           │ Perlu perhatian          │
│              │ (marker berklaster)             │ Selesai tanpa dokumentasi│
│              ├─────────────────────────────────┴──────────────────────────┤
│              │ Kegiatan akan datang (5 baris)                [Lihat semua]│
└──────────────┴────────────────────────────────────────────────────────────┘
```

| Blok | Isi | Catatan |
| --- | --- | --- |
| 4 `StatCard` | Total kegiatan periode, sedang berlangsung, akan datang, selesai tanpa dokumentasi | Ikon dalam lingkaran berwarna lembut (`bg-secondary`), angka `tabular-nums`, selisih dibanding periode sebelumnya bila ada |
| Batang bertumpuk | Jumlah kegiatan per bidang per bulan | Satu warna per unit induk (bidang dan kelompok jabatan fungsional, serta Sekretariat bila admin menambahkannya) dari `chart-1..6`; legenda terlihat; tooltip menampilkan angka pasti |
| Batang horizontal | Sebaran jenis kegiatan | Diurutkan dari terbanyak, label di sisi kiri. Hindari donut: sulit dibandingkan |
| `MapOverview` | Titik semua kegiatan yang punya koordinat | Klik marker membuka kartu mini: judul, tanggal, status, tautan detail |
| Perlu perhatian | Daftar kegiatan selesai tanpa dokumentasi | Ini penanda utama kualitas data karena tidak ada persetujuan (PRD bagian 12). Tiap baris punya tautan ke detail |
| Tabel akan datang | 5 kegiatan terdekat | Memakai `DataTable` versi ringkas tanpa paginasi |

Pegawai melihat dashboard yang sama untuk seluruh dinas (keputusan PRD), ditambah tombol "Tambah kegiatan" di `PageHeader` dan blok "Kegiatan saya" menggantikan "Perlu perhatian" bila ada yang belum berdokumentasi.

### 5.3 Daftar kegiatan (FR-04, FR-08)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Kegiatan                                              [ + Tambah kegiatan ]│
├────────────────────────────────────────────────────────────────────────────┤
│ [Cari judul...] [Periode v] [Bidang v] [Jenis v] [Status v] [Atur ulang]│
├────────────────────────────────────────────────────────────────────────────┤
│ Kegiatan            Bidang    Tanggal        Lokasi       Status    ⋯  │
│ Rapat koordinasi    E-Government  14 Okt 2026    Palembang    Berlangsung   │
│ ...                                                                         │
├────────────────────────────────────────────────────────────────────────────┤
│ 1–20 dari 134                                         [<] 1 2 3 ... [>]    │
└────────────────────────────────────────────────────────────────────────────┘
```

- Filter disimpan di query string URL (`?unit=2&status=selesai`) agar bisa dibagikan dan bertahan saat muat ulang. Hook `useKegiatanFilter` membaca dan menulisnya; `useKegiatan` memakainya sebagai kunci query.
- Baris bisa diklik menuju detail. Menu `⋯` (hanya muncul bila pengguna berhak, yaitu pemilik atau admin) berisi Ubah, Batalkan, Hapus.
- Di bawah `md`, tabel berubah menjadi daftar kartu: judul, status, tanggal, bidang.
- Tombol "Tambah kegiatan" tidak tampil untuk pimpinan.

### 5.4 Form kegiatan (FR-04 sampai FR-07)

Satu halaman dengan tiga seksi berurutan, bukan wizard (alurnya pendek):

1. **Informasi:** judul, jenis, uraian, penanggung jawab, jumlah peserta, hasil.
2. **Waktu dan lokasi:** tanggal mulai dan selesai (pemilih tanggal), nama lokasi, dan `MapPicker`.
3. **Dokumentasi (opsional):** `FileDropzone`.

Bila server membalas 409 (kegiatan sudah diubah orang lain), tampilkan `AlertDialog`: "Kegiatan ini baru saja diubah orang lain. Muat ulang untuk melihat versi terbaru." dengan tombol "Muat ulang". Perubahan pengguna tidak ditimpa diam-diam.

### 5.5 Detail kegiatan

Header: judul besar, `StatusBadge`, dan aksi (Ubah, Batalkan, Hapus) untuk yang berhak. Isi dua kolom di `lg`:

- **Kiri:** informasi (grid label dan nilai), uraian, hasil, galeri dokumentasi.
- **Kanan:** peta mini dengan marker, kartu penanggung jawab dan bidang, keterangan "Dibuat oleh X pada tanggal, terakhir diubah oleh Y".

Galeri berupa grid thumbnail 3 kolom; klik membuka dialog pratinjau. PDF tampil sebagai kartu dengan ikon dan nama berkas. Tidak ada dokumentasi: `EmptyState` dengan tombol "Unggah dokumentasi" bagi yang berhak.

### 5.6 Rekap dan ekspor (FR-08, FR-10)

`FilterBar` yang sama dengan daftar kegiatan, lalu tabel rekap dengan baris total. Tombol di `PageHeader`: "Ekspor PDF". Selama berkas dibuat, tombol menampilkan spinner dan teks "Menyiapkan berkas...". Ekspor memakai filter yang sedang aktif, dan ringkasannya ditampilkan di atas tombol ("Ekspor 134 kegiatan, Okt 2026, semua bidang").

### 5.7 Admin

Master data (bidang, seksi, pegawai, jenis kegiatan) dan akun memakai pola yang sama: `DataTable` dan dialog untuk tambah atau ubah. Nonaktifkan lebih diutamakan daripada hapus. Audit log: `DataTable` read-only dengan filter aktor, aksi, entitas, dan rentang waktu; baris dapat dibuka untuk melihat nilai sebelum dan sesudah (JSON ditampilkan terformat, kunci sensitif tidak pernah ada).

---

## 6. Peta (FR-07)

Pustaka: **MapLibre GL** 5 (`components/shared/peta-dasar.tsx`), peta vektor **OpenFreeMap** berbasis data OpenStreetMap: gaya positron (terang) dan dark (gelap), kemiringan 2D/3D, gedung 3D mulai zoom 14, kluster titik, dan saring status. Atribusi OSM wajib tetap bisa dibuka.

Next.js merender di server, sedangkan MapLibre membutuhkan `window` dan WebGL. Karena itu komponen peta **wajib dimuat dinamis tanpa SSR**:

```tsx
// src/components/shared/map-picker.tsx  (pembungkus; komponen peta sebenarnya di map-picker-inner.tsx)
"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// MapLibre GL memakai window dan WebGL sehingga tidak boleh dirender di server
export const MapPicker = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});
```

Aturan perilaku `MapPicker`:

| Hal | Aturan |
| --- | --- |
| Pusat awal | Palembang (`-2.9761, 104.7754`), zoom 12; bila kegiatan sudah punya koordinat, pusat di titik itu zoom 15 |
| Memilih titik | Klik peta menaruh marker; marker bisa digeser |
| Alternatif | Tombol "Gunakan lokasi saya" (izin lokasi peramban) dan kolom lintang dan bujur manual untuk koneksi buruk atau peta gagal dimuat |
| Nilai | `lat` dan `lng` (6 desimal) disimpan terpisah dari `lokasi_nama` (teks bebas). Keduanya boleh kosong |
| Atribusi | Teks "© OpenStreetMap contributors" wajib tampil di pojok peta, jangan disembunyikan |
| Ukuran | Tinggi 288 px (`h-72`) di form, 360 px di dashboard; lebar penuh kartu |
| Aksesibilitas | Peta bukan satu-satunya cara mengisi lokasi; kolom nama lokasi dan koordinat manual tetap tersedia |

Catatan keputusan: tile OSM diambil dari server luar. Itu tidak melanggar kewajiban data di Indonesia (PP 71/2019 mengatur penyimpanan data, bukan permintaan tile), tetapi **server dinas harus bisa keluar ke internet**, dan kebijakan penggunaan tile OSM tidak cocok untuk lalu lintas besar. Untuk pemakaian internal puluhan orang ini aman; bila dinas membatasi akses keluar, siapkan tile server sendiri atau pakai input koordinat manual saja (tanya O4 di PRD). Pencarian alamat (geocoding) sengaja tidak dibuat di versi pertama agar tidak menambah ketergantungan luar.

---

## 7. Keadaan antarmuka

Setiap layar yang mengambil data wajib menangani empat keadaan. Jangan ada layar kosong putih.

| Keadaan | Tampilan |
| --- | --- |
| Memuat | `Skeleton` dengan bentuk yang sama dengan konten (baris tabel, kartu KPI). Bukan spinner di tengah halaman |
| Kosong | `EmptyState`: ikon, satu kalimat penjelasan, satu aksi. Contoh: "Belum ada kegiatan pada periode ini." dengan tombol "Atur ulang filter" |
| Error | Kartu error dengan pesan manusiawi dan tombol "Coba lagi" (memicu `refetch`). Detail teknis tidak ditampilkan |
| Berhasil | Toast `sonner` di kanan atas selama 4 detik: "Kegiatan disimpan" |

Pemetaan error API ke pesan:

| Status | Pesan ke pengguna |
| --- | --- |
| 401 | Sesi berakhir, arahkan ke login dengan `?next=` |
| 403 | "Anda tidak memiliki akses untuk tindakan ini." |
| 404 | Halaman "Tidak ditemukan" dengan tautan kembali |
| 409 | `AlertDialog` muat ulang (bagian 5.4) |
| 413, 415 | Pesan di bawah dropzone: "Ukuran maksimal 20 MB" atau "Hanya JPEG, PNG, WebP, atau PDF" |
| 422 | Pesan per kolom pada form |
| 429 | "Terlalu banyak permintaan. Coba lagi sebentar lagi." |
| 5xx | Kartu error umum dengan "Coba lagi" |

Tindakan merusak (hapus, batalkan) **selalu** lewat `ConfirmDialog`, yang menyebut nama objek ("Hapus kegiatan 'Rapat koordinasi'?") dan memakai tombol `destructive`. Pembatalan kegiatan meminta kolom alasan wajib (FR-05).

Unggahan: `FileDropzone` menampilkan pratinjau, nama, ukuran, dan bilah progres per berkas; berkas ditolak ditandai merah dengan alasannya tanpa menghentikan berkas lain. Foto dikompresi di klien (maksimum sisi 1920 px) sebelum diunggah.

---

## 8. Gerak

Gerak dipakai untuk tiga hal saja: **memberi umpan balik** (aksi berhasil, tombol ditekan), **menjelaskan perubahan** (dari mana elemen datang, apa yang berubah), dan **memberi kesan halus** pada pemuatan. Gerak tidak pernah dipakai sebagai hiasan. Aplikasi ini dipakai berulang oleh pegawai dan dibaca pimpinan, jadi yang terasa cepat dan tenang lebih baik daripada yang mencolok.

### 8.1 Token

Lokasi: `src/app/globals.css`, di samping token warna.

```css
/* Kurva dan durasi gerak. Dipakai lewat kelas Tailwind: ease-out-expo, ease-in-out-smooth, duration-150/200/300. */
@theme inline {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);      /* masuk: cepat di awal, mendarat halus */
  --ease-in-out-smooth: cubic-bezier(0.65, 0, 0.35, 1); /* perpindahan dua posisi */
}

/* Menyorot baris yang baru disimpan, lalu memudar */
@keyframes sorot-baris {
  from { background-color: var(--accent); }
  to   { background-color: transparent; }
}

@layer utilities {
  .animate-sorot { animation: sorot-baris 1.2s var(--ease-out-expo) 1; }
}

/* Pengguna yang mematikan animasi di sistem operasi tidak boleh dipaksa melihatnya */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Animasi masuk dan keluar bawaan shadcn (`animate-in`, `fade-in`, `slide-in-from-*`) berasal dari paket `tw-animate-css` (Tailwind v4) atau `tailwindcss-animate` (Tailwind v3). Paket itu sudah ikut saat shadcn dipasang, jadi **tidak ada pustaka gerak baru** yang perlu ditambah.

### 8.2 Daftar gerak

| Elemen | Efek | Durasi | Catatan |
| --- | --- | --- | --- |
| Hover dan fokus (tombol, baris tabel, item menu) | Perubahan warna latar atau border | 120 ms | Hanya `transition-colors` |
| Tombol ditekan | `scale-[0.98]` | 100 ms | Memberi rasa "terklik" |
| Kartu yang bisa diklik | Naik 2 px dan bayangan membesar | 150 ms | Hanya kartu yang benar-benar tautan. Kartu statis tidak bergerak |
| Dialog dan AlertDialog | Muncul dengan fade dan skala 0.96 ke 1; overlay fade | 200 ms masuk, 150 ms keluar | Keluar lebih cepat daripada masuk. Bawaan shadcn |
| Menu, popover, select | Fade dan geser 4 px dari pemicu | 150 ms | Bawaan shadcn |
| Sheet (sidebar di ponsel) | Geser dari tepi | 300 ms | Bawaan shadcn |
| Sidebar diciutkan | Lebar 256 ke 72 px, label memudar | 200 ms | Satu-satunya animasi yang mengubah lebar |
| Toast | Geser masuk dari kanan dan fade | 250 ms | Bawaan `sonner` |
| Pindah halaman | Konten fade dan naik 8 px | 200 ms | Hanya animasi masuk, tanpa animasi keluar (lihat 8.3) |
| Skeleton | Berdenyut (`animate-pulse`); saat data tiba, konten fade-in | 150 ms | Skeleton memuat berbentuk sama dengan konten |
| Angka KPI | Menghitung naik dari 0 ke nilai akhir | 600 ms | Sekali saat pertama tampil, tidak diulang saat data diperbarui (lihat 8.4) |
| Grafik | Batang tumbuh dari dasar | 400 ms | Sekali saat pertama muncul; saat filter diganti, tanpa animasi agar tidak melompat |
| Daftar di dashboard ("Perlu perhatian", "Akan datang") | Baris masuk berurutan, jeda 30 ms antar baris | 200 ms | Maksimal 8 baris pertama |
| Baris yang baru disimpan | Latar `accent` memudar | 1,2 detik | Menunjukkan "ini yang baru berubah" setelah simpan atau ubah |
| Badge status berubah | Cross-fade | 150 ms | |
| Pesan error form | Fade-in | 150 ms | Tidak ada efek getar |
| Bilah progres unggahan | Lebar bertransisi | 200 ms linear | |
| Peta | `flyTo` saat memilih kegiatan dari daftar | 800 ms | Dengan reduced motion jadi `setView` tanpa animasi |

### 8.3 Pindah halaman

Di App Router, `template.tsx` dibuat ulang pada setiap navigasi (berbeda dengan `layout.tsx` yang dipertahankan), sehingga cocok untuk animasi masuk:

```tsx
// src/app/(app)/template.tsx
// Dibuat ulang setiap pindah halaman, jadi animasi masuk berjalan di setiap navigasi.
// Sengaja tanpa animasi keluar: animasi keluar menahan navigasi dan terasa lambat.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out-expo">{children}</div>;
}
```

Hubungannya dengan pemuatan data: `loading.tsx` menampilkan skeleton selama data diambil, lalu halaman yang sudah terisi masuk dengan animasi ini.

### 8.4 Angka KPI menghitung naik

Cukup dengan `requestAnimationFrame`, tanpa pustaka:

```tsx
// src/hooks/use-count-up.ts
"use client";
import { useEffect, useRef, useState } from "react";

// Menghitung naik dari 0 ke nilai akhir hanya sekali saat pertama tampil.
// Catatan: pada mode pengembangan React StrictMode menjalankan efek dua kali, sehingga animasi tidak terlihat di sana.
export function useCountUp(target: number, durasi = 600) {
  const [nilai, setNilai] = useState(0);
  const sudahJalan = useRef(false);

  useEffect(() => {
    // Hormati preferensi pengguna, dan jangan ulangi animasi saat data diperbarui
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurangiGerak || sudahJalan.current) {
      setNilai(target);
      return;
    }
    sudahJalan.current = true;

    const mulai = performance.now();
    let frame = 0;
    const langkah = (sekarang: number) => {
      const t = Math.min((sekarang - mulai) / durasi, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      setNilai(Math.round(target * easeOut));
      if (t < 1) frame = requestAnimationFrame(langkah);
    };
    frame = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(frame);
  }, [target, durasi]);

  return nilai;
}
```

Cara memanggilnya di `StatCard`. Pembaca layar hanya membaca nilai akhir, bukan angka yang sedang berhitung:

```tsx
// src/components/shared/stat-card.tsx (bagian angka)
const tampil = useCountUp(nilai);

<p className="font-heading text-3xl font-bold tabular-nums">
  <span className="sr-only">{formatAngka(nilai)}</span>
  <span aria-hidden>{formatAngka(tampil)}</span>
</p>
```

Menyorot baris yang baru disimpan: setelah mutasi berhasil, simpan `id` baris di state (atau di `useMutation` `onSuccess`) lalu beri kelas `animate-sorot` pada baris itu. Hapus kelas setelah 1,2 detik.

### 8.5 Aturan

1. **Hanya animasikan `transform` dan `opacity`** (murah bagi peramban). Pengecualian tunggal: lebar sidebar.
2. Durasi UI paling lama 300 ms. Pengecualian: hitung naik KPI (600 ms), grafik (400 ms), sorotan baris (1,2 detik), `flyTo` peta (800 ms).
3. Animasi masuk lebih lambat daripada animasi keluar.
4. Animasi mulai segera setelah pemicu, tanpa jeda awal (kecuali jeda stagger).
5. **Tidak boleh dianimasikan:** isi tabel data (dibaca dan dipindai, bukan ditonton), hasil filter, angka yang berubah cepat, dan apa pun yang menunda informasi penting lebih dari 300 ms.
6. **Dilarang:** gerak berulang tanpa henti, parallax, animasi otomatis, efek memantul (bounce) atau overshoot. Karakter aplikasi adalah tenang dan institusional.
7. Informasi tidak boleh hanya tersampaikan lewat gerak: keadaan akhir selalu terbaca penuh tanpa animasi.
8. `prefers-reduced-motion` ditangani di dua tempat: CSS global (8.1) dan logika JS (hitung naik berhenti, grafik `isAnimationActive={false}`, peta `setView`).
9. Jangan memakai View Transitions API di versi pertama. Dukungannya di Next.js masih eksperimental dan manfaatnya kecil dibanding `template.tsx`.

---

## 9. Aksesibilitas

Target WCAG 2.1 AA.

- Kontras teks minimal 4.5:1 dan komponen UI 3:1. Pasangan warna di bagian 2.1 sudah dipilih memenuhi ini; **jangan mengganti nilai tanpa memeriksa ulang**.
- Status, validasi, dan grafik tidak pernah bergantung pada warna saja: status punya label teks, error punya ikon dan teks, seri grafik punya legenda dan nilai pada tooltip.
- Semua elemen interaktif bisa dicapai lewat keyboard dengan urutan fokus logis. Cincin fokus: `focus-visible:ring-2 ring-ring ring-offset-2`. Jangan pernah `outline-none` tanpa pengganti.
- Tombol berikon tanpa teks wajib punya `aria-label`.
- Tabel memakai elemen semantik (`th` dengan `scope`); grafik punya `aria-label` ringkasan, dan data yang sama tersedia di tabel atau tooltip.
- Area sentuh minimal 44 x 44 px di ponsel.
- Dialog menjebak fokus dan menutup dengan `Esc` (perilaku bawaan shadcn, jangan dimatikan).
- `<html lang="id">`.

---

## 10. Responsif

| Breakpoint | Perilaku |
| --- | --- |
| < 768 px (`md`) | Sidebar menjadi `Sheet` dari kiri dengan tombol menu di topbar. Tabel menjadi daftar kartu. Form satu kolom. Grid dashboard satu kolom |
| 768–1023 px | Sidebar diciutkan ke ikon. Grid dashboard dua kolom |
| ≥ 1024 px (`lg`) | Sidebar penuh, grid dashboard 12 kolom |

Uji wajib di lebar 375 px untuk alur login, tambah kegiatan, dan unggah dokumentasi.

---

## 11. Bahasa dan format

- Seluruh teks UI dalam Bahasa Indonesia, nada sopan dan lugas. Kalimat tombol berupa kata kerja: "Simpan kegiatan", "Ekspor PDF".
- Istilah baku di UI: "Kegiatan", "Bidang" (struktur tertinggi, dulu disebut "Bidang") dan "Sub bidang" (di bawah bidang), "Penanggung jawab", "Dokumentasi", "Rekap". Sekretariat dan sub bidang ditambahkan admin sendiri di Master data.
- Tanggal "14 Okt 2026", rentang "14–16 Okt 2026", waktu 24 jam dengan "WIB". Angka memakai pemisah ribuan titik (`id-ID`).
- Semua format lewat satu berkas agar konsisten:

```ts
// src/lib/format.ts
// Zona waktu dikunci ke Asia/Jakarta supaya tampilan sama di server dan di peramban.
const ZONA = "Asia/Jakarta";

export function formatTanggal(nilai: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(nilai));
}

export function formatAngka(nilai: number): string {
  return new Intl.NumberFormat("id-ID").format(nilai);
}
```

Contoh teks keadaan kosong: "Belum ada kegiatan." / "Coba ubah filter atau tambahkan kegiatan baru."

---

## 12. Struktur berkas

Bila `AGENTS.md` sudah menetapkan struktur, ikuti itu. Bila belum, pakai ini:

```
src/
  app/
    globals.css                  # token (bagian 2)
    layout.tsx                   # font, <html lang="id">
    (auth)/login/page.tsx
    (app)/
      layout.tsx                 # membungkus halaman dengan AppShell
      dashboard/page.tsx
      kegiatan/page.tsx          # daftar
      kegiatan/baru/page.tsx
      kegiatan/[id]/page.tsx     # detail
      kegiatan/[id]/ubah/page.tsx
      rekap/page.tsx
      admin/...                  # hanya admin
  components/
    ui/                          # shadcn, jangan diubah langsung
    layout/app-shell.tsx
    shared/                      # komponen bagian 4.2
  features/
    kegiatan/
      components/                # kolom tabel, form, galeri
      hooks/                     # useKegiatan, useKegiatanFilter (TanStack Query)
      types.ts
  lib/
    format.ts
    utils.ts                     # cn()
```

Hubungan antar lapisan: halaman di `app/` hanya merangkai komponen dari `features/` dan `components/`; komponen tidak memanggil `fetch` langsung, melainkan lewat hook di `features/*/hooks`; hook memanggil `/api`.

---

## 13. Aturan keras untuk agent

1. Jangan menulis hex, `rgb()`, atau nilai px di luar skala. Pakai token dan kelas Tailwind.
2. Jangan membuat badge, tabel, atau dialog konfirmasi baru bila `StatusBadge`, `DataTable`, atau `ConfirmDialog` bisa dipakai atau diperluas.
3. Jangan menambah pustaka UI baru (komponen, ikon, grafik) tanpa alasan tertulis. Ikon hanya dari `lucide-react`.
4. Jangan menaruh logika otorisasi di komponen. Menyembunyikan tombol hanya kemudahan; backend yang menolak (NFR-03).
5. Jangan menghitung status pelaksanaan di klien.
6. Setiap layar pengambilan data wajib punya keadaan memuat, kosong, dan error.
7. Setiap form wajib validasi Zod dan memetakan error 422 server ke kolom.
8. Komentar kode dalam Bahasa Indonesia dan menjelaskan alasan, bukan mengulang kode (sesuai `AGENTS.md`).
9. Jangan menampilkan data sensitif di UI: kata sandi, token, atau kunci rahasia pada audit log.
10. Bila ragu antara dua pola, pilih yang sudah ada di halaman lain.
11. Gerak mengikuti bagian 8: hanya `transform` dan `opacity`, durasi sesuai tabel, tidak ada gerak berulang, dan selalu menghormati `prefers-reduced-motion`. Jangan menambah pustaka animasi.

---

## 14. Daftar periksa penerimaan UI

| Halaman | Lulus bila |
| --- | --- |
| Login | Akun terkunci menampilkan pesan dan hitung mundur; tidak ada tautan daftar |
| Dashboard | 4 KPI, grafik batang bertumpuk, batang horizontal, peta, dan daftar "Perlu perhatian" tampil; angka sama dengan hitungan manual pada data seed (FR-09) |
| Daftar kegiatan | Filter tersimpan di URL; menu aksi hanya muncul untuk pemilik dan admin; di ponsel menjadi kartu |
| Form kegiatan | Dapat diselesaikan di layar 375 px; 422 muncul per kolom; 409 menampilkan dialog muat ulang |
| Peta | Klik menaruh marker; koordinat manual berfungsi; atribusi OSM terlihat; dimuat tanpa SSR tanpa error hidrasi |
| Dokumentasi | Berkas tidak valid ditolak dengan pesan jelas tanpa menghentikan berkas lain; progres tampil |
| Ekspor | Tombol menampilkan keadaan menyiapkan; berkas sesuai filter aktif |
| Gerak | Pindah halaman, dialog, dan toast beranimasi sesuai tabel 8.2; KPI menghitung naik sekali; dengan `prefers-reduced-motion` aktif, semua animasi berhenti dan angka langsung tampil |
| Aksesibilitas | Seluruh alur utama bisa dilalui dengan keyboard; tidak ada pasangan warna di bawah AA; status terbaca tanpa warna |
