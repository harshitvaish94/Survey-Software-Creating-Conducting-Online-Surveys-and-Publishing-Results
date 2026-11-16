declare global {
  interface Window {
    /** Written by public/config.js; the production container fills in apiUrl from API_URL. */
    __APP_CONFIG__?: { apiUrl?: string }
  }
}

/**
 * Where the API lives, in order of preference:
 * 1. apiUrl from config.js (set when the container starts, so one image works everywhere)
 * 2. VITE_API_URL at build time
 * 3. this host on port 3000 (local development)
 */
export function resolveApiBase(
  config: { apiUrl?: string } | undefined,
  buildTimeUrl: string | undefined,
  location: Pick<Location, 'protocol' | 'hostname'>,
): string {
  const configured = config?.apiUrl?.trim() || buildTimeUrl?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return `${location.protocol}//${location.hostname}:3000`
}

export const API_BASE: string = resolveApiBase(
  window.__APP_CONFIG__,
  import.meta.env.VITE_API_URL as string | undefined,
  window.location,
)

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** JSON request helper. Turns Nest error bodies into ApiError. */
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      // Send the HTTP-only session cookie with every API call (SMS-14).
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0)
  }

  if (response.status === 204) return undefined as T

  const data = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message

    throw new ApiError(
      message || `Request failed (${response.status}).`,
      response.status,
    )
  }

  return data as T
}