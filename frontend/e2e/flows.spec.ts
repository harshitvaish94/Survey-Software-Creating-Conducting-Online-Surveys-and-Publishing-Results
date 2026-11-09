import { expect, test } from '@playwright/test'
import { API_URL, PASSWORD, createPublishedSurvey, login, register, uniqueEmail } from './helpers'

// SMS-38: the key user flows from the test plan, driven through the real UI, API and database.

test.describe('access control', () => {
  test('a logged-out visitor is sent to the login page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('wrong credentials are rejected with a message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(uniqueEmail('nobody'))
    await page.getByLabel(/^Password/).fill(PASSWORD)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('a password that is too short is rejected on the register page', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Email').fill(uniqueEmail('short'))
    await page.getByLabel(/^Password/).fill('short')
    await page.getByLabel('Confirm password').fill('short')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/register$/)
  })
})

test.describe.serial('creator and respondent journey', () => {
  const creator = uniqueEmail('creator')
  const title = `E2E feedback ${Date.now()}`
  const question = 'How was the workshop?'
  let surveyId = 0
  let shareLink = ''

  test('register and log in (TC-Auth-01)', async ({ page }) => {
    await register(page, creator)
    await login(page, creator)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Good')
    await expect(page.getByText('Nothing here yet')).toBeVisible()
  })

  test('create a survey, add a question and publish it (TC-Srv-01, TC-Srv-05)', async ({ page }) => {
    await login(page, creator)
    surveyId = await createPublishedSurvey(page, title, question)

    await page.goto('/dashboard')
    const card = page.locator('.survey-card', { hasText: title })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Published')
    const take = card.getByRole('link', { name: 'Take survey' })
    await expect(take).toBeVisible()
    // The link a creator shares (SMS-24 share slug), not the internal id.
    shareLink = (await take.getAttribute('href')) ?? ''
    expect(shareLink).toMatch(/^\/s\/[A-Za-z0-9_-]+$/)
    expect(shareLink).not.toBe(`/s/${surveyId}`)
  })

  test('a logged-out respondent can take and submit the survey (TC-Resp-01)', async ({ browser }) => {
    // A fresh context has no session cookie, like a person opening the shared link.
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(shareLink)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()

    // The question is required: submitting without an answer shows an error and stays on the page.
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toHaveCount(0)

    await page.getByLabel('Great').check()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible()
    await context.close()
  })

  test('another account cannot edit the creator\'s survey (TC-Auth-02)', async ({ page }) => {
    const other = uniqueEmail('other')
    await register(page, other)
    await login(page, other)

    await page.goto('/dashboard')
    await expect(page.locator('.survey-card', { hasText: title })).toHaveCount(0)

    await page.goto(`/surveys/${surveyId}/edit`)
    await expect(page.getByRole('button', { name: 'Publish survey' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
  })

  test('the creator sees the response in the results (TC-Res-01, TC-Res-02)', async ({ page, request }) => {
    // The results endpoint belongs to SMS-29. Skip until it exists, then this test turns itself on.
    const probe = await request.get(`${API_URL}/surveys/${surveyId}/results`)
    test.skip(probe.status() === 404, 'Results endpoint not available yet (SMS-29)')

    await login(page, creator)
    await page.goto(`/surveys/${surveyId}/results`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('1 response')).toBeVisible()
    await expect(page.getByRole('table').first()).toContainText('Great')
  })
})
