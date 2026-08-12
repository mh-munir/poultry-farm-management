Bootstrap SUPER_ADMIN script
==========================

Purpose
-------
This repository includes a one-time privileged maintenance script to create
the FIRST `SUPER_ADMIN` account when none exists.

File
----
- `scripts/bootstrap-super-admin.ts` — interactive TypeScript script. Do NOT
  execute automatically; run manually during an approved maintenance window.

Why this exists
----------------
The application assumes a `SUPER_ADMIN` is already present for sensitive
operations (Super Admin transfer, admin creation). This script provides a
controlled, auditable way to seed the first `SUPER_ADMIN` without modifying
application code or migrations.

When to use
-----------
- Only once, when no `SUPER_ADMIN` exists.
- Run in a secure environment with backups and approvals.

How it works (safety highlights)
--------------------------------
- Performs a read-only check for existing `SUPER_ADMIN` accounts and aborts
  if any exist.
- Displays safe DB information (provider, host/path, database name) without
  printing credentials.
- Requires an exact confirmation phrase `CREATE-FIRST-SUPER-ADMIN` before
  proceeding.
- Prompts operator for name, email, and password; password input is hidden.
- Re-checks for `SUPER_ADMIN` inside a Prisma transaction. For Postgres,
  performs `SELECT ... FOR UPDATE` to reduce race conditions.
- Uses `bcryptjs` for password hashing — reuses existing project implementation.
- Creates an `AuditLog` entry with `action: SUPER_ADMIN_BOOTSTRAPPED` when
  possible. Audit metadata includes optional operator identifier.
- Prints only safe output after creation: `id`, `email`, `role`.

How to run (example)
---------------------
Ensure you run with the correct `DATABASE_URL` (and `DIRECT_URL` if needed).
For local SQLite dev DB this script will detect `file:` URLs.

```bash
# TypeScript run example (requires ts-node or tsx)
npx ts-node scripts/bootstrap-super-admin.ts
```

Important notes
---------------
- The script will NOT run automatically as part of builds or app startup.
- Do NOT store or log the plaintext password or the password hash.
- Do NOT run this against unknown/production databases unless authorized.
- After running, rotate any temporary operator credentials used to run this
  script and record the operation in your change control system.

Testing
-------
- The script is TypeScript-checked and uses the project's Prisma client and
  `bcryptjs` hashing implementation.
- For automated testing, run against an isolated test database only.

Status
------
- Script created. NOT EXECUTED.
