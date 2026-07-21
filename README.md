# Poultry Farm Management System

This project provides a production-ready architectural foundation for a poultry farm management application using Next.js 15, React 19, TypeScript, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, Auth.js, React Hook Form, and Zod.

## Architecture goals

- Feature-based vertical slices for future domain modules
- Shared infrastructure for auth, database, validation, and UI primitives
- Scalable layout, middleware, and providers ready for expansion
- No business modules implemented yet; only the architectural shell is in place

## Key directories

- src/app: App Router pages and layouts
- src/components: shared UI and layout components
- src/features: domain feature folders (prepared for future modules)
- src/lib: utilities, schemes, environment helpers
- src/server: Prisma and Auth.js server infrastructure
- src/styles: global design tokens and Tailwind entrypoint

## Coding standards

- Use TypeScript everywhere
- Prefer server components by default and client components only when necessary
- Keep feature modules self-contained with local components, hooks, and types
- Validate inputs using Zod and React Hook Form
- Use Prisma for persistence and Auth.js for sessions
- Follow consistent naming and colocated folder organization

## Deployment notes

### Vercel

- Set these environment variables in Vercel:
  - DATABASE_URL
  - DIRECT_URL
  - AUTH_SECRET
  - AUTH_URL (or NEXTAUTH_URL)
  - NEXT_PUBLIC_APP_URL
- Use the Vercel build command from [vercel.json](vercel.json) or set it to `npm run vercel-build`.
- This project uses Prisma with PostgreSQL in production. SQLite is suitable for local development only.
- The app expects a production database and secure auth configuration before deployment.
