import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

function isTrustedApi(url: string): boolean {
  const bases = [
    environment.apiUrl,
    environment.apiUrl,
    // The existing feedback service uses this table endpoint.
    'https://tlisvivwd2.execute-api.eu-north-1.amazonaws.com/prod/feedback',
  ];
  return bases.some((base) => {
    if (!base.trim()) return false;
    try {
      const target = new URL(url, window.location.origin);
      const allowed = new URL(base.trim(), window.location.origin);
      const path = allowed.pathname.replace(/\/+$/, '');
      return target.origin === allowed.origin &&
        (target.pathname === path || target.pathname.startsWith(`${path}/`));
    } catch {
      return false;
    }
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isTrustedApi(req.url)) {
    return next(req);
  }
  const auth = inject(AuthService);

  if (!auth.isAuthenticated()) {
    return next(req);
  }

  return from(auth.getAccessToken()).pipe(
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    ),
  );
};
