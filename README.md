# Erine Palba Febmiani – Portfolio

Next.js site + password-protected admin panel at `/admin`. Content and images are stored in Vercel Blob.

## Deploy on Vercel
1. Push this folder to a GitHub repo, then **Add New → Project** on vercel.com and import it.
2. In the project: **Settings → Environment Variables** → add `ADMIN_PASSWORD` (pick a strong one).
3. In the project: **Storage → Create → Blob** → connect it to this project (this adds `BLOB_READ_WRITE_TOKEN`).
4. **Redeploy**. Open `yourdomain.vercel.app/admin`, log in, edit, press **Save changes**.

## Local run
```
cp .env.example .env.local   # fill in ADMIN_PASSWORD (+ Blob token from Vercel: `vercel env pull`)
npm install && npm run dev
```
Without a Blob token the site shows the built-in default content and the admin is read-only.

The images in `public/seed/` are page renders of her PDF so the site isn't empty at first. Replace them with real artwork via the admin, then delete the folder if you like.
