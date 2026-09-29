import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProspectMatch, ProspectSearchQuery, ProspectSearchResponse } from './prospect.models';

@Injectable({
  providedIn: 'root',
})
export class ProspectService {
  private readonly http = inject(HttpClient);
  private readonly searchUrl = `${environment.apiUrl.trim().replace(/\/+$/, '')}/v1/prospect/search-prospects`;

  search(query: ProspectSearchQuery) {
    if (!environment.apiUrl.trim()) {
      return throwError(() => this.missingApiUrlError());
    }

    return this.http.post<unknown>(this.searchUrl, query).pipe(
      map((body) => this.toSearchResult(body)),
      catchError((error: unknown) =>
        throwError(() => this.toError(error, 'Could not search for prospects')),
      ),
    );
  }

  private toSearchResult(body: unknown): { summary: string; matches: ProspectMatch[] } {
    if (Array.isArray(body)) {
      return { summary: '', matches: this.toMatches(body) };
    }

    if (!body || typeof body !== 'object') {
      return { summary: '', matches: [] };
    }

    const record = body as ProspectSearchResponse & Record<string, unknown>;
    const rows =
      record.prospects ??
      record.results ??
      record.matches ??
      record.companies ??
      record.items ??
      record.data ??
      [];

    return {
      summary: String(record.summary ?? record['message'] ?? ''),
      matches: Array.isArray(rows) ? this.toMatches(rows) : [],
    };
  }

  private toMatches(rows: unknown[]): ProspectMatch[] {
    return rows.map((row, index) => this.toMatch(row, index)).filter((row): row is ProspectMatch => row !== null);
  }

  private toMatch(row: unknown, index: number): ProspectMatch | null {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return null;
    }

    const item = row as Record<string, unknown>;
    const company = String(item['company'] ?? item['name'] ?? item['organization'] ?? '').trim();
    const reason = String(item['reason'] ?? item['fit'] ?? item['summary'] ?? item['description'] ?? '').trim();
    if (!company && !reason) {
      return null;
    }

    return {
      id: String(item['id'] ?? `${company || 'match'}-${index}`),
      company: company || 'Untitled company',
      industry: String(item['industry'] ?? item['sector'] ?? item['category'] ?? ''),
      location: String(item['location'] ?? item['city'] ?? item['region'] ?? item['market'] ?? ''),
      website: String(item['website'] ?? item['url'] ?? item['domain'] ?? ''),
      email: String(item['email'] ?? item['contact'] ?? ''),
      reason,
    };
  }

  private missingApiUrlError(): Error {
    return new Error(
      'Set apiUrl in src/environments/environment.ts to the API that searches for prospects.',
    );
  }

  private toError(error: unknown, fallback: string): Error {
    if (error instanceof HttpErrorResponse) {
      const message =
        typeof error.error === 'object' && error.error && 'message' in error.error
          ? String((error.error as { message?: string }).message)
          : error.message;
      return new Error(message || fallback);
    }

    return error instanceof Error ? error : new Error(fallback);
  }
}
