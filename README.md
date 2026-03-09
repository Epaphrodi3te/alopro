# AloPro - Plateforme de gestion de projets et taches

AloPro est une application **Next.js fullstack** pour la gestion interne des utilisateurs, projets, taches et messages avec authentification securisee et RBAC.

## Stack technique

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS
- React Server Components
- Next.js API Routes
- Prisma ORM
- SQLite
- JWT en cookie HTTP Only
- SweetAlert2

## Roles pris en charge

- `admin`
- `manager`
- `agent`

Regles principales:

- Seul l'admin peut gerer les utilisateurs.
- Seul l'admin peut assigner les projets.
- Admin et manager peuvent assigner les taches.
- Un agent ne voit que les projets/taches qui lui sont explicitement assignes.

## Structure

- `src/app/login`
- `src/app/(protected)/dashboard`
- `src/app/(protected)/projects`
- `src/app/(protected)/tasks`
- `src/app/(protected)/users`
- `src/app/(protected)/messages`
- `src/components/sidebar`
- `src/components/navbar`
- `src/components/cards`
- `src/components/tables`
- `src/lib/prisma.ts`
- `src/lib/auth.ts`
- `prisma/schema.prisma`
- `src/middleware/authMiddleware.ts`
- `src/proxy.ts` (middleware Next.js v16)

## Installation

```bash
npm install
```

## Variables d'environnement

Fichier `.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-super-secret-jwt-key"
```

## Base de donnees

Generer Prisma Client:

```bash
npm run db:generate
```

Appliquer la migration (environnement classique):

```bash
npm run db:migrate
```

Seed admin:

```bash
npm run db:seed
```

Compte admin seed:

- Email: `admin@alopro.com`
- Mot de passe: `Admin@1234`

## Lancer en developpement

```bash
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

## Securite implementee

- Hash des mots de passe avec `bcrypt`
- JWT signe cote serveur
- Cookie `HTTP Only`, `SameSite=Lax`, `Secure` en production
- Protection globale des routes via middleware/proxy
- Verification des permissions avant chaque action API
