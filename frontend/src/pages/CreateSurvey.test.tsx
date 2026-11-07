import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreateSurvey from './CreateSurvey'
import { ApiError } from '../api/http'
import { closeSurvey, deleteQuestion, getShareInfo, getSurvey, publishSurvey, reorderQuestions, updateSurvey } from '../api/surveys'
import type { Survey } from '../api/surveys'
import type { AuthUser } from '../api/auth'
import { AuthContext } from '../auth/context'

vi.mock('../api/surveys', () => ({
  getSurvey: vi.fn(),
  updateSurvey: vi.fn(),
  publishSurvey: vi.fn(),
  closeSurvey: vi.fn(),
  getShareInfo: vi.fn(),
  deleteQuestion: vi.fn(),
  reorderQuestions: vi.fn(),
}))

const share = { slug: 'abc123XYZ789', link: 'http://localhost:5173/s/abc123XYZ789', qrCodeUrl: 'data:image/png;base64,AAAA' }

const survey: Survey = {
  id: 1, title: 'Feedback', description: null, openDate: null, closeDate: null,
  status: 'Draft', ownerId: 1, createdAt: '', updatedAt: '',
  questions: [
    { id: 10, position: 0, text: 'First', type: 'text', options: null, ratingMin: null, ratingMax: null, mandatory: true },
    { id: 11, position: 1, text: 'Second', type: 'single', options: ['A', 'B'], ratingMin: null, ratingMax: null, mandatory: false },
  ],
}

const owner: AuthUser = { id: 1, email: 'owner@x.com', role: 'Creator' }

