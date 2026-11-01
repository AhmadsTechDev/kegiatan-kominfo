// =============================================================================
// KLIEN HTTP DAN PENANGAN GALAT API
// =============================================================================
// Gunanya: Menjadi klien HTTP tunggal (berbasis Axios) untuk seluruh komunikasi
// frontend ke backend, dilengkapi interceptor penanganan error dan sesi kedaluwarsa.
//
// Isi berkas:
//   - ApiError   : kelas galat kustom penyimpan status HTTP, kode, pesan, dan detail.
//   - apiClient  : instance Axios terkonfigurasi dengan baseURL "/api" dan kredensial cookie.
//   - bacaBody   : helper pembaca respons error yang terbungkus Blob (misal saat unduh berkas).
//
// Cara kerja:
//   1. Permintaan HTTP dikirim dengan kredensial cookie sesi aktif (withCredentials: true).
//   2. Interceptor respons memeriksa kode status HTTP saat permintaan gagal.
//   3. Status 401 mengalihkan layar via window.location.assign ke "/login?sesi=berakhir"
//      serta menyematkan parameter ?next= untuk mengembalikan pengguna setelah login.
//   4. Status 413, 415, dan 422 meneruskan pesan validasi asli dari backend, sedangkan
//      status lain dipetakan ke pesan ramah bahasa Indonesia (DESIGN.md bagian 7).
//
// Catatan penting:
//   - Mengikuti standarisasi penanganan error PRD bagian 9 dan NFR terkait keamanan.
//   - Pengalihan 401 sengaja memicu reload penuh untuk membersihkan seluruh state sesi lama.
//
// Dipakai oleh: Seluruh fungsi pemanggil API dan data fetcher TanStack Query di frontend.
// =============================================================================

import axios, { AxiosError } from "axios";

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: { field?: string; message: string }[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ApiErrorBody["details"],
  ) {
    super(message);
  }
}

const PESAN_STATUS: Record<number, string> = {
  403: "Anda tidak memiliki akses untuk tindakan ini.",
  404: "Data tidak ditemukan.",
  429: "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
};
const PESAN_UMUM = "Terjadi kesalahan. Coba lagi beberapa saat.";

async function bacaBody(data: ApiErrorBody | Blob | undefined): Promise<ApiErrorBody | undefined> {
  if (!(data instanceof Blob)) return data;
  try {
    return JSON.parse(await data.text()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

export const apiClient = axios.create({ baseURL: "/api", withCredentials: true });

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody | Blob>) => {
    const status = error.response?.status ?? 0;
    const body = await bacaBody(error.response?.data);

    if (status === 401 && typeof window !== "undefined") {
      const { pathname, search } = window.location;
      const next = (pathname === "/" || pathname === "/dashboard") && !search ? "" : `&next=${encodeURIComponent(pathname + search)}`;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?sesi=berakhir${next}`);
    }

    const pesan = [413, 415, 422].includes(status)
      ? (body?.message ?? "Data yang dikirim tidak valid.")
      : (PESAN_STATUS[status] ?? PESAN_UMUM);
    return Promise.reject(new ApiError(status, body?.code ?? "UNKNOWN", pesan, body?.details));
  },
);
