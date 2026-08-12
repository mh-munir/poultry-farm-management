/*
 * One-time privileged maintenance script to create the FIRST SUPER_ADMIN.
 *
 * IMPORTANT:
 * - This script does NOT run automatically.
 * - Run manually by an authorized operator.
 * - Intended for controlled maintenance/bootstrap use.
 * - Password is never printed or logged.
 * - User creation and audit log are committed in ONE transaction.
 */

import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

import bcrypt from 'bcryptjs'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '../src/server/db/index'

const argv = process.argv.slice(2)

const dryRun = argv.includes('--dry-run')
const showHelp = argv.includes('--help') || argv.includes('-h')

function safeLog(...args: unknown[]) {
  console.log(...args)
}

/**
 * Normal visible terminal input.
 */
async function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input,
    output,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question(prompt, resolve)
  })

  rl.close()

  return answer.trim()
}

/**
 * Hidden password input compatible with Windows PowerShell.
 *
 * Characters are NOT echoed to the terminal.
 */
async function questionHidden(prompt: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const stdin = input

    let answer = ''
    let finished = false

    process.stdout.write(prompt)

    const cleanup = () => {
      if (finished) return

      finished = true

      try {
        stdin.removeListener('data', onData)
      } catch {
        // Ignore cleanup errors.
      }

      if (stdin.isTTY) {
        try {
          stdin.setRawMode(false)
        } catch {
          // Ignore terminal mode errors.
        }
      }

      stdin.pause()
      process.stdout.write('\n')
    }

    const finish = () => {
      cleanup()
      resolve(answer)
    }

    const abort = () => {
      cleanup()
      process.exit(130)
    }

    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString()

      for (const char of text) {
        // Enter
        if (char === '\r' || char === '\n') {
          finish()
          return
        }

        // Ctrl+C
        if (char === '\u0003') {
          abort()
          return
        }

        // Backspace
        if (char === '\u0008' || char === '\u007f') {
          if (answer.length > 0) {
            answer = answer.slice(0, -1)
          }

          continue
        }

        // Ignore other control characters.
        if (char < ' ') {
          continue
        }

        answer += char
      }
    }

    if (stdin.isTTY) {
      try {
        stdin.setRawMode(true)
      } catch {
        // If raw mode is unavailable, continue with data handling.
      }
    }

    stdin.resume()
    stdin.on('data', onData)
  })
}

/**
 * Display safe database information.
 * Credentials are never displayed.
 */
