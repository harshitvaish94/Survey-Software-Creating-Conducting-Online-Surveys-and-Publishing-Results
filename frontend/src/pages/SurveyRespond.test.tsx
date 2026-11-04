import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SurveyRespond from './SurveyRespond'
import { getSurvey, submitResponse } from '../api/surveys'
import type { Survey } from '../api/surveys'

vi.mock('../api/surveys', () => ({ getSurvey: vi.fn(), submitResponse: vi.fn() }))

const survey: Survey = {
  id: 1, title: 'Feedback', description: null, openDate: null, closeDate: null,
  status: 'Published', createdAt: '', updatedAt: '',
  questions: [
    { id: 10, position: 0, text: 'Pick one', type: 'single', options: ['A', 'B'], ratingMin: null, ratingMax: null, mandatory: true },
    { id: 11, position: 1, text: 'Comments', type: 'text', options: null, ratingMin: null, ratingMax: null, mandatory: false },
  ],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/s/1']}>
      <Routes>
        <Route path="/s/:id" element={<SurveyRespond />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SurveyRespond', () => {
  beforeEach(() => {
    vi.mocked(getSurvey).mockReset().mockResolvedValue(survey)
    vi.mocked(submitResponse).mockReset().mockResolvedValue({ id: 1 })
  })

  it('blocks submission while a mandatory question is unanswered', async () => {
    renderPage()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Submit response' }))
    expect(submitResponse).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toContain('This question is required.')
  })

  it('submits once the mandatory question is answered and the optional one is empty', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('B'))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(submitResponse).toHaveBeenCalledWith(1, { '10': 'B' })
    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
  })

  it('shows the server error when submission fails', async () => {
    vi.mocked(submitResponse).mockRejectedValue(new Error('Server says no'))
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('A'))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(await screen.findByText('Server says no')).toBeInTheDocument()
  })

  it('does not accept responses for a draft survey', async () => {
    vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Draft' })
    renderPage()
    expect(await screen.findByText('This survey is not accepting responses.')).toBeInTheDocument()
  })
})
