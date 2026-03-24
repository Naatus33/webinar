## Webinar Manager — papéis

Análise funcional completa (criação, funil público, permissões): [docs/ANALISE_FUNCIONAL.md](docs/ANALISE_FUNCIONAL.md).

- **Admin:** vê todos os webinars; em **Equipe** (`/dashboard/equipe`) vincula cada **vendedor** a um **gestor**.
- **Gestor:** vê e opera webinars próprios e da equipe (builder, live, analytics).
- **Vendedor:** apenas os próprios webinars.

**Contagem até o início:** usa data/hora no fuso local. Com status **LIVE**, a página pública mostra ao vivo mesmo antes do horário agendado.

---

### Hard-prod (Postgres e chat em tempo real)

- **Chat em tempo real:** o modo `config.chat.mode === "live"` usa SSE no endpoint [`/api/webinars/[id]/chat/stream`](src/app/api/webinars/[id]/chat/stream/route.ts) e atualiza o painel do host e a sala do espectador com snapshots periódicos (inclui mensagens, `pinned` e `timestamp`).
- **Postgres:** `prisma/schema.prisma` usa `provider = "postgresql"`. No `.env`, defina `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public`.
  - Migrações: `npx prisma migrate dev` (dev) ou `npx prisma migrate deploy` (produção), depois `npx prisma generate`.
  - **Prisma 7:** em [`src/lib/prisma.ts`](src/lib/prisma.ts), Postgres usa o adapter `@prisma/adapter-pg` + `pg`; se `DATABASE_URL` começar com `file:` (SQLite), usa `better-sqlite3`.
  - **Usuários demo:** após migrar, rode `npm run db:seed` — `admin@demo.local`, `gestor@demo.local`, `vendedor@demo.local` (senha `demo1234`).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