function renderPage(user: AuthUser = owner) {
  render(
    <AuthContext.Provider value={{ user, checking: false, signIn: () => {}, signOut: () => {} }}>
      <MemoryRouter initialEntries={['/surveys/1/edit']}>
        <Routes>
          <Route path="/surveys/:id/edit" element={<CreateSurvey />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const questionTexts = () => screen.getAllByLabelText(/^Question \d+ text$/).map((el) => (el as HTMLInputElement).value)

describe('CreateSurvey (builder)', () => {
  beforeEach(() => {
    vi.mocked(getSurvey).mockReset().mockResolvedValue(survey)
    vi.mocked(updateSurvey).mockReset().mockResolvedValue(survey)
    vi.mocked(deleteQuestion).mockReset().mockResolvedValue(undefined)
    vi.mocked(reorderQuestions).mockReset().mockResolvedValue([])
    vi.mocked(closeSurvey).mockReset()
    vi.mocked(getShareInfo).mockReset().mockResolvedValue(share)
    vi.mocked(publishSurvey).mockReset()
  })

  it('loads an existing draft with its questions and required settings', async () => {
    renderPage()
    expect(await screen.findByDisplayValue('Feedback')).toBeInTheDocument()
    expect(questionTexts()).toEqual(['First', 'Second'])
    const radios = screen.getAllByRole('radio', { name: 'Required' })
    expect(radios[0]).toBeChecked()
    expect(radios[1]).not.toBeChecked()
  })

  it('asks for confirmation before deleting and keeps the question when cancelled', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Delete' }))[0])
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(deleteQuestion).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(questionTexts()).toEqual(['First', 'Second'])
  })

  it('deletes the stored question after confirmation', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Delete' }))[0])
    await user.click(screen.getByRole('button', { name: 'Delete question' }))
    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith(1, 10))
    await waitFor(() => expect(questionTexts()).toEqual(['Second']))
  })

  it('keeps the question and shows the error when deletion fails', async () => {
    vi.mocked(deleteQuestion).mockRejectedValue(new ApiError('Server exploded', 500))
    renderPage()
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Delete' }))[0])
    await user.click(screen.getByRole('button', { name: 'Delete question' }))
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(questionTexts()).toEqual(['First', 'Second'])
  })

  it('treats a 404 on delete as already removed', async () => {
    vi.mocked(deleteQuestion).mockRejectedValue(new ApiError('Not found', 404))
    renderPage()
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('button', { name: 'Delete' }))[0])
    await user.click(screen.getByRole('button', { name: 'Delete question' }))
    await waitFor(() => expect(questionTexts()).toEqual(['Second']))
    expect(screen.getByText(/no longer exists/)).toBeInTheDocument()
  })

  it('persists the new order when a question is moved down', async () => {
    renderPage()
    await userEvent.setup().click((await screen.findAllByRole('button', { name: 'Move down' }))[0])
    await waitFor(() => expect(reorderQuestions).toHaveBeenCalledWith(1, [11, 10]))
    expect(questionTexts()).toEqual(['Second', 'First'])
  })

  it('restores the old order when saving the order fails', async () => {
    vi.mocked(reorderQuestions).mockRejectedValue(new ApiError('Nope', 409))
    renderPage()
    await userEvent.setup().click((await screen.findAllByRole('button', { name: 'Move down' }))[0])
    expect(await screen.findByText('Nope')).toBeInTheDocument()
    expect(questionTexts()).toEqual(['First', 'Second'])
  })

  it('saves edited question text through the survey update', async () => {
    renderPage()
    const user = userEvent.setup()
    const first = (await screen.findAllByLabelText(/^Question \d+ text$/))[0]
    await user.clear(first)
    await user.type(first, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
    const sent = vi.mocked(updateSurvey).mock.calls[0][1]
    expect(sent.questions[0]).toMatchObject({ id: 10, text: 'Renamed', mandatory: true })
  })

  it('blocks saving when a question is invalid and shows why', async () => {
    renderPage()
    const user = userEvent.setup()
    const first = (await screen.findAllByLabelText(/^Question \d+ text$/))[0]
    await user.clear(first)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(updateSurvey).not.toHaveBeenCalled()
    expect((await screen.findAllByText(/Question text is required/)).length).toBeGreaterThan(0)
  })

  it('is read-only for a published survey', async () => {
    vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
    renderPage()
    expect(await screen.findByText(/can no longer be edited, reordered or deleted/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Question \d+ text$/)[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Delete' })[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: '+ Add a question' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  describe('shareable link and QR code (SMS-24)', () => {
    it('shows no link while the survey is a draft', async () => {
      renderPage()
      await screen.findByDisplayValue('Feedback')
      expect(getShareInfo).not.toHaveBeenCalled()
      expect(screen.queryByAltText('QR code for the survey link')).not.toBeInTheDocument()
    })

    it('shows the link and QR code of a published survey', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      renderPage()
      expect(await screen.findByRole('link', { name: share.link })).toHaveAttribute('href', share.link)
      expect(screen.getByAltText('QR code for the survey link')).toHaveAttribute('src', share.qrCodeUrl)
    })

    it('shows the link and QR code right after publishing', async () => {
      vi.mocked(publishSurvey).mockResolvedValue({ ...survey, status: 'Published', ...share })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Publish survey' }))
      expect(await screen.findByRole('link', { name: share.link })).toBeInTheDocument()
      expect(screen.getByAltText('QR code for the survey link')).toBeInTheDocument()
      vi.restoreAllMocks()
    })

    it('copies the link to the clipboard', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      renderPage()
      const user = userEvent.setup()
      await screen.findByRole('link', { name: share.link })
      await user.click(screen.getByRole('button', { name: 'Copy link' }))
      expect(await screen.findByText('Link copied.')).toBeInTheDocument()
      expect(await navigator.clipboard.readText()).toBe(share.link)
    })

    it('still renders the page when the link cannot be loaded', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      vi.mocked(getShareInfo).mockRejectedValue(new Error('boom'))
      renderPage()
      expect(await screen.findByText(/can no longer be edited, reordered or deleted/)).toBeInTheDocument()
      expect(screen.queryByAltText('QR code for the survey link')).not.toBeInTheDocument()
    })
  })

  describe('closing a survey (SMS-23)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('does not offer Close for a draft survey', async () => {
      renderPage()
      await screen.findByDisplayValue('Feedback')
      expect(screen.queryByRole('button', { name: 'Close survey' })).not.toBeInTheDocument()
    })

    it('closes a published survey after confirmation and removes the button', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      vi.mocked(closeSurvey).mockResolvedValue({ ...survey, status: 'Closed' })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Close survey' }))
      expect(closeSurvey).toHaveBeenCalledWith(1)
      expect(await screen.findByText('Survey closed.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Close survey' })).not.toBeInTheDocument()
    })

    it('keeps the survey published when the confirmation is cancelled', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Close survey' }))
      expect(closeSurvey).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Close survey' })).toBeInTheDocument()
    })

    it('shows the server message when closing fails', async () => {
      vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published' })
      vi.mocked(closeSurvey).mockRejectedValue(new ApiError('Only a published survey can be closed.', 409))
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Close survey' }))
      expect(await screen.findByText('Only a published survey can be closed.')).toBeInTheDocument()
    })
  })

  it('shows an error when the survey cannot be loaded', async () => {
    vi.mocked(getSurvey).mockRejectedValue(new ApiError('Survey 9 not found.', 404))
    renderPage()
    expect(await screen.findByText('Survey 9 not found.')).toBeInTheDocument()
  })

  // SMS-15: another creator opening the edit link of a published survey only sees a message.
  it("refuses to open another creator's survey", async () => {
    vi.mocked(getSurvey).mockResolvedValue({ ...survey, status: 'Published', ownerId: 1 })
    renderPage({ id: 2, email: 'test1@x.com', role: 'Creator' })
    expect(await screen.findByRole('heading', { name: 'Not your survey' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('You can only edit surveys you created')
    expect(screen.queryByDisplayValue('Feedback')).not.toBeInTheDocument()
  })

  it('lets an administrator open any survey', async () => {
    renderPage({ id: 9, email: 'admin@x.com', role: 'Administrator' })
    expect(await screen.findByDisplayValue('Feedback')).toBeInTheDocument()
  })
})
