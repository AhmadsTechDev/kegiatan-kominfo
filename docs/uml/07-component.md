# 7. Component

```mermaid
flowchart LR
    pengguna(["👤 Peramban pengguna"])

    subgraph web["Frontend: apps/web (Next.js 16)"]
        direction TB
        app["app/ (App Router, halaman)"]
        fitur["features/: auth, kegiatan, kalender, dashboard,<br/>rekap, laporan, pantau, admin, pengaturan"]
        shared["components/ (shadcn/ui, peta MapLibre,<br/>tabel, dialog)"]
        klien["lib/: api-client (axios),<br/>auth-client (Better Auth), TanStack Query"]
        proxy["next.config.ts: rewrite /api/* ke backend<br/>proxy.ts: cek cookie sesi, arahkan ke /login"]
        app --> fitur --> shared
        fitur --> klien --> proxy
    end

    subgraph api["Backend: apps/api (Bun + Elysia)"]
        direction TB
        routes["routes/ + validators/"]
        ctrl["controllers/"]
        svc["services/ (aturan bisnis, hak akses)"]
        repo["repositories/ (Drizzle)"]
        auth["lib/auth.ts (Better Auth:<br/>sesi, login, kunci akun, batas laju)"]
        mailer["lib/mailer.ts"]
        storage["lib/storage.ts"]
        pdf["utils/laporan-pdf.tsx (React PDF + logo assets/)"]
        job["jobs/pengingat.job.ts (setiap 15 menit)"]
        routes --> ctrl --> svc --> repo
        routes --> auth
        svc --> mailer
        svc --> storage
        svc --> pdf
        job --> svc
    end

    db[("PostgreSQL 17")]
    cloud[("Cloudinary<br/>(foto dan PDF, privat)")]
    lokal[("Folder storage/<br/>(bila Cloudinary kosong)")]
    brevo["Brevo API<br/>(email)"]
    smtp["SMTP / Mailpit<br/>(development)"]
    peta["OpenFreeMap<br/>(ubin peta)"]

    pengguna -- HTTPS --> app
    pengguna -- ubin peta --> peta
    proxy -- "HTTP /api/*" --> routes
    repo --> db
    auth --> db
    storage --> cloud
    storage -.-> lokal
    mailer --> brevo
    mailer -.-> smtp
```

| Komponen | Peran |
| --- | --- |
| Rewrite `/api/*` | UI dan API tampil di satu origin, sehingga cookie sesi milik domain frontend dan tidak ada masalah CORS |
| Better Auth | Login email dan sandi, sesi di database, penguncian akun lewat hook, batas laju per IP |
| Service | Satu-satunya tempat aturan bisnis dan pemeriksaan hak akses |
| Storage | Cloudinary bila `CLOUDINARY_URL` diisi, selain itu folder lokal `STORAGE_DIR` |
| Mailer | API Brevo bila `BREVO_API_KEY` diisi, selain itu SMTP |
| Penjadwal | Berjalan di dalam proses backend; tidak dijalankan saat pengujian |
