import test from 'node:test'
import assert from 'node:assert/strict'

// Import modules under test
import * as authMod from '../src/lib/auth'
import * as actions from '../src/app/dashboard/settings/users/actions'
import { prisma } from '../src/server/db/index'

function makeFormData(obj: Record<string, string>) {
  const fd = new FormData()
  for (const k of Object.keys(obj)) fd.append(k, obj[k])
  return fd
}

test('server actions reject non-SUPER_ADMIN (unauthenticated or ADMIN)', async () => {
  // Simulate unauthenticated / non-super-admin by making requireRole throw
  Object.defineProperty(authMod, 'requireRole', {
    value: async () => { throw new Error('not allowed') },
    configurable: true
  })

  const sendResult = await actions.sendAdminCreationOtp(makeFormData({ contact: 'x@example.com' }))
  assert.equal((sendResult as any).error?.includes('Only Super Admin'), true)

  const verifyResult = await actions.verifyAdminCreationOtp(makeFormData({ contact: 'x@example.com', code: '123456' }))
  assert.equal((verifyResult as any).error?.includes('Only Super Admin'), true)

  const createResult = await actions.createAdminAccount(makeFormData({ name: 'A', email: 'a@e.com', password: 'pass12345', confirmPassword: 'pass12345', contact: 'a@e.com', channel: 'EMAIL', otpCode: '123456' }))
  assert.equal((createResult as any).error?.includes('Only Super Admin'), true)

  const delResult = await actions.deleteAdminUser('some-id')
  assert.equal((delResult as any).error?.includes('Only Super Admin'), true)
})

test('SUPER_ADMIN can run createAdminAccount but role override is ignored', async () => {
  // Mock requireRole to return a SUPER_ADMIN session
  Object.defineProperty(authMod, 'requireRole', {
    value: async () => ({ user: { id: 'sa-1', role: 'SUPER_ADMIN' } } as any),
    configurable: true
  })

  // Prepare a mock transaction to capture created user data
  let lastCreated: any = null

  const originalTransaction = prisma.$transaction.bind(prisma)

  // Stub $transaction to run provided callback with a lightweight tx that
  // implements only the methods used by createAdminAccount.
  prisma.$transaction = async (cb: any) => {
    const tx = {
      adminCreationOtp: {
        findFirst: async (q: any) => ({ id: 'otp-1', contact: 'creator@example.com', verifiedAt: new Date(), expiresAt: new Date(Date.now() + 10000) }),
        delete: async () => {}
      },
      user: {
        findUnique: async () => null,
        findFirst: async () => null,
        create: async ({ data }: any) => { lastCreated = data; return { id: 'u-1', ...data } }
      },
      auditLog: {
        create: async ({ data }: any) => data
      }
    }
    return cb(tx)
  }

  const fd = makeFormData({
    name: 'New Admin',
    email: 'creator@example.com',
    phone: '+1234567890',
    password: 'strongpassword',
    confirmPassword: 'strongpassword',
    contact: 'creator@example.com',
    channel: 'EMAIL',
    otpCode: '000000',
    // Attempted privilege escalation --- should be ignored by server
    role: 'SUPER_ADMIN'
  })

  const res = await actions.createAdminAccount(fd)
  // restore transaction implementation to avoid side effects for other tests
  prisma.$transaction = originalTransaction

  assert.equal((res as any).error, undefined, 'expected createAdminAccount to succeed for SUPER_ADMIN')
  assert.ok(lastCreated, 'user create should have been called')
  assert.equal(lastCreated.role, 'ADMIN', 'server must create user with role ADMIN')
  assert.equal(typeof lastCreated.password, 'string')
  assert.notEqual(lastCreated.password, 'strongpassword', 'password should be hashed (not equal to plaintext)')
})
