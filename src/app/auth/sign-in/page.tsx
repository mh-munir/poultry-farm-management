import Link from 'next/link';
import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use your credentials to access the farm management workspace.
        </p>
        <div className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-950">
          <p className="font-medium">Seeded admin credentials</p>
          <p className="mt-2">Email: <span className="font-semibold">admin@poultryfarm.test</span></p>
          <p>Password: <span className="font-semibold">changeme123</span></p>
        </div>
        <SignInForm />
        <Link href="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
          Back home
        </Link>
      </div>
    </main>
  );
}
