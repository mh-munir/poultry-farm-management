import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/auth/sign-in');
  return null;
}
