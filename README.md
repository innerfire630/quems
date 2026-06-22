# Smart Queue Management System

A web-based queue management system for digitising customer queuing,
counter operations, live display, audio announcements, push notifications,
and reporting. Built with Next.js 14+ (App Router), TypeScript, Prisma,
and NextAuth.js v5.

> The authoritative specification for this system is the DDD document series
> in [`document_series/`](./document_series/). The master plan is the source
> of truth — implementation must remain consistent with it.

---

## Requirements

- **Node.js**: 20.x LTS (Node 22 LTS also supported)
- **Package manager**: Yarn 1.22+ (or Yarn Berry 3.x/4.x)
- **Database**: SQLite for development (no setup needed; Prisma manages the file)

Verify your local versions:

```bash
node -v
yarn -v
```

## Getting Started

```bash
# 1. Install dependencies
yarn install

# 2. Set up local environment variables
cp .env.example .env

# 3. Generate the Prisma client and apply migrations (Phase 1.1.3 onwards)
yarn prisma:generate
yarn prisma:migrate

# 4. Seed the database (RBAC content arrives in Phase 1.3.1)
yarn prisma:seed

# 5. Start the development server
yarn dev
```

The application boots on <http://localhost:3000>.

## Available Scripts

| Script                 | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `yarn dev`             | Start the Next.js development server             |
| `yarn build`           | Create a production build                        |
| `yarn start`           | Start the production server (after `build`)      |
| `yarn lint`            | Run ESLint without auto-fixing                   |
| `yarn lint:fix`        | Run ESLint with auto-fix                         |
| `yarn format`          | Format all files with Prettier                   |
| `yarn format:check`    | Verify formatting without writing                |
| `yarn type-check`      | Run TypeScript type checking (`tsc --noEmit`)    |
| `yarn prisma:generate` | Generate the Prisma client                       |
| `yarn prisma:migrate`  | Apply Prisma migrations in development           |
| `yarn prisma:seed`     | Run the seed script                              |
| `yarn db:reset`        | Reset the database (development only)            |
| `yarn prepare`         | Husky install hook (auto-runs on `yarn install`) |

## Project Structure

```
.
├── document_series/      DDD documentation (45 task plan documents)
├── prisma/               Prisma schema, migrations, and seed script
├── public/               Static assets (sounds, fonts, logo)
├── src/
│   ├── app/              Next.js App Router (route groups + API)
│   ├── components/       UI, layout, domain, and shared components
│   ├── hooks/            React custom hooks
│   ├── lib/              Server-side modules and utilities
│   ├── schemas/          Zod validation schemas
│   └── types/            TypeScript type definitions
├── .env / .env.example   Environment variable files (.env is gitignored)
├── .prettierrc           Prettier configuration
├── eslint.config.mjs     ESLint 9 flat configuration
├── next.config.ts        Next.js configuration
├── tsconfig.json         TypeScript configuration (with `@/*` alias)
└── package.json
```

## Conventions

- **Path alias:** All internal imports use `@/*` → `./src/*` (no `../../../`).
- **File naming:**
  - Folders: kebab-case (`audit-log/`)
  - Components: PascalCase (`UserForm.tsx`)
  - Non-component modules: camelCase (`auth-utils.ts`)
- **TypeScript:** No `any` in production code; use `unknown` and narrow with type guards.
- **Validation:** All form input is validated with Zod schemas in `src/schemas/`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
  Each DDD task plan document corresponds to one or more commits.

## Development Workflow

1. Pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files.
2. Run `yarn type-check` before opening a PR to catch type errors early.
3. Run `yarn lint` and `yarn format:check` to confirm code quality.
4. Database changes go through Prisma migrations — never edit the schema by hand
   after the initial migration.

## License

Proprietary — internal project.
