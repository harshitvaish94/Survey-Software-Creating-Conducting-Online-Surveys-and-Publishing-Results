import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

export const PASSWORD = 'Passw0rd!e2e'

/** A fresh address per run, because the database keeps the accounts from earlier runs. */
export function uniqueEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

export async function register(page: Page, email: string, password = PASSWORD) {
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

/** Creates a draft with one required single-choice question, publishes it and returns its id. */
export async function createPublishedSurvey(page: Page, title: string, question: string): Promise<number> {
  await page.goto('/surveys/new')
  await page.getByLabel(/^Survey title/).fill(title)
  await page.getByRole('button', { name: 'Create Survey' }).click()
  await page.getByRole('button', { name: 'Add questions' }).click()
  await expect(page).toHaveURL(/\/surveys\/(\d+)\/edit$/)
  const id = Number(page.url().match(/\/surveys\/(\d+)\/edit/)![1])

  // A new survey starts with no questions.
  await page.getByRole('button', { name: '+ Add a question' }).click()
  await page.getByLabel('Question 1 text').fill(question)
  await page.getByRole('textbox', { name: 'Option 1', exact: true }).fill('Great')
  await page.getByRole('textbox', { name: 'Option 2', exact: true }).fill('Okay')
  await page.getByRole('radio', { name: 'Required' }).check()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Publish survey' }).click()
  await expect(page.getByText('Survey published.')).toBeVisible()
  return id
}
