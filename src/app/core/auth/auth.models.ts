export interface AuthUser {
  email: string;
  sub: string;
}

export interface AuthSession {
  user: AuthUser;
  idToken: string;
  accessToken: string;
  expiresAt: number;
}

export type SignInStatus = 'success' | 'new_password_required';

export type SignUpStatus = 'confirmation_required' | 'confirmed';
