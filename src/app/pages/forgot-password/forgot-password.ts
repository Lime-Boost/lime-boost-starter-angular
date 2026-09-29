import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PasswordInput } from '../../shared/password-input/password-input';

@Component({
  selector: 'app-forgot-password',
  imports: [PasswordInput, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly awaitingReset = signal(false);
  protected readonly email = signal('');

  protected readonly requestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  protected async onRequestCode(): Promise<void> {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const { email } = this.requestForm.getRawValue();

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.forgotPassword(email);
      this.email.set(email);
      this.awaitingReset.set(true);
      this.success.set('Check your email for a reset code.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not send reset code');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onResetPassword(): Promise<void> {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { code, newPassword, confirmPassword } = this.resetForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.confirmForgotPassword(this.email(), code, newPassword);
      await this.router.navigate(['/login']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Password reset failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onResendCode(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.forgotPassword(this.email());
      this.success.set('A new reset code has been sent.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not resend code');
    } finally {
      this.loading.set(false);
    }
  }
}
