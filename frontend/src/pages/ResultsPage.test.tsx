import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResultsPage from './ResultsPage'
import { getResults } from '../api/surveys'
import type { SurveyResults } from '../api/surveys'

vi.mock('../api/surveys', () => ({ getResults: vi.fn() }))
vi.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
}))

const results: SurveyResults = {
  surveyId: 1,
  title: 'Feedback',
  totalResponses: 4,
  questions: [
    { id: 1, type: 'single', text: 'Pick one', counts: [{ label: 'A', count: 3 }, { label: 'B', count: 1 }] },
    { id: 2, type: 'multiple', text: 'Pick many', counts: [{ label: 'X', count: 2 }, { label: 'Y', count: 2 }] },
    { id: 3, type: 'rating', text: 'Rate it', average: 4.25, totalRatings: 4 },
    { id: 4, type: 'text', text: 'Comments', textAnswers: ['Great', 'Okay'] },
  ],
}

function renderPage(path = '/surveys/1/results') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/surveys/:id/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.mocked(getResults).mockReset().mockResolvedValue(results)
  })

  it('shows a pie chart and a table for single choice, and a bar chart for multiple choice', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Feedback' })).toBeInTheDocument()
    expect(screen.getByText('4 responses')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'A 3 75%' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'B 1 25%' })).toBeInTheDocument()
  })

  it('shows the rating average and the text answers', async () => {
    renderPage()
    expect(await screen.findByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('Great')).toBeInTheDocument()
    expect(screen.getByText('Okay')).toBeInTheDocument()
  })

  it('shows a friendly message when there are no responses yet', async () => {
    vi.mocked(getResults).mockResolvedValue({ ...results, totalResponses: 0 })
    renderPage()
    expect(await screen.findByText('No responses yet')).toBeInTheDocument()
  })

  it('shows an error and lets the user try again', async () => {
    vi.mocked(getResults).mockRejectedValueOnce(new Error('Access denied to survey results'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied to survey results')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Feedback' })).toBeInTheDocument()
    expect(getResults).toHaveBeenCalledTimes(2)
  })
})
