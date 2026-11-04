import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

function setup() {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog title="Delete?" message="This cannot be undone." confirmLabel="Delete it" onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('is an accessible alert dialog with title and message', () => {
    setup()
    const dialog = screen.getByRole('alertdialog', { name: 'Delete?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('focuses the safe action first', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('confirms and cancels via buttons', async () => {
    const { onConfirm, onCancel } = setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete it' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels with Escape', async () => {
    const { onCancel, onConfirm } = setup()
    await userEvent.setup().keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
