import axios, { AxiosError } from "axios";

/**
 * Klien HTTP (Axios) ke backend, dengan penanganan galat dan sesi kedaluwarsa
 */

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: { field?: string; message: string }[];
};

/**
 * Galat dari backend diubah menjadi ApiError yang membawa status, kode, dan details per kolom,
 * sehingga komponen bisa menampilkan pesan di bawah kolom form yang salah.
 */
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

/**
 * Untuk unduhan berkas (responseType "blob"), isi galat juga datang sebagai Blob, jadi perlu dibaca lalu diubah dari JSON dulu.
 */
async function bacaBody(data: ApiErrorBody | Blob | undefined): Promise<ApiErrorBody | undefined> {
  if (!(data instanceof Blob)) return data;
  try {
    return JSON.parse(await data.text()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

/**
 * KONSEP axios instance: objek pemanggil HTTP dengan pengaturan bawaan. baseURL "/api" membuat
 * apiClient.get("/kegiatan") memanggil /api/kegiatan. withCredentials: cookie login ikut terkirim.
 */
export const apiClient = axios.create({ baseURL: "/api", withCredentials: true });

/**
 * KONSEP interceptor: fungsi yang "mencegat" setiap jawaban sebelum sampai ke pemanggil.
 * Fungsi pertama meneruskan jawaban sukses apa adanya; fungsi kedua menangani SEMUA galat di satu tempat.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody | Blob>) => {
    const status = error.response?.status ?? 0;
    const body = await bacaBody(error.response?.data);

    /**
     * 401 = sesi habis: pengguna diarahkan ke login. `typeof window` dicek karena kode ini juga bisa berjalan di server, yang tidak punya window.
     */
    if (status === 401 && typeof window !== "undefined") {
      const { pathname, search } = window.location;
      const next = (pathname === "/" || pathname === "/dashboard") && !search ? "" : `&next=${encodeURIComponent(pathname + search)}`;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?sesi=berakhir${next}`);
    }

    /**
     * Pesan dari backend hanya dipakai untuk galat isian (413, 415, 422) yang memang ditujukan ke pengguna; galat lain memakai pesan umum.
     */
    const pesan = [413, 415, 422].includes(status)
      ? (body?.message ?? "Data yang dikirim tidak valid.")
      : (PESAN_STATUS[status] ?? PESAN_UMUM);
    return Promise.reject(new ApiError(status, body?.code ?? "UNKNOWN", pesan, body?.details));
  },
);
