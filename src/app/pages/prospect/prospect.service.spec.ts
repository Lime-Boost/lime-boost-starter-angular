import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProspectSearchQuery } from './prospect.models';
import { ProspectService } from './prospect.service';

describe('ProspectService', () => {
  const originalApiUrl = environment.apiUrl;
  const searchUrl = `${environment.apiUrl.replace(/\/+$/, '')}/v1/prospect/search-prospects`;
  const query: ProspectSearchQuery = {
    business: 'Wholesale bakery for restaurants',
    lookingFor: 'Independent cafes in Helsinki',
    industry: 'Hospitality',
    location: 'Helsinki',
    companySize: 'smb',
    keywords: 'wholesale, bread',
    userId: 'sub-1',
  };
  const match = {
    id: 'cafe-1',
    company: 'Harbour Cafe',
    industry: 'Hospitality',
    location: 'Helsinki',
    website: 'https://harbour.example',
    email: '',
    reason: 'Buys bread from local bakeries.',
  };

  afterEach(() => {
    environment.apiUrl = originalApiUrl;
    TestBed.resetTestingModule();
  });

  it('posts a prospect search to the API path under environment.apiUrl', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProspectService],
    });

    const service = TestBed.inject(ProspectService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.search(query));

    const request = http.expectOne(searchUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(query);
    request.flush({ summary: 'Two cafes fit.', matches: [match] });

    await expect(response).resolves.toEqual({ summary: 'Two cafes fit.', matches: [match] });
    http.verify();
  });

  it('accepts a results array from the search API', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProspectService],
    });

    const service = TestBed.inject(ProspectService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.search(query));

    http.expectOne(searchUrl).flush({ results: [match] });

    await expect(response).resolves.toEqual({ summary: '', matches: [match] });
    http.verify();
  });

  it('accepts a bare array from the search API', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProspectService],
    });

    const service = TestBed.inject(ProspectService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.search(query));

    http.expectOne(searchUrl).flush([match]);

    await expect(response).resolves.toEqual({ summary: '', matches: [match] });
    http.verify();
  });

  it('explains when the API base URL is missing', async () => {
    environment.apiUrl = '';

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProspectService],
    });

    const service = TestBed.inject(ProspectService);

    await expect(firstValueFrom(service.search(query))).rejects.toThrow(/apiUrl/);
  });

  it('maps HTTP errors to a readable message', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProspectService],
    });

    const service = TestBed.inject(ProspectService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(service.search(query));

    http.expectOne(searchUrl).flush(
      { message: 'Search failed' },
      { status: 500, statusText: 'Server Error' },
    );

    await expect(response).rejects.toThrow('Search failed');
    http.verify();
  });
});
