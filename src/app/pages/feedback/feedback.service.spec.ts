import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Feedback } from './feedback.models';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  const feedbackUrl = 'https://xxxxxxxxx.execute-api.eu-north-1.amazonaws.com/dev/feedback';
  const feedback: Feedback = {
    id: 'feedback-1',
    source: 'lime-boost-starter',
    email: 'user@example.com',
    status: 'sent',
    name: 'Ada',
    description: 'Great starter.',
    userId: 'sub-1',
    timestamp: '2026-08-26T00:00:00.000Z',
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    try {
      localStorage.removeItem('lime-boost-starter.feedback-ids');
      localStorage.removeItem('lime-boost-starter.feedback-items');
    } catch {
      // Node test runner may omit localStorage.
    }
  });

  it('posts feedback to the API Gateway table URL', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.send(feedback));

    const request = http.expectOne(feedbackUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(feedback);
    request.flush({ success: true, id: feedback.id });

    await expect(response).resolves.toEqual({ success: true, id: feedback.id });
    http.verify();
  });

  it('loads every row with GET ALL /feedback', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.getAll());

    const request = http.expectOne(feedbackUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    request.flush(JSON.stringify([feedback]));

    await expect(response).resolves.toEqual([feedback]);
    http.verify();
  });

  it('does not treat GET ALL empty-string rows as table content', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.getAll());
    http.expectOne(feedbackUrl).flush(
      JSON.stringify([
        {
          id: '',
          name: '',
          email: '',
          description: '',
          status: '',
          timestamp: '',
          source: '',
          userId: '',
        },
      ]),
    );

    await expect(response).resolves.toEqual([]);
    expect(service.listingIncomplete).toBe(true);
    http.verify();
  });

  it('fills GET ALL rows from GET /{id} when Scan omits item fields', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.getAll());

    http.expectOne(feedbackUrl).flush(JSON.stringify([{ id: feedback.id }]));
    http.expectOne(`${feedbackUrl}/${feedback.id}`).flush(
      JSON.stringify({
        id: feedback.id,
        source: feedback.source,
        email: feedback.email,
        status: feedback.status,
        name: feedback.name,
        description: feedback.description,
        userId: feedback.userId,
        timestamp: feedback.timestamp,
      }),
    );

    await expect(response).resolves.toEqual([feedback]);
    http.verify();
  });

  it('reads one feedback item from DynamoDB through GET /{id}', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.get(feedback.id));

    const request = http.expectOne(`${feedbackUrl}/${feedback.id}`);
    expect(request.request.method).toBe('GET');
    request.flush(
      JSON.stringify({
        id: feedback.id,
        source: feedback.source,
        email: feedback.email,
        status: feedback.status,
        name: feedback.name,
        description: feedback.description,
        userId: feedback.userId,
        timestamp: feedback.timestamp,
      }),
    );

    await expect(response).resolves.toEqual(feedback);
    http.verify();
  });

  it('returns null when GetItem finds no DynamoDB row', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.get(feedback.id));

    http.expectOne(`${feedbackUrl}/${feedback.id}`).flush('{}');

    await expect(response).resolves.toBeNull();
    http.verify();
  });

  it('loads every DynamoDB Scan page', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const second: Feedback = { ...feedback, id: 'feedback-2', name: 'Grace' };
    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.list());

    http
      .expectOne((req) => req.url === feedbackUrl && !req.params.has('ExclusiveStartKey'))
      .flush(
        JSON.stringify({
          Items: [
            {
              id: { S: feedback.id },
              source: { S: feedback.source },
              email: { S: feedback.email },
              status: { S: feedback.status },
              name: { S: feedback.name },
              description: { S: feedback.description },
              userId: { S: feedback.userId },
              timestamp: { S: feedback.timestamp },
            },
          ],
          LastEvaluatedKey: { id: { S: feedback.id } },
        }),
      );

    http
      .expectOne((req) => req.url === feedbackUrl && req.params.has('ExclusiveStartKey'))
      .flush(
        JSON.stringify({
          Items: [
            {
              id: { S: second.id },
              source: { S: second.source },
              email: { S: second.email },
              status: { S: second.status },
              name: { S: second.name },
              description: { S: second.description },
              userId: { S: second.userId },
              timestamp: { S: second.timestamp },
            },
          ],
        }),
      );

    await expect(response).resolves.toEqual([feedback, second]);
    http.verify();
  });

  it('unwraps DynamoDB Scan items', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.list());

    http.expectOne(feedbackUrl).flush(
      JSON.stringify({
        Items: [
          {
            id: { S: feedback.id },
            source: { S: feedback.source },
            email: { S: feedback.email },
            status: { S: feedback.status },
            name: { S: feedback.name },
            description: { S: feedback.description },
            userId: { S: feedback.userId },
            timestamp: { S: feedback.timestamp },
          },
        ],
      }),
    );

    await expect(response).resolves.toEqual([feedback]);
    http.verify();
  });

  it('loads remembered DynamoDB rows with GetItem when Scan returns no JSON', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const sent = firstValueFrom(service.send(feedback));
    http.expectOne(feedbackUrl).flush({ success: true, id: feedback.id });
    await sent;

    const response = firstValueFrom(service.list());
    http.expectOne(feedbackUrl).flush('                                                       \n');
    http.expectOne(`${feedbackUrl}/${feedback.id}`).flush(
      JSON.stringify({
        id: feedback.id,
        source: feedback.source,
        email: feedback.email,
        status: feedback.status,
        name: feedback.name,
        description: feedback.description,
        userId: feedback.userId,
        timestamp: feedback.timestamp,
      }),
    );

    await expect(response).resolves.toEqual([feedback]);
    http.verify();
  });

  it('does not keep a cached row when GetItem finds no DynamoDB item', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const sent = firstValueFrom(service.send(feedback));
    http.expectOne(feedbackUrl).flush({ success: true, id: feedback.id });
    await sent;

    const response = firstValueFrom(service.list());
    http.expectOne(feedbackUrl).flush('                                                       \n');
    http.expectOne(`${feedbackUrl}/${feedback.id}`).flush('{}');

    await expect(response).resolves.toEqual([]);
    expect(service.listingIncomplete).toBe(true);
    http.verify();
  });

  it('does not list cached rows when GET ALL is an empty JSON array', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const sent = firstValueFrom(service.send(feedback));
    http.expectOne(feedbackUrl).flush({ success: true, id: feedback.id });
    await sent;

    const response = firstValueFrom(service.list());
    http.expectOne(feedbackUrl).flush('[]');

    await expect(response).resolves.toEqual([]);
    expect(service.listingIncomplete).toBe(false);
    http.verify();
  });

  it('does not treat an unreadable Scan as an empty DynamoDB table', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.list());
    http.expectOne(feedbackUrl).flush('                                                       \n');

    await expect(response).resolves.toEqual([]);
    expect(service.listingIncomplete).toBe(true);
    http.verify();
  });

  it('maps HTTP errors to a readable message', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FeedbackService],
    });

    const service = TestBed.inject(FeedbackService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.send(feedback));

    http.expectOne(feedbackUrl).flush(
      { message: 'DynamoDB put failed' },
      { status: 500, statusText: 'Server Error' },
    );

    await expect(response).rejects.toThrow('DynamoDB put failed');
    http.verify();
  });
});
