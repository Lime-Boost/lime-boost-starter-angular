import { Injectable, computed, signal } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

import { environment } from '../../../environments/environment';
import { AuthSession, SignInStatus, SignUpStatus } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userPool = new CognitoUserPool({
    UserPoolId: environment.cognito.userPoolId,
    ClientId: environment.cognito.clientId,
  });

  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly initializedState = signal(false);
  private pendingUser: CognitoUser | null = null;
  private readonly initPromise: Promise<void>;

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly initialized = this.initializedState.asReadonly();

  constructor() {
    this.initPromise = this.restoreSession();
  }

  ensureInitialized(): Promise<void> {
    return this.initPromise;
  }

  signIn(username: string, password: string): Promise<SignInStatus> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool,
      });

      cognitoUser.authenticateUser(
        new AuthenticationDetails({
          Username: username,
          Password: password,
        }),
        {
          onSuccess: (session) => {
            this.pendingUser = null;
            this.sessionState.set(this.mapSession(cognitoUser, session));
            resolve('success');
          },
          onFailure: (error) => {
            reject(this.toAuthError(error));
          },
          newPasswordRequired: () => {
            this.pendingUser = cognitoUser;
            resolve('new_password_required');
          },
        },
      );
    });
  }

  signUp(email: string, password: string): Promise<SignUpStatus> {
    return new Promise((resolve, reject) => {
      this.userPool.signUp(
        email,
        password,
        [new CognitoUserAttribute({ Name: 'email', Value: email })],
        [],
        (error, result) => {
          if (error || !result) {
            reject(this.toAuthError(error ?? new Error('Sign up failed')));
            return;
          }

          resolve(result.userConfirmed ? 'confirmed' : 'confirmation_required');
        },
      );
    });
  }

  confirmSignUp(email: string, code: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (error) => {
        if (error) {
          reject(this.toAuthError(error));
          return;
        }

        resolve();
      });
    });
  }

  resendConfirmationCode(email: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((error) => {
        if (error) {
          reject(this.toAuthError(error));
          return;
        }

        resolve();
      });
    });
  }

  completeNewPassword(newPassword: string): Promise<void> {
    if (!this.pendingUser) {
      return Promise.reject(new Error('No pending sign-in session.'));
    }

    const cognitoUser = this.pendingUser;

    return new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(
        newPassword,
        {},
        {
          onSuccess: (session) => {
            this.sessionState.set(this.mapSession(cognitoUser, session));
            this.pendingUser = null;
            resolve();
          },
          onFailure: (error) => {
            reject(this.toAuthError(error));
          },
        },
      );
    });
  }

  logout(): Promise<void> {
    const cognitoUser = this.userPool.getCurrentUser();
    this.pendingUser = null;
    this.sessionState.set(null);

    if (!cognitoUser) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
        if (!error && session?.isValid()) {
          cognitoUser.globalSignOut({
            onSuccess: () => resolve(),
            onFailure: () => {
              cognitoUser.signOut();
              resolve();
            },
          });
          return;
        }

        cognitoUser.signOut();
        resolve();
      });
    });
  }

  forgotPassword(email: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (error) => reject(this.toAuthError(error)),
      });
    });
  }

  confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: this.userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (error) => reject(this.toAuthError(error)),
      });
    });
  }

  getAccessToken(): Promise<string> {
    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) {
      return Promise.reject(new Error('Not authenticated'));
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
        if (error || !session?.isValid()) {
          reject(error ?? new Error('Invalid session'));
          return;
        }

        resolve(session.getAccessToken().getJwtToken());
      });
    });
  }

  private restoreSession(): Promise<void> {
    return new Promise((resolve) => {
      const cognitoUser = this.userPool.getCurrentUser();
      if (!cognitoUser) {
        this.initializedState.set(true);
        resolve();
        return;
      }

      cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
        if (!error && session?.isValid()) {
          this.sessionState.set(this.mapSession(cognitoUser, session));
        } else {
          this.sessionState.set(null);
        }

        this.initializedState.set(true);
        resolve();
      });
    });
  }

  private mapSession(cognitoUser: CognitoUser, session: CognitoUserSession): AuthSession {
    const idToken = session.getIdToken();
    const payload = idToken.decodePayload();

    return {
      user: {
        email: String(payload['email'] ?? cognitoUser.getUsername()),
        sub: String(payload['sub']),
      },
      idToken: idToken.getJwtToken(),
      accessToken: session.getAccessToken().getJwtToken(),
      expiresAt: idToken.getExpiration() * 1000,
    };
  }

  private toAuthError(error: Error): Error {
    return new Error(error.message || 'Authentication failed');
  }
}
