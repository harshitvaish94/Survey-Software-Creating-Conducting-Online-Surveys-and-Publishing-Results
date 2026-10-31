import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionInput from './QuestionInput'
import type { RespondentQuestion } from './QuestionInput'

const base: RespondentQuestion = { id: 1, text: 'Q', type: 'single', options: ['A', 'B'], ratingMin: null, ratingMax: null }

describe('QuestionInput', () => {
  it('renders radios for single choice and reports the pick', async () => {
    const onChange = vi.fn()
    render(<QuestionInput question={base} value={null} onChange={onChange} />)
    await userEvent.setup().click(screen.getByLabelText('B'))
    expect(onChange).toHaveBeenCalledWith('B')
    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('renders checkboxes for multiple choice and toggles values', async () => {
    const onChange = vi.fn()
    render(<QuestionInput question={{ ...base, type: 'multiple' }} value={['A']} onChange={onChange} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    await userEvent.setup().click(screen.getByLabelText('B'))
    expect(onChange).toHaveBeenCalledWith(['A', 'B'])
    await userEvent.setup().click(screen.getByLabelText('A'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('renders a textarea for text questions', async () => {
    const onChange = vi.fn()
    render(<QuestionInput question={{ ...base, type: 'text', options: null }} value="" onChange={onChange} />)
    await userEvent.setup().type(screen.getByRole('textbox'), 'x')
    expect(onChange).toHaveBeenCalledWith('x')
  })

  it('renders a select for dropdown questions', async () => {
    const onChange = vi.fn()
    render(<QuestionInput question={{ ...base, type: 'dropdown' }} value={null} onChange={onChange} />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('renders the configured rating scale with end labels', async () => {
    const onChange = vi.fn()
    render(
      <QuestionInput
        question={{ ...base, type: 'rating', options: null, ratingMin: 0, ratingMax: 3 }}
        value={null}
        onChange={onChange}
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('0 = lowest')).toBeInTheDocument()
    expect(screen.getByText('3 = highest')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByLabelText('2'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('shows an error message', () => {
    render(<QuestionInput question={base} value={null} onChange={() => {}} error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})
