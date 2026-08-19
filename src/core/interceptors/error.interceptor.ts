import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

const RETRYABLE_STATUS_CODES = [0, 429, 500, 502, 503, 504];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  const stream$ = next(req);

  if (isMutating) {
    return stream$.pipe(catchError(handleError));
  }

  return stream$.pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error: HttpErrorResponse, attempt) => {
        if (!RETRYABLE_STATUS_CODES.includes(error.status)) {
          return throwError(() => error);
        }
        return timer(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      },
    }),
    catchError(handleError)
  );
};

function handleError(error: HttpErrorResponse): Observable<never> {
  const message =
    error.error?.message ??
    (error.status === 0 ? 'Network error. Check your connection.' : `Server error: ${error.status}`);
  return throwError(() => ({ ...error, userMessage: message }));
}
