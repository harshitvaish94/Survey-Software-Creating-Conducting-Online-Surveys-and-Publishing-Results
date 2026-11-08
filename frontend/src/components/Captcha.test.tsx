import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSurveyBySlug, submitResponse } from '../api/surveys'
import type { Survey } from '../api/surveys'
import { login } from '../api/auth'
import { AuthContext } from '../auth/context'
import Login from '../pages/Login'
import SurveyRespond from '../pages/SurveyRespond'
import Captcha from './Captcha'

// CAPTCHA switched on for these tests (SMS-34).
vi.mock('../lib/captcha', () => ({ CAPTCHA_SITE_KEY: 'test-site-key' }))

const resetCaptcha = vi.fn()
// The real widget loads a script from hCaptcha; this stand-in "solves" it with a click.
vi.mock('@hcaptcha/react-hcaptcha', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef(function FakeHCaptcha(
      props: { sitekey: string; onVerify: (t: string) => void },
      ref,
    ) {
      useImperativeHandle(ref, () => ({ resetCaptcha }))
      return (
        <button type="button" data-sitekey={props.sitekey} onClick={() => props.onVerify('solved-token')}>
          I am human
        </button>
      )
    }),
  }
})

vi.mock('../api/surveys', () => ({ getSurveyBySlug: vi.fn(), submitResponse: vi.fn() }))
vi.mock('../api/auth', () => ({ login: vi.fn() }))

const survey: Survey = {
  id: 1, title: 'Feedback', description: null, openDate: null, closeDate: null,
  status: 'Published', ownerId: 1, createdAt: '', updatedAt: '',
  questions: [
    { id: 10, position: 0, text: 'Pick one', type: 'single', options: ['A', 'B'], ratingMin: null, ratingMax: null, mandatory: true },
  ],
}

function renderRespond() {
  render(
    <MemoryRouter initialEntries={['/s/abc']}>
      <Routes>
        <Route path="/s/:slug" element={<SurveyRespond />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CAPTCHA on survey submission (SMS-34)', () => {
  beforeEach(() => {
    vi.mocked(getSurveyBySlug).mockReset().mockResolvedValue(survey)
    vi.mocked(submitResponse).mockReset().mockResolvedValue({ id: 1 })
    resetCaptcha.mockReset()
  })

  it('shows the widget with the configured site key', async () => {
    renderRespond()
    expect(await screen.findByRole('button', { name: 'I am human' })).toHaveAttribute('data-sitekey', 'test-site-key')
  })

  it('does not submit until the CAPTCHA is solved', async () => {
    renderRespond()
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('A'))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(submitResponse).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Please complete the CAPTCHA.')
  })

  it('sends the token once solved', async () => {
    renderRespond()
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('A'))
    await user.click(screen.getByRole('button', { name: 'I am human' }))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(submitResponse).toHaveBeenCalledWith(1, { 10: 'A' }, 'solved-token')
    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
  })

  it('resets the CAPTCHA after a refused submission (tokens are single-use)', async () => {
    vi.mocked(submitResponse).mockRejectedValue(new Error('Too many attempts. Please wait a few minutes and try again.'))
    renderRespond()
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('A'))
    await user.click(screen.getByRole('button', { name: 'I am human' }))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
    expect(resetCaptcha).toHaveBeenCalled()
  })
})

describe('CAPTCHA on login (SMS-34)', () => {
  function renderLogin() {
    render(
      <AuthContext.Provider value={{ user: null, checking: false, signIn: vi.fn(), signOut: vi.fn() }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }

  beforeEach(() => vi.mocked(login).mockReset().mockResolvedValue({ id: 1, email: 'a@x.com', role: 'Creator' }))

  it('requires the CAPTCHA, then sends its token with the login', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'a@x.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(login).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Please complete the CAPTCHA.')

    await user.click(screen.getByRole('button', { name: 'I am human' }))
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(login).toHaveBeenCalledWith('a@x.com', 'password123', 'solved-token')
  })
})

describe('Captcha component', () => {
  it('renders nothing without a site key', () => {
    const { container } = render(<Captcha siteKey="" onToken={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
