'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/server/auth';
import { signInSchema } from '@/lib/schemas';

export interface AuthActionState {
  success: boolean;
  message: string;
}

const initialState: AuthActionState = {
  success: false,
  message: ''
};

export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const parsed = signInSchema.safeParse({ email, password });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please enter a valid email and a password with at least 8 characters.'
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    redirect('/dashboard');
  } catch (error) {
    if (error instanceof Error && 'type' in error && (error as Error & { type?: string }).type === 'CredentialsSignin') {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    console.error('Authentication failed', error);
    return {
      success: false,
      message: 'Something went wrong while signing in. Please try again.'
    };
  }

  return initialState;
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect('/');
}
