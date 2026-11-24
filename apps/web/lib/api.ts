import { useAuthStore } from './auth-store';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    const msg =
      typeof data.error === 'string'
        ? data.error
        : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    throw new ApiClientError(response.status, msg, data);
  }

  return data as T;
}
