import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionEditor from './QuestionEditor'
import { newEditorQuestion } from '../lib/questions'
import type { EditorQuestion } from '../lib/questions'

function setup(patch: Partial<EditorQuestion> = {}) {
  const onChange = vi.fn()
  render(
    <QuestionEditor
      q={{ ...newEditorQuestion(), ...patch }}
      index={0}
      total={1}
      onChange={onChange}
      onDelete={() => {}}
      onMove={() => {}}
    />,
  )
  return onChange
}

describe('QuestionEditor required/optional control', () => {
  it('defaults new questions to Optional', () => {
    setup()
    expect(screen.getByRole('radio', { name: 'Optional' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Required' })).not.toBeChecked()
  })

  it('marks a question as required', async () => {
    const onChange = setup()
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Required' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mandatory: true }))
  })

  it('shows the current status next to the question', () => {
    setup({ mandatory: true })
    expect(screen.getByRole('radio', { name: 'Required' })).toBeChecked()
    expect(screen.getAllByText('Required').length).toBeGreaterThan(1)
  })

  it('keeps the required flag when other fields change', async () => {
    const onChange = setup({ mandatory: true, text: '' })
    await userEvent.setup().type(screen.getByLabelText('Question 1 text'), 'x')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: 'x', mandatory: true }))
  })

  it.each(['single', 'multiple', 'text', 'rating', 'dropdown'] as const)('works with %s questions', async (type) => {
    const onChange = setup({ type })
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Required' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type, mandatory: true }))
  })
})
