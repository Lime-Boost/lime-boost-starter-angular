import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Feedback } from './feedback.models';
import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-feedback',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './feedback.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './feedback.scss',
})
export class FeedbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly tableName = 'feedback';
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly listError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingList = signal(false);
  protected readonly listingIncomplete = signal(false);
  protected readonly feedbacks = signal<Feedback[]>([]);

  protected readonly form = this.fb.group({
    name: [''],
    email: [this.auth.user()?.email ?? '', [Validators.required, Validators.email]],
    description: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    await this.loadFeedbacks();
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { name, email, description } = this.form.getRawValue();
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      source: 'lime-boost-starter',
      email,
      status: 'sent',
      name,
      description,
      userId: this.auth.user()?.sub ?? 'anonymous',
      timestamp: new Date().toISOString(),
    };

    try {
      await firstValueFrom(this.feedbackService.send(feedback));
      await this.loadFeedbacks();
      this.success.set(`Thanks. Your feedback was saved to the ${this.tableName} DynamoDB table.`);
      this.form.controls.description.reset('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save feedback');
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadAll(): Promise<void> {
    await this.loadFeedbacks();
  }

  private async loadFeedbacks(): Promise<void> {
    this.loadingList.set(true);
    this.listError.set(null);

    try {
      const rows = await firstValueFrom(this.feedbackService.getAll());
      console.log('Feedback table rows', rows);
      this.listingIncomplete.set(this.feedbackService.listingIncomplete);
      this.feedbacks.set(this.sortByNewest(rows));
    } catch (error) {
      this.listError.set(error instanceof Error ? error.message : 'Could not load feedback');
    } finally {
      this.loadingList.set(false);
    }
  }

  private sortByNewest(rows: Feedback[]): Feedback[] {
    return [...rows].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }
}
