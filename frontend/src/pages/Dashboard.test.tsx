import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { listSurveys } from '../api/surveys'
import type { Survey } from '../api/surveys'
import { AuthContext } from '../auth/context'
import Dashboard from './Dashboard'

vi.mock('../api/surveys', () => ({ listSurveys: vi.fn() }))

const base = {
  description: null, openDate: null, closeDate: null, ownerId: 1,
  createdAt: '', updatedAt: '', questions: [],
}

function renderDashboard(surveys: Survey[]) {
  vi.mocked(listSurveys).mockResolvedValue(surveys)
  render(
    <AuthContext.Provider
      value={{ user: { id: 1, email: 'me@x.com', role: 'Creator' }, checking: false, signIn: vi.fn(), signOut: vi.fn() }}
    >
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Dashboard Take survey link (SMS-24 / SMS-42 regression)', () => {
  it('links to the share slug, not the survey id', async () => {
    renderDashboard([{ ...base, id: 5, title: 'Published one', status: 'Published', slug: 'k3J9xQ' } as Survey])
    const card = (await screen.findByText('Published one')).closest('.survey-card') as HTMLElement
    expect(within(card).getByRole('link', { name: 'Take survey' })).toHaveAttribute('href', '/s/k3J9xQ')
  })

  it('shows no Take survey link for drafts or surveys without a share link', async () => {
    renderDashboard([
      { ...base, id: 6, title: 'Draft one', status: 'Draft', slug: null } as Survey,
      { ...base, id: 7, title: 'No slug', status: 'Published', slug: null } as Survey,
    ])
    await screen.findByText('Draft one')
    expect(screen.queryByRole('link', { name: 'Take survey' })).toBeNull()
  })
})
