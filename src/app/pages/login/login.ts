import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PasswordInput } from '../../shared/password-input/password-input';

@Component({
  selector: 'app-login',
  imports: [PasswordInput, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly needsNewPassword = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly newPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    try {
      const status = await this.auth.signIn(email, password);

      if (status === 'new_password_required') {
        this.needsNewPassword.set(true);
        return;
      }

      await this.navigateAfterSignIn();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onCompleteNewPassword(): Promise<void> {
    if (this.newPasswordForm.invalid) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.newPasswordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.completeNewPassword(newPassword);
      await this.navigateAfterSignIn();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Password update failed');
    } finally {
      this.loading.set(false);
    }
  }

  private async navigateAfterSignIn(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/home';
    await this.router.navigateByUrl(target);
  }
}
