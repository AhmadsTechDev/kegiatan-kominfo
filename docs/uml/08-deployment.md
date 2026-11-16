# 8. Deployment

Langkah pemasangannya ada di [README utama](../../README.md).

## 8.1 Render + Supabase + Vercel (yang dipakai sekarang)

```mermaid
flowchart LR
    pengguna(["👤 Peramban"])

    subgraph vercel["Vercel"]
        next["Next.js (apps/web)<br/>env: API_URL"]
    end

    subgraph render["Render (Web Service Free)"]
        bun["Bun + Elysia<br/>image dari apps/api/Dockerfile<br/>start: migrate → hak-akses → seed → server<br/>healthcheck: /api/health"]
    end

    subgraph supabase["Supabase (PostgreSQL Free)"]
        pg[("PostgreSQL 17<br/>Session pooler :5432")]
    end

    cloud[("Cloudinary")]
    brevo["Brevo API"]
    gh["GitHub (main)"]

    pengguna -- "HTTPS<br/>*.vercel.app" --> next
    next -- "HTTPS /api/*<br/>*.onrender.com" --> bun
    bun -- "PostgreSQL over SSL<br/>pooler.supabase.com:5432" --> pg
    bun -- HTTPS --> cloud
    bun -- HTTPS --> brevo
    gh -. "git push memicu build" .-> next
    gh -. "git push memicu build" .-> bun
```

| Simpul | Isi |
| --- | --- |
| Vercel | Frontend Next.js. Satu-satunya variabel: `API_URL` (alamat Render) |
| Render backend | Container dari `apps/api/Dockerfile`. Setiap menyala menjalankan migrasi, pengaturan hak akses DB, seed, lalu server pada `PORT` (3001) |
| Supabase Postgres | Database PostgreSQL terkelola gratis, diakses melalui Session pooler (port `5432`, mendukung IPv4) |
| Cloudinary | Foto dan PDF, disimpan privat dan hanya dibuka lewat backend |
| Brevo | Email lewat API (tidak bergantung pada port SMTP) |

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

    email["Brevo API"]

    pengguna -- "HTTPS DOMAIN" --> caddy
    backend --> email
```

Konfigurasi ada di `docker-compose.yml`, `Caddyfile`, dan `.env` di root (dibuat dari `docker.env.example`). Jangan menjalankan `docker compose down -v`, karena perintah itu menghapus volume data.