function displayDbSummary(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    safeLog('Database: <no DATABASE_URL set>')
    return
  }

  if (databaseUrl.startsWith('file:')) {
    safeLog('Provider: sqlite (local dev DB)')
    safeLog('Path:', databaseUrl.replace('file:', ''))
    return
  }

  try {
    const url = new URL(databaseUrl)

    safeLog('Provider:', url.protocol.replace(':', ''))
    safeLog('Host:', url.hostname)
    safeLog('Database:', url.pathname.replace(/^\//, ''))
  } catch {
    safeLog(
      'Database connection string is present but could not be parsed. Proceed with caution.',
    )
  }
}

function printHelp() {
  safeLog('Usage:')
  safeLog('  npx tsx scripts/bootstrap-super-admin.ts')
  safeLog('  npx tsx scripts/bootstrap-super-admin.ts --dry-run')
  safeLog('  npx tsx scripts/bootstrap-super-admin.ts --help')
  safeLog('')
  safeLog('--dry-run  Perform readonly checks and exit before creating anything.')
  safeLog('--help     Show this help message.')
}

/**
 * PostgreSQL advisory transaction lock.
 *
 * This is stronger than SELECT ... FOR UPDATE when there are currently
 * zero SUPER_ADMIN rows, because FOR UPDATE cannot lock a nonexistent row.
 *
 * The lock exists only for the lifetime of the current transaction.
 */
async function acquireBootstrapLock(tx: Prisma.TransactionClient) {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? ''

  if (
    databaseUrl.startsWith('postgres://') ||
    databaseUrl.startsWith('postgresql://')
  ) {
    await tx.$executeRawUnsafe(
      'SELECT pg_advisory_xact_lock(728391746)',
    )
  }
}

async function main() {
  if (showHelp) {
    printHelp()
    process.exit(0)
  }

  safeLog('\n*** BOOTSTRAP SUPER_ADMIN - ONE TIME MAINTENANCE SCRIPT ***\n')

  safeLog('This is a one-time privileged maintenance operation.')
  safeLog(
    'It will NOT run automatically. Run only in a controlled, audited maintenance window.\n',
  )

  if (dryRun) {
    safeLog('DRY RUN mode enabled. No changes will be made.\n')
  }

  const dbUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL

  displayDbSummary(dbUrl)

  /*
   * Initial readonly safety check.
   */
  let existingCount = 0

  try {
    existingCount = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN',
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error)

    safeLog(
      'ERROR: Unable to query database for existing SUPER_ADMIN:',
      message,
    )

    process.exit(2)
  }

  if (existingCount > 0) {
    safeLog('\nSUPER_ADMIN already exists. Bootstrap aborted.')
    process.exit(0)
  }

  if (dryRun) {
    safeLog('\nDRY RUN pre-check completed.')
    safeLog('No changes were made.')
    return
  }

  /*
   * Explicit operator confirmation.
   */
  safeLog('\nNo SUPER_ADMIN found.')

  safeLog(
    'To continue you must type the exact confirmation phrase:',
  )

  safeLog('\n    CREATE-FIRST-SUPER-ADMIN\n')

  const confirmation = await question(
    'Type confirmation (case-sensitive): ',
  )

  if (confirmation !== 'CREATE-FIRST-SUPER-ADMIN') {
    safeLog('\nConfirmation mismatch. Aborting with no changes.')
    process.exit(0)
  }

  /*
   * Operator identity is stored only as audit metadata.
   */
  const operator = await question(
    'Operator name or identifier (for audit log, optional): ',
  )

  /*
   * New SUPER_ADMIN account details.
   */
  const name = await question('Full name: ')
  const email = await question('Email: ')

  const pass = await questionHidden(
    'Password (input hidden): ',
  )

  const passConfirm = await questionHidden(
    'Confirm password: ',
  )

  /*
   * Validate email.
   */
  const normalizedEmail = email.trim().toLowerCase()

  try {
    z.string().email().parse(normalizedEmail)
  } catch {
    safeLog('\nInvalid email address. Aborting.')
    process.exit(1)
  }

  /*
   * Validate password.
   */
  if (!pass || pass.length < 8) {
    safeLog(
      '\nPassword policy: minimum 8 characters required. Aborting.',
    )

    process.exit(1)
  }

  if (pass !== passConfirm) {
    safeLog(
      '\nPassword confirmation does not match. Aborting.',
    )

    process.exit(1)
  }

  safeLog(
    '\nPerforming final checks and creating SUPER_ADMIN inside a transaction...',
  )

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        /*
         * Acquire a transaction-scoped PostgreSQL advisory lock.
         *
         * This protects the "first SUPER_ADMIN" creation even when
         * there are currently zero SUPER_ADMIN rows.
         */
        await acquireBootstrapLock(tx)

        /*
         * Final authoritative SUPER_ADMIN check INSIDE transaction.
         */
        const countNow = await tx.user.count({
          where: {
            role: 'SUPER_ADMIN',
          },
        })

        if (countNow > 0) {
          throw new Error(
            'SUPER_ADMIN already exists. Bootstrap cancelled.',
          )
        }

        /*
         * Final email uniqueness check.
         */
        const existingUser = await tx.user.findUnique({
          where: {
            email: normalizedEmail,
          },
          select: {
            id: true,
            email: true,
          },
        })

        if (existingUser) {
          throw new Error(
            'This email address is already registered.',
          )
        }

        /*
         * Hash password.
         *
         * Plaintext password is never logged or stored.
         */
        const hashedPassword = await bcrypt.hash(pass, 10)

        /*
         * Create FIRST SUPER_ADMIN.
         */
        const created = await tx.user.create({
          data: {
            name: name || null,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
          },
        })

        /*
         * Audit log MUST succeed.
         *
         * If this insert fails, the entire transaction rolls back,
         * including SUPER_ADMIN creation.
         */
        await tx.auditLog.create({
          data: {
            action: 'SUPER_ADMIN_BOOTSTRAPPED',
            actorUserId: created.id,
            targetUserId: created.id,
            metadata: {
              operator: operator || null,
            },
          },
        })

        return {
          id: created.id,
          email: created.email,
          role: created.role,
        }
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    )

    safeLog('\n========================================')
    safeLog('SUPER_ADMIN created successfully.')
    safeLog('========================================')
    safeLog('id:', result.id)
    safeLog('email:', result.email)
    safeLog('role:', result.role)

    safeLog(
      '\nIMPORTANT: The password was never printed or logged.',
    )

    safeLog(
      'IMPORTANT: User creation and audit log were committed in one transaction.',
    )

    safeLog(
      'IMPORTANT: This script does not run automatically during deployment.',
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error)

    safeLog('\nERROR: Bootstrap failed:', message)

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const isMain =
  typeof require !== 'undefined'
    ? require.main === module
    : process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error: unknown) => {
    console.error(
      'UNHANDLED ERROR:',
      error instanceof Error ? error.message : String(error),
    )

    process.exit(1)
  })
}
