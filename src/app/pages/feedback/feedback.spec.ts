import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { FeedbackPage } from './feedback';
import { Feedback } from './feedback.models';
import { FeedbackService } from './feedback.service';

describe('FeedbackPage', () => {
  const existing: Feedback = {
    id: 'feedback-existing',
    source: 'lime-boost-starter',
    email: 'grace@example.com',
    status: 'sent',
    name: 'Grace Hopper',
    description: 'Ship it.',
    userId: 'sub-1',
    timestamp: '2026-08-25T00:00:00.000Z',
  };

  const feedbackService = {
    list: () => of([existing]),
    getAll: () => feedbackService.list(),
    get: (_id: string) => of(null as Feedback | null),
    send: (_feedback: Feedback) => of({ success: true }),
    listingIncomplete: false,
  };

  beforeEach(async () => {
    feedbackService.list = () => of([existing]);
    feedbackService.get = (_id: string) => of(null);
    feedbackService.send = (_feedback: Feedback) => of({ success: true });
    feedbackService.listingIncomplete = false;

    await TestBed.configureTestingModule({
      imports: [FeedbackPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: AuthService,
          useValue: {
            user: signal({ email: 'user@example.com', sub: 'sub-1' }),
          },
        },
        { provide: FeedbackService, useValue: feedbackService },
      ],
    }).compileComponents();
  });

  it('loads saved feedback into the table', async () => {
    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Grace Hopper');
    expect(fixture.nativeElement.textContent).toContain('Ship it.');
  });

  it('lists every row returned from DynamoDB', async () => {
    const other: Feedback = {
      ...existing,
      id: 'feedback-2',
      name: 'Ada Lovelace',
      description: 'Add pagination.',
      timestamp: '2026-08-24T00:00:00.000Z',
    };
    feedbackService.list = () => of([existing, other]);

    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Grace Hopper');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Ship it.');
    expect(text).toContain('Add pagination.');
  });

  it('shows newly sent feedback after reloading every DynamoDB row', async () => {
    const fromDynamoDb: Feedback = {
      ...existing,
      id: 'feedback-from-ddb',
      name: 'Ada',
      description: 'Please add dark mode.',
      timestamp: '2026-08-26T12:00:00.000Z',
    };
    feedbackService.list = () => of([fromDynamoDb, existing]);

    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Please add dark mode.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const text = host.textContent ?? '';
    expect(text).toContain('Please add dark mode.');
    expect(text).toContain('Thanks. Your feedback was saved to the feedback DynamoDB table.');
    expect(text.indexOf('Please add dark mode.')).toBeLessThan(text.indexOf('Ship it.'));
  });

  it('reloads every row when Load all is clicked', async () => {
    const other: Feedback = {
      ...existing,
      id: 'feedback-2',
      name: 'Ada Lovelace',
      description: 'Add pagination.',
    };
    feedbackService.list = () => of([existing]);

    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();

    feedbackService.list = () => of([existing, other]);
    const button = (fixture.nativeElement as HTMLElement).querySelector('.load-all') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Add pagination.');
  });

  it('shows an error when the API rejects the save', async () => {
    feedbackService.send = () => throwError(() => new Error('DynamoDB put failed'));

    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Please add dark mode.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('DynamoDB put failed');
  });

  it('does not claim DynamoDB is empty when the list API omitted rows', async () => {
    feedbackService.list = () => of([]);
    feedbackService.listingIncomplete = true;

    const fixture = TestBed.createComponent(FeedbackPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('GET ALL returned empty id, name, and description');
    expect(text).not.toContain('No feedback in DynamoDB yet');
  });
});
