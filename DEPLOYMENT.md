# Vercel deployment

Import `andrewyemtsev03/stada-mbr`, using the repository root and the Next.js framework preset. `vercel.json` selects `npm run build:vercel` and `.next` automatically. Leave conflicting dashboard overrides disabled.

The Vercel website forwards `/api/game` to the existing public Sites backend at `https://stada-mbr-ai.miashecks.chatgpt.site`. Rooms and scores persist in its Cloudflare D1 database. No new database or credentials are needed. QR codes use the website origin that the host is visiting.

Optional server-only variable: `GAME_BACKEND_URL` overrides that origin for testing or a future backend migration. It must point to a compatible game API, not this Vercel deployment. Keep the Sites backend available; this is not a complete backend migration to Vercel. Question and game-rule changes must also be published to Sites.

- `npm run dev`, `npm run build`: Sites/Cloudflare (Vinext).
- `npm run dev:vercel`, `npm run build:vercel`, `npm run start:vercel`: standard Next.js.
- `lib/game-cloudflare.ts`: authoritative room logic and D1 storage.
- `lib/game-runtime.ts`: Vercel request forwarding. The Sites build aliases it to the Cloudflare implementation.

The old Vercel failure (`NEXT_NO_ROUTES_MANIFEST`) occurred because a Vinext build creates `dist`, not the `.next` output that Vercel's Next.js adapter requires.
