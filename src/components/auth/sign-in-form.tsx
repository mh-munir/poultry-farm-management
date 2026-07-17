'use client';

import { useActionState } from 'react';
import { loginAction } from '@/features/auth/actions';
import { Button } from '@/components/ui/button';

const initialState = {
  success: false,
  message: ''
};

export function SignInForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="At least 8 characters"
        />
      </div>

      {state.message ? (
        <p className={`text-sm ${state.success ? 'text-emerald-600' : 'text-red-600'}`}>{state.message}</p>
      ) : null}

      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
