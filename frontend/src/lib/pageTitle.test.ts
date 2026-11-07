import { describe, expect, it } from 'vitest'
import { pageTitle } from './pageTitle'

describe('pageTitle', () => {
  it('uses the plain app name on the home page and for unknown routes', () => {
    expect(pageTitle('/')).toBe('Survey Management')
    expect(pageTitle('/nope')).toBe('Survey Management')
  })

  it('gives each page its own title', () => {
    expect(pageTitle('/login')).toBe('Log in · Survey Management')
    expect(pageTitle('/register')).toBe('Create account · Survey Management')
    expect(pageTitle('/dashboard')).toBe('Dashboard · Survey Management')
    expect(pageTitle('/surveys/new')).toBe('New survey · Survey Management')
    expect(pageTitle('/surveys/7/edit')).toBe('Edit survey · Survey Management')
    expect(pageTitle('/surveys/7/preview')).toBe('Preview survey · Survey Management')
    expect(pageTitle('/surveys/7/results')).toBe('Survey results · Survey Management')
    expect(pageTitle('/s/7')).toBe('Take survey · Survey Management')
  })
})
