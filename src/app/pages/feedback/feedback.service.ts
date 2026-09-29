import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap, tap, throwError, type Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Feedback, FeedbackListResponse, FeedbackResponse } from './feedback.models';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/feedback/send-feedback`;
  private readonly jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  // If API Gateway is connected to a domain use mydomain.com/table-name
  private readonly testApiUrl =
    // If API Gateway hasn't connected to a domain yet you can use for testing.
    // https://api-gateway-id.execute-api.eu-north-1.amazonaws.com/dev/table-name
    'https://api-gateway-id.execute-api.eu-north-1.amazonaws.com/dev/table-name';


  listingIncomplete = false;

  send(feedback: Feedback) {
    if (!this.tableUrl.trim()) {
      return throwError(() => this.missingApiUrlError('writes'));
    }

    return this.http.post<FeedbackResponse>(this.tableUrl, feedback).pipe(
      tap((response) => {
        console.log('POST /feedback response', response);
        this.rememberItem(feedback);
      }),
      catchError((error: unknown) => throwError(() => this.toError(error, 'Could not save feedback'))),
    );
  }

  list(): Observable<Feedback[]> {
    return this.getAll();
  }

  /** GET ALL /feedback — DynamoDB Scan of every row. */
  getAll(): Observable<Feedback[]> {
    if (!this.tableUrl.trim()) {
      return throwError(() => this.missingApiUrlError('reads'));
    }

    this.listingIncomplete = false;

    return this.scanAllPages().pipe(
      switchMap((scan) => {
        this.listingIncomplete = !!scan.unreadable;

        if (scan.items.length > 0) {
          this.listingIncomplete = false;
          return this.hydrateRows(scan.items).pipe(tap((items) => this.replaceCache(items)));
        }

        if (scan.unreadable) {
          this.listingIncomplete = true;
          return this.loadFallbackItems();
        }

        this.clearCache();
        return of([]);
      }),
      tap((items) => console.log('GET ALL /feedback items', items)),
      catchError((error: unknown) => throwError(() => this.toError(error, 'Could not load feedback'))),
    );
  }

  get(id: string) {
    if (!this.tableUrl.trim()) {
      return throwError(() => this.missingApiUrlError('reads'));
    }

    return this.http
      .get(`${this.tableUrl}/${encodeURIComponent(id)}`, {
        headers: this.jsonHeaders,
        responseType: 'text',
      })
      .pipe(
        tap((body) => console.log(`GET /feedback/${id} response`, body)),
        map((body) => this.parseItem(body)),
        tap((item) => console.log(`GET /feedback/${id} parsed`, item)),
        catchError((error: unknown) => throwError(() => this.toError(error, 'Could not load feedback'))),
      );
  }

  private get tableUrl(): string {
    return this.testApiUrl.trim();
  }

  private readonly maxScanPages = 50;

  private scanAllPages(
    exclusiveStartKey?: Record<string, unknown>,
    page = 0,
  ): Observable<{
    items: Feedback[];
    lastEvaluatedKey?: Record<string, unknown>;
    unreadable?: boolean;
  }> {
    return this.scanPage(exclusiveStartKey).pipe(
      switchMap((result) => {
        if (!result.lastEvaluatedKey || page + 1 >= this.maxScanPages) {
          return of(result);
        }

        return this.scanAllPages(result.lastEvaluatedKey, page + 1).pipe(
          map((rest) => ({
            items: result.items.concat(rest.items),
            lastEvaluatedKey: rest.lastEvaluatedKey,
            unreadable: !!result.unreadable || !!rest.unreadable,
          })),
        );
      }),
    );
  }

  private scanPage(exclusiveStartKey?: Record<string, unknown>) {
    return this.http
      .get(this.tableUrl, {
        headers: this.jsonHeaders,
        responseType: 'text',
        params: exclusiveStartKey
          ? { ExclusiveStartKey: JSON.stringify(exclusiveStartKey) }
          : undefined,
      })
      .pipe(
        tap((body) => console.log('GET ALL /feedback response', body)),
        map((body) => this.parseScanPage(body)),
        tap((parsed) => console.log('GET ALL /feedback parsed', parsed)),
      );
  }

  private parseScanPage(body: string): {
    items: Feedback[];
    lastEvaluatedKey?: Record<string, unknown>;
    unreadable?: boolean;
  } {
    const trimmed = body.trim();
    if (!trimmed) {
      return { items: [], unreadable: body.length > 8 };
    }

    let parsed = this.parseJson(body);
    if (typeof parsed === 'string') {
      parsed = this.parseJson(parsed);
    }
    if (parsed === null) {
      return { items: [], unreadable: trimmed !== '{}' };
    }

    if (Array.isArray(parsed)) {
      const items = this.toFeedbackRows(parsed);
      if (parsed.length > 0 && items.length === 0) {
        return { items: [], unreadable: true };
      }
      return { items };
    }

    if (typeof parsed !== 'object') {
      return { items: [] };
    }

    const record = parsed as FeedbackListResponse & Record<string, unknown>;
    let items: Feedback[] = [];

    if (Array.isArray(record.feedbacks)) {
      items = this.toFeedbackRows(record.feedbacks);
    } else if (Array.isArray(record.Items) || Array.isArray(record['items'])) {
      const rawItems = (record.Items ?? record['items']) as unknown[];
      items = this.toFeedbackRows(rawItems);
      if (rawItems.length > 0 && items.length === 0) {
        return { items: [], unreadable: true };
      }
    } else {
      const item = this.toFeedback(parsed);
      items = item ? [item] : [];
    }

    const rawKey = record.LastEvaluatedKey ?? record['lastEvaluatedKey'];
    const lastEvaluatedKey =
      rawKey && typeof rawKey === 'object' && !Array.isArray(rawKey) && Object.keys(rawKey).length > 0
        ? (rawKey as Record<string, unknown>)
        : undefined;

    return { items, lastEvaluatedKey };
  }

  private readonly idStorageKey = 'lime-boost-starter.feedback-ids';
  private readonly itemStorageKey = 'lime-boost-starter.feedback-items';
  private readonly rememberedIds = new Set<string>();
  private readonly cachedItems = new Map<string, Feedback>();

  private loadFallbackItems(): Observable<Feedback[]> {
    const ids = this.storedIds();
    if (ids.length === 0) {
      return of([]);
    }

    return forkJoin(ids.map((id) => this.get(id).pipe(catchError(() => of(null))))).pipe(
      map((rows) => {
        const remote = rows.filter((row): row is Feedback => row !== null);
        this.replaceCache(remote);
        return remote;
      }),
    );
  }

  private rememberItem(item: Feedback): void {
    this.rememberId(item.id);
    this.cacheItem(item);
  }

  private rememberId(id: string): void {
    if (!id) {
      return;
    }

    this.rememberedIds.add(id);
    this.writeStorage();
  }

  private replaceCache(items: Feedback[]): void {
    this.cachedItems.clear();
    this.rememberedIds.clear();
    for (const item of items) {
      this.rememberItem(item);
    }
    this.writeStorage();
    this.writeItemStorage();
  }

  private clearCache(): void {
    this.cachedItems.clear();
    this.rememberedIds.clear();
    try {
      localStorage.removeItem(this.idStorageKey);
      localStorage.removeItem(this.itemStorageKey);
    } catch {
      // Storage is optional.
    }
  }

  private cacheItem(item: Feedback): void {
    if (!item.id) {
      return;
    }

    this.cachedItems.set(item.id, item);
    this.rememberId(item.id);
    this.writeItemStorage();
  }

  private storedIds(): string[] {
    for (const id of this.readStorage()) {
      this.rememberedIds.add(id);
    }

    for (const item of this.readCachedItems()) {
      this.rememberedIds.add(item.id);
    }

    return [...this.rememberedIds];
  }

  private readStorage(): string[] {
    try {
      const raw = localStorage.getItem(this.idStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private writeStorage(): void {
    try {
      for (const id of this.readStorage()) {
        this.rememberedIds.add(id);
      }
      localStorage.setItem(this.idStorageKey, JSON.stringify([...this.rememberedIds]));
    } catch {
      // Storage is optional; in-memory ids still load this session.
    }
  }

  private writeItemStorage(): void {
    try {
      localStorage.setItem(this.itemStorageKey, JSON.stringify([...this.cachedItems.values()]));
    } catch {
      // Storage is optional; in-memory items still load this session.
    }
  }

  private readCachedItems(): Feedback[] {
    try {
      const raw = localStorage.getItem(this.itemStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          const item = this.toFeedback(row);
          if (item) {
            this.cachedItems.set(item.id, item);
          }
        }
      }
    } catch {
      // Ignore unreadable cache.
    }

    return [...this.cachedItems.values()];
  }

  private parseItem(body: string): Feedback | null {
    const parsed = this.parseJson(body);
    if (parsed === null || parsed === undefined) {
      return null;
    }

    if (typeof parsed === 'object' && !Array.isArray(parsed) && 'Item' in parsed) {
      return this.toFeedback((parsed as { Item: unknown }).Item);
    }

    return this.toFeedback(parsed);
  }

  private parseJson(body: string): unknown {
    const trimmed = body.trim();
    if (!trimmed || trimmed === '{}') {
      return null;
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  private toFeedbackRows(rows: unknown[]): Feedback[] {
    return rows.map((row) => this.toFeedback(row)).filter((row): row is Feedback => row !== null);
  }

  private hydrateRows(rows: Feedback[]): Observable<Feedback[]> {
    if (!rows.some((row) => this.isSparse(row))) {
      return of(rows);
    }

    return forkJoin(
      rows.map((row) => {
        if (!row.id || !this.isSparse(row)) {
          return of(row);
        }

        return this.get(row.id).pipe(
          map((full) => full ?? row),
          catchError(() => of(row)),
        );
      }),
    );
  }

  private isSparse(row: Feedback): boolean {
    return !row.name && !row.description && !row.email && !row.timestamp;
  }

  private toFeedback(row: unknown): Feedback | null {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return null;
    }

    const item = this.unwrapAttributes(row as Record<string, unknown>);
    if (Object.keys(item).length === 0) {
      return null;
    }

    const id = this.asText(item['id']);
    const name = this.asText(item['name']);
    const email = this.asText(item['email']);
    const description = this.asText(
      item['description'] ?? item['comment'] ?? item['feedback'] ?? item['message'] ?? item['text'],
    );
    const timestamp = this.asText(
      item['timestamp'] ?? item['createdAt'] ?? item['created_at'] ?? item['sentAt'],
    );

    if (!id && !name && !email && !description && !timestamp) {
      return null;
    }

    return {
      id: id || `${email}|${timestamp}|${description}|${name}`.slice(0, 160),
      source: this.asText(item['source']),
      email,
      status: this.asText(item['status']),
      name,
      description,
      userId: this.asText(item['userId'] ?? item['user_id']),
      timestamp,
    };
  }

  private asText(value: unknown): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private unwrapAttributes(row: Record<string, unknown>): Record<string, unknown> {
    const map = row['M'] ?? row['m'];
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      return this.unwrapAttributes(map as Record<string, unknown>);
    }

    const unwrapped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (key === 'M' || key === 'm') {
        continue;
      }

      unwrapped[key] = this.unwrapValue(value);
    }

    return unwrapped;
  }

  private unwrapValue(value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    const typed = value as Record<string, unknown>;
    if ('S' in typed || 's' in typed) {
      return typed['S'] ?? typed['s'];
    }
    if ('N' in typed || 'n' in typed) {
      return typed['N'] ?? typed['n'];
    }
    if ('BOOL' in typed || 'bool' in typed) {
      return typed['BOOL'] ?? typed['bool'];
    }
    if ('NULL' in typed || 'null' in typed) {
      return '';
    }
    if ('M' in typed || 'm' in typed) {
      return this.unwrapAttributes(typed);
    }
    if ('L' in typed || 'l' in typed) {
      const list = typed['L'] ?? typed['l'];
      return Array.isArray(list) ? list.map((entry) => this.unwrapValue(entry)) : '';
    }

    return value;
  }

  private missingApiUrlError(action: 'reads' | 'writes'): Error {
    return new Error(
      `Set the feedback API Gateway URL in FeedbackService to the API that ${action} the feedback DynamoDB table.`,
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
