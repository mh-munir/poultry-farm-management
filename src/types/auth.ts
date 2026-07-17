export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface AppUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}
