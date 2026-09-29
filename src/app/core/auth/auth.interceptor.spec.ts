import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor API boundaries', () => {
  const auth = {
    isAuthenticated: () => true,
    getAccessToken: vi.fn(async () => 'test-access-token'),
  };

  beforeEach(() => {
    auth.getAccessToken.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  for (const url of [
    `${environment.apiUrl}/v1/prospect/search-prospects`,
    `${environment.apiUrl}/v1/feedback/send-feedback`,
    'https://tlisvivwd2.execute-api.eu-north-1.amazonaws.com/prod/feedback/row-1',
  ]) {
    it(`attaches the access token to ${url}`, async () => {
      const result = firstValueFrom(TestBed.inject(HttpClient).post(url, {}));
      await Promise.resolve();
      const request = TestBed.inject(HttpTestingController).expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
      request.flush({});
      await result;
    });
  }

  for (const url of [
    'https://unrelated.example/data',
    'https://localhost.evil.test/data',
    `${environment.apiUrl}@evil.test/data`,
    `${environment.apiUrl}-untrusted/data`,
    'https://tlisvivwd2.execute-api.eu-north-1.amazonaws.com/prod/feedback-other',
  ]) {
    it(`does not disclose the token to ${url}`, async () => {
      const result = firstValueFrom(TestBed.inject(HttpClient).get(url));
      const request = TestBed.inject(HttpTestingController).expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(auth.getAccessToken).not.toHaveBeenCalled();
      request.flush({});
      await result;
    });
  }
});
