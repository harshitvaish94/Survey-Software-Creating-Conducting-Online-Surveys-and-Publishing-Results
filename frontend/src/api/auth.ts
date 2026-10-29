export interface AuthUser {
  email: string
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function login(email: string, password: string): Promise<AuthUser> {
  await delay(300)
  if (!email.includes('@') || password.length < 8) throw new Error('Invalid email or password')
  return { email }
}

export async function register(email: string, password: string): Promise<AuthUser> {
  await delay(300)
  if (!email.includes('@') || password.length < 8)
    throw new Error('Use a valid email and a password of 8+ characters')
  return { email }
}