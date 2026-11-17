# 4. Deployment Diagram

Sesuai **Subbab 4.7.4 (Gambar 4.10)** Laporan KP. Langkah pemasangannya ada di [README utama](../../README.md).

## Pemasangan di Render, Supabase, dan Vercel

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
