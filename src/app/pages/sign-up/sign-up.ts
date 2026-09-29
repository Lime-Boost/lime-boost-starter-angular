import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PasswordInput } from '../../shared/password-input/password-input';

@Component({
  selector: 'app-sign-up',
  imports: [PasswordInput, ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sign-up.scss',
})
export class SignUp {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly awaitingConfirmation = signal(false);
  protected readonly email = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  protected readonly confirmationForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const status = await this.auth.signUp(email, password);
      this.email.set(email);

      if (status === 'confirmation_required') {
        this.awaitingConfirmation.set(true);
        this.success.set('Check your email for a verification code.');
        return;
      }

      await this.router.navigate(['/login']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onConfirm(): Promise<void> {
    if (this.confirmationForm.invalid) {
      this.confirmationForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.confirmSignUp(this.email(), this.confirmationForm.controls.code.value);
      await this.router.navigate(['/login']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onResendCode(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.resendConfirmationCode(this.email());
      this.success.set('A new verification code has been sent.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not resend code');
    } finally {
      this.loading.set(false);
    }
  }
}
