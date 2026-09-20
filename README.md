# Erine Portfolio CMS

Portfolio Erine Palba Febmiani dengan dashboard admin ringan. Tampilan publik mempertahankan arah visual versi portfolio sebelumnya, tetapi seluruh konten utama sekarang dapat diubah dari `/admin` tanpa mengedit source code.

## Fitur

- Portfolio publik responsive
- Admin login berbasis session
- Edit nama, role, hero, bio, contact, social links, dan skills
- Upload/ganti hero artwork, portrait, dan closing artwork
- CRUD project portfolio
- Upload cover dan multiple gallery images per project
- Atur kategori, tag, visibilitas, urutan project, dan featured project
- CRUD experience dan achievements
- Export/import backup konten JSON
- Data dan upload persisten melalui Docker named volume
- Health check di `/health`

## Menjalankan dengan Docker Compose

1. Copy contoh environment:

```bash
cp .env.example .env
```

2. Ubah minimal nilai berikut di `.env`:

```env
PORT=8080
ADMIN_USER=admin
ADMIN_PASSWORD=ganti-dengan-password-yang-kuat
SESSION_SECRET=ganti-dengan-random-string-panjang
COOKIE_SECURE=false
```

3. Build dan jalankan:

```bash
docker compose up -d --build
```

4. Buka:

- Portfolio: `http://localhost:8080`
- Admin: `http://localhost:8080/admin`
- Health: `http://localhost:8080/health`

## Login admin

Credential mengikuti `.env`:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=...
```

Jangan gunakan password default apabila container dapat diakses dari internet.

## Data persistence

Docker Compose membuat dua named volume:

```text
portfolio_data     -> /app/data
portfolio_uploads  -> /app/public/uploads
```

`portfolio_data` menyimpan `content.json`, sedangkan `portfolio_uploads` menyimpan gambar yang diupload dari dashboard admin. Karena itu, `docker compose down` tidak menghapus konten. Hindari `docker compose down -v` kecuali memang ingin menghapus seluruh data dan upload.

Cek volume:

```bash
docker volume ls | grep portfolio
```

## Backup

Di dashboard buka menu **Backup** dan klik **Download JSON backup**. Backup JSON menyimpan konten dan referensi gambar. File gambar upload tetap berada di volume `portfolio_uploads`, jadi untuk backup server penuh sebaiknya backup kedua Docker volume juga.

Contoh backup volume upload:

```bash
docker run --rm \
  -v erine-portfolio-cms_portfolio_uploads:/source:ro \
  -v "$PWD":/backup \
  alpine sh -c 'cd /source && tar czf /backup/portfolio_uploads.tar.gz .'
```

Contoh backup volume data:

```bash
docker run --rm \
  -v erine-portfolio-cms_portfolio_data:/source:ro \
  -v "$PWD":/backup \
  alpine sh -c 'cd /source && tar czf /backup/portfolio_data.tar.gz .'
```

Nama volume aktual dapat memiliki prefix berbeda sesuai nama folder/project Compose. Verifikasi dengan `docker volume ls`.

## Reverse proxy / HTTPS

Jika diletakkan di belakang Nginx/Traefik dan website sudah HTTPS, gunakan:

```env
COOKIE_SECURE=true
```

Contoh Nginx host:

```nginx
server {
    listen 443 ssl http2;
    server_name portfolio.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Untuk deployment production, sebaiknya bind port Compose hanya ke localhost:

```yaml
ports:
  - "127.0.0.1:8080:3000"
```

kemudian expose hanya Nginx/Traefik ke internet.

## Struktur project

```text
erine-portfolio-cms/
├── data/
│   └── content.default.json
├── public/
│   ├── assets/
│   ├── uploads/
│   ├── admin.css
│   ├── admin.js
│   ├── frontend.js
│   └── styles.css
├── views/
│   ├── admin-login.ejs
│   ├── admin.ejs
│   └── index.ejs
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js
```

## Menjalankan tanpa Docker

Membutuhkan Node.js 20+.

```bash
npm install
cp .env.example .env
npm start
```

Server default berjalan di `http://localhost:3000` jika `PORT` tidak diubah.
