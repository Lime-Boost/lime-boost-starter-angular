import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ProspectMatch } from './prospect.models';
import { ProspectService } from './prospect.service';

@Component({
  selector: 'app-prospect',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './prospect.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './prospect.scss',
})
export class ProspectPage {
  private readonly auth = inject(AuthService);
  private readonly prospectService = inject(ProspectService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly summary = signal('');
  protected readonly matches = signal<ProspectMatch[]>([]);

  protected readonly form = this.fb.group({
    business: ['', Validators.required],
    lookingFor: ['', Validators.required],
    industry: [''],
    location: [''],
    companySize: ['any'],
    keywords: [''],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { business, lookingFor, industry, location, companySize, keywords } = this.form.getRawValue();

    try {
      const result = await firstValueFrom(
        this.prospectService.search({
          business,
          lookingFor,
          industry,
          location,
          companySize,
          keywords,
          userId: this.auth.user()?.sub ?? 'anonymous',
        }),
      );
      this.searched.set(true);
      this.summary.set(result.summary.trim());
      this.matches.set(result.matches);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not search for prospects');
    } finally {
      this.loading.set(false);
    }
  }

  protected websiteHref(website: string): string {
    const trimmed = website.trim();
    if (!trimmed) {
      return '';
    }

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
}
