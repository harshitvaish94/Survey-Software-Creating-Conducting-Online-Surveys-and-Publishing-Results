import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SurveyCreate from './SurveyCreate'

function reply(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

async function submit(title = 'Course Feedback') {
  render(
    <MemoryRouter>
      <SurveyCreate />
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Survey title/), title)
  await user.click(screen.getByRole('button', { name: 'Create Survey' }))
}

describe('SurveyCreate', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends the session cookie when creating a survey', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => reply(201, { id: 7, title: 'Course Feedback' }))
    await submit()
    expect(await screen.findByText(/saved successfully with Draft status\. ID: 7/)).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/surveys$/)
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('include')
    expect(JSON.parse(String(init?.body))).toMatchObject({ title: 'Course Feedback' })
    expect(screen.getByRole('button', { name: 'Add questions' })).toBeInTheDocument()
  })

  it('shows the server message when the request is refused', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      reply(403, { message: 'You do not have permission to do this.' }),
    )
    await submit()
    expect(await screen.findByText('You do not have permission to do this.')).toBeInTheDocument()
  })
})
