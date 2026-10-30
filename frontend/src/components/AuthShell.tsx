import type { ReactNode } from 'react'

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage">
      <div className="deco deco-card a" aria-hidden="true">
        <p className="q">Which snack wins?</p>
        <p className="a-line">Popcorn</p>
        <p className="a-line pick">Samosa</p>
        <p className="a-line">Fruit</p>
      </div>
      <div className="deco deco-card b" aria-hidden="true">
        <p className="q">Rate the workshop</p>
        <div className="dots">
          <span className="dot on" />
          <span className="dot on" />
          <span className="dot on" />
          <span className="dot on" />
          <span className="dot" />
        </div>
      </div>
      <div className="deco bubble" aria-hidden="true">?</div>
      <svg className="deco deco-tick" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="6" />
        <path d="M7 12.5l3.2 3.2L17 9" />
      </svg>
      {children}
    </div>
  )
}