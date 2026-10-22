/** Normalised error thrown by every service call. Laravel shapes:
 *  422 -> { message, errors: { field: [msg] } }, 429 -> Retry-After header, others -> { message }. */
export class ApiError extends Error {
  constructor({ status = 0, message, errors = {}, retryAfter = null, code = 'unknown' }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
    this.code = code;
  }
  get isValidation() { return this.status === 422; }
  get isNetwork() { return this.status === 0; }
  /** First message for a field, ready to pass to <Input error={...} />. */
  field(name) { return this.errors?.[name]?.[0]; }
}

export function toApiError(err) {
  if (err instanceof ApiError) return err;
  const res = err.response;
  if (!res) return new ApiError({ status: 0, message: err.message, code: 'network' });
  const { status, data = {}, headers = {} } = res;
  const codes = { 401: 'unauthenticated', 403: 'forbidden', 404: 'not_found', 419: 'csrf', 422: 'validation', 429: 'rate_limited' };
  return new ApiError({
    status, message: data.message, errors: data.errors,
    retryAfter: headers['retry-after'] ? Number(headers['retry-after']) : null,
    code: codes[status] ?? (status >= 500 ? 'server' : 'unknown'),
  });
}
