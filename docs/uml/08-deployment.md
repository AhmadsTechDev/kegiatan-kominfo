# 8. Deployment

Langkah pemasangannya ada di [README utama](../../README.md).

## 8.1 Railway + Vercel (yang dipakai sekarang)

```mermaid
flowchart LR
    pengguna(["👤 Peramban"])

    subgraph vercel["Vercel"]
        next["Next.js (apps/web)<br/>env: API_URL"]
    end

    subgraph railway["Railway (proyek)"]
        direction TB
        subgraph svcApi["Layanan backend<br/>image dari apps/api/Dockerfile"]
            bun["Bun + Elysia<br/>start: migrate deploy → hak-akses → seed → server<br/>port dari variabel PORT"]
        end
        subgraph svcDb["Layanan Postgres"]
            pg[("PostgreSQL<br/>volume postgres-volume")]
        end
        bun -- "jaringan privat<br/>postgres.railway.internal:5432" --> pg
    end

    cloud[("Cloudinary")]
    brevo["Brevo API"]
    gh["GitHub (main)"]

    pengguna -- "HTTPS<br/>*.vercel.app" --> next
    next -- "HTTPS /api/*<br/>*.up.railway.app" --> bun
    bun -- HTTPS --> cloud
    bun -- HTTPS --> brevo
    gh -. "git push memicu build" .-> next
    gh -. "git push memicu build" .-> bun
```

| Simpul | Isi |
| --- | --- |
| Vercel | Frontend Next.js. Satu-satunya variabel: `API_URL` (alamat Railway) |
| Railway backend | Container dari Dockerfile. Setiap menyala menjalankan migrasi, pengaturan hak akses DB, seed, lalu server. Port domain publik harus sama dengan `PORT` yang dipakai server |
| Railway Postgres | Database dengan volume tersendiri, sehingga data tetap ada saat backend dibangun ulang |
| Cloudinary | Foto dan PDF, disimpan privat dan hanya dibuka lewat backend |
| Brevo | Email lewat API (Railway memblokir SMTP) |

## 8.2 Alternatif: VPS dengan Docker Compose

Satu `docker compose` di server sendiri (mis. server Diskominfo). Hanya Caddy yang membuka port ke luar.

```mermaid
flowchart LR
    pengguna(["👤 Peramban"])

    subgraph vps["VPS / server dinas (Docker Compose)"]
        direction TB
        caddy["caddy<br/>:80, :443, sertifikat HTTPS otomatis"]
        frontend["frontend<br/>apps/web/Dockerfile"]
        backend["backend<br/>apps/api/Dockerfile"]
        postgres[("postgres<br/>volume data")]
        vol[("volume storage<br/>(berkas dokumentasi)")]
        caddy --> frontend
        frontend -- "/api/*" --> backend
        backend --> postgres
        backend --> vol
    end

    email["SMTP dinas atau Brevo"]

    pengguna -- "HTTPS DOMAIN" --> caddy
    backend --> email
```

Konfigurasi ada di `docker-compose.yml`, `Caddyfile`, dan `.env` di root (dibuat dari `docker.env.example`). Jangan menjalankan `docker compose down -v`, karena perintah itu menghapus volume data.
