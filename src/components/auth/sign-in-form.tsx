'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, AlertCircle, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SignInForm() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();
  const { success, error: showError } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    });

    setIsSubmitting(false);

    if (result?.error) {
      const errorMessage = 'Invalid email or password.';
      setMessage(errorMessage);
      showError(errorMessage);
      return;
    }

    success('Sign in successful');

    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={cn(
                'w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm text-foreground outline-none transition-all duration-200',
                'focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'placeholder:text-muted-foreground/70'
              )}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={cn(
                'w-full rounded-xl border border-input bg-background pl-10 pr-12 py-3 text-sm text-foreground outline-none transition-all duration-200',
                'focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'placeholder:text-muted-foreground/70'
              )}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className={cn(
                'absolute inset-y-0 right-3 flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all duration-200',
                'hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
              )}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              title={passwordVisible ? 'Hide password' : 'Show password'}
            >
              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
