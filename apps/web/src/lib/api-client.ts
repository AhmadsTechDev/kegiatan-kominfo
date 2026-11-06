import axios, { AxiosError } from "axios";

// Klien HTTP (Axios) ke backend, dengan penanganan galat dan sesi kedaluwarsa

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
