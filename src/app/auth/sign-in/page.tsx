import Link from 'next/link';
import { SignInForm } from '@/components/auth/sign-in-form';

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const success = params?.success ?? '';
  const error = params?.error ?? '';

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your credentials to access the farm management workspace.
        </p>

        {(success || error) && (
          <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {error || success}
          </div>
        )}

        <div className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-950">
          <p className="font-medium">Seeded admin credentials</p>
          <p className="mt-2">Email: <span className="font-semibold">admin@poultryfarm.test</span></p>
          <p>Password: <span className="font-semibold">changeme123</span></p>
        </div>
        <SignInForm />
        <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/auth/reset-admin" className="text-primary hover:underline">
            Forgot admin password? Reset it with a token.
          </Link>
          <Link href="/" className="hover:text-foreground">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
