import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import QuestionEditor from './QuestionEditor'
import { newEditorQuestion } from '../lib/questions'

describe('QuestionEditor read-only mode', () => {
  it('disables every control for published surveys', () => {
    render(
      <QuestionEditor
        q={{ ...newEditorQuestion(), text: 'Locked' }}
        index={0}
        total={3}
        readOnly
        onChange={() => {}}
        onDelete={() => {}}
        onMove={() => {}}
      />,
    )
    expect(screen.getByLabelText('Question 1 text')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Required' })).toBeDisabled()
    expect(screen.getByLabelText('Option 1')).toBeDisabled()
  })
})
