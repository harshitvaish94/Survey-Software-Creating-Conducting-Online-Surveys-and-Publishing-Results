import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionEditor from './QuestionEditor'
import { newEditorQuestion } from '../lib/questions'
import type { EditorQuestion } from '../lib/questions'

function setup(patch: Partial<EditorQuestion> = {}, extra: { errors?: string[]; index?: number; total?: number } = {}) {
  const props = {
    q: { ...newEditorQuestion(), ...patch },
    index: extra.index ?? 0,
    total: extra.total ?? 1,
    errors: extra.errors,
    onChange: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
  }
  render(<QuestionEditor {...props} />)
  return props
}

describe('QuestionEditor', () => {
  it('offers all five question types', () => {
    setup()
    for (const label of ['Single choice', 'Multiple choice', 'Text', 'Rating scale', 'Dropdown']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('switching to a text question hides the option editor', () => {
    setup({ type: 'text' })
    expect(screen.queryByLabelText('Option 1')).not.toBeInTheDocument()
  })

  it('reports a type change and seeds options for choice types', async () => {
    const props = setup({ type: 'text', options: [] })
    await userEvent.setup().click(screen.getByLabelText('Dropdown'))
    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dropdown', options: ['Option 1', 'Option 2'] }),
    )
  })

  it('shows option controls for choice questions and adds an option', async () => {
    const props = setup({ type: 'single', options: ['A', 'B'] })
    expect(screen.getByLabelText('Option 2')).toHaveValue('B')
    await userEvent.setup().click(screen.getByRole('button', { name: '+ Add option' }))
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ options: ['A', 'B', 'Option 3'] }))
  })

  it('does not allow removing below two options', () => {
    setup({ type: 'multiple', options: ['A', 'B'] })
    expect(screen.getByLabelText('Remove option 1')).toBeDisabled()
  })

  it('renders a configurable rating scale preview', async () => {
    const props = setup({ type: 'rating', ratingMin: 1, ratingMax: 7 })
    expect(screen.getByRole('img', { name: 'Rating scale from 1 to 7' })).toBeInTheDocument()
    await userEvent.setup().selectOptions(screen.getByLabelText('Scale ends at'), '9')
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ ratingMax: 9 }))
  })

  it('keeps the maximum above the minimum when the minimum changes', async () => {
    const props = setup({ type: 'rating', ratingMin: 0, ratingMax: 1 })
    await userEvent.setup().selectOptions(screen.getByLabelText('Scale starts at'), '1')
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ ratingMin: 1, ratingMax: 2 }))
  })

  it('shows validation errors passed by the parent', () => {
    setup({}, { errors: ['Add at least two options.'] })
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least two options.')
  })

  it('disables move buttons at the ends of the list', () => {
    setup({}, { index: 0, total: 1 })
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled()
  })
})
