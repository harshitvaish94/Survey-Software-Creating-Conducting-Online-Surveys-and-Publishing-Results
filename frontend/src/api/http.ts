export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** JSON request helper. Turns Nest error bodies (string or string[] messages) into ApiError. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0)
  }

  if (response.status === 204) return undefined as T
  const data = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message
    throw new ApiError(message || `Request failed (${response.status}).`, response.status)
  }
  return data as T
}
