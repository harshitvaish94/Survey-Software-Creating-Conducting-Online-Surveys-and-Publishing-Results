/**
 * SMS-33 / TC-Sec-04 (output encoding): text written by survey creators or respondents
 * is shown as plain text and never turned into HTML or run as script.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getResults, getSurvey } from '../api/surveys'
import type { Survey, SurveyResults } from '../api/surveys'
import ResultsPage from './ResultsPage'
import SurveyRespond from './SurveyRespond'

vi.mock('../api/surveys', () => ({ getSurvey: vi.fn(), submitResponse: vi.fn(), getResults: vi.fn() }))
// Charts draw on a canvas, which jsdom doesn't have; their labels come from the table anyway.
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Pie: () => null }))

const XSS = '<img src=x onerror="window.__pwned=true"><script>window.__pwned=true</script>'

function renderAt(path: string, route: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

/** No element was created from the payload and nothing ran. */
function expectInert(container: HTMLElement) {
  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('[onerror]')).toBeNull()
  expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
}

describe('script payloads are shown as text (SMS-33)', () => {
  afterEach(() => vi.clearAllMocks())

  it('on the page respondents fill in', async () => {
    const survey: Survey = {
      id: 1, title: XSS, description: XSS, openDate: null, closeDate: null,
      status: 'Published', ownerId: 1, createdAt: '', updatedAt: '',
      questions: [
        { id: 10, position: 0, text: XSS, type: 'single', options: [XSS, 'Safe'], ratingMin: null, ratingMax: null, mandatory: true },
      ],
    }
    vi.mocked(getSurvey).mockResolvedValue(survey)
    const { container } = renderAt('/s/1', '/s/:id', <SurveyRespond />)

    expect(await screen.findByRole('heading', { name: XSS })).toBeInTheDocument()
    expect(screen.getAllByLabelText(XSS).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(XSS).length).toBeGreaterThanOrEqual(3)
    expectInert(container)
  })

  it('on the results page, including respondents\' free-text answers', async () => {
    const results = {
      surveyId: 1,
      title: XSS,
      totalResponses: 1,
      questions: [
        { id: 10, type: 'single', text: XSS, answered: 1, counts: [{ label: XSS, count: 1, percent: 100 }] },
        { id: 11, type: 'text', text: 'Comments', answered: 1, textAnswers: [XSS] },
      ],
    } as unknown as SurveyResults
    vi.mocked(getResults).mockResolvedValue(results)
    const { container } = renderAt('/surveys/1/results', '/surveys/:id/results', <ResultsPage />)

    expect(await screen.findByRole('heading', { name: XSS })).toBeInTheDocument()
    expect(screen.getAllByText(XSS).length).toBeGreaterThanOrEqual(3)
    expectInert(container)
  })

  it('the app never injects raw HTML anywhere', async () => {
    const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true })
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith('.test.tsx'))
      .filter(([, code]) => /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML/.test(String(code)))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
