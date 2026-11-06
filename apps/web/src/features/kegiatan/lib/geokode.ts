// Cari tempat dan alamat dari koordinat lewat Photon (OpenStreetMap)

const DASAR = "https://photon.komoot.io";
const BIAS = "lat=-2.9761&lon=104.7754";

export type Tempat = { id: string; nama: string; alamat: string; lat: number; lng: number };

type FiturPhoton = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
  };
};

const bulatkan = (n: number) => Math.round(n * 1e6) / 1e6;

function keTempat(f: FiturPhoton): Tempat {
  const p = f.properties;
  const jalan = p.street ? [p.street, p.housenumber].filter(Boolean).join(" ") : undefined;
  const bagian = [jalan, p.district, p.city ?? p.county, p.city ? undefined : p.state].filter((x): x is string => !!x && x !== p.name);
  const nama = p.name ?? jalan ?? p.district ?? p.city ?? "Titik tanpa nama";
  return {
    id: `${p.osm_type ?? "x"}${p.osm_id ?? `${f.geometry.coordinates.join(",")}`}`,
    nama,
    alamat: [...new Set(bagian)].join(", "),
    lat: bulatkan(f.geometry.coordinates[1]),
    lng: bulatkan(f.geometry.coordinates[0]),
  };
}

async function ambil(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Layanan pencarian lokasi sedang tidak tersedia");
  const data = (await res.json()) as { features: FiturPhoton[] };
  return data.features.map(keTempat);
}

export function cariTempat(kata: string, signal?: AbortSignal) {
  return ambil(`${DASAR}/api/?q=${encodeURIComponent(kata)}&${BIAS}&limit=6`, signal);
}

export async function alamatDariTitik(lat: number, lng: number, signal?: AbortSignal) {
  const [hasil] = await ambil(`${DASAR}/reverse?lat=${lat}&lon=${lng}&limit=1`, signal);
  return hasil ?? null;
}
