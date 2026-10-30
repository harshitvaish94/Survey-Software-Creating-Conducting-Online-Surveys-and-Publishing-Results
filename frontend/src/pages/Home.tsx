import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'

const OPTIONS = ['Slow', 'Steady', 'Good', 'Great', 'Unreal']

function SampleQuestion() {
  const [picked, setPicked] = useState<string | null>(null)

  return (
    <div className="sample" role="group" aria-labelledby="sample-q">
      <p className="sample-tag">Try answering one</p>
      <h2 id="sample-q">How was your week?</h2>
      <div className="options">
        {OPTIONS.map((o) => (
          <label key={o} className={picked === o ? 'opt on' : 'opt'}>
            <input type="radio" name="sample" value={o} checked={picked === o} onChange={() => setPicked(o)} />
            {o}
          </label>
        ))}
      </div>
      <p className="sample-note" aria-live="polite">
        {picked
          ? `"${picked}", noted. Your respondents get the same one-tap experience.`
          : 'Pick one. That is all it takes for your respondents too.'}
      </p>
    </div>
  )
}

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" />
      <path d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  )
}

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <section className="landing">
        <div>
          <h1>Ask the right questions. Read the answers at a glance.</h1>
          <p className="lead">
            Build a survey in minutes, share it with a link or QR code, and see the results as clear charts.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn">Go to your surveys</Link>
            ) : (
              <>
                <Link to="/register" className="btn">Create an account</Link>
                <Link to="/login" className="btn btn-outline">Log in</Link>
              </>
            )}
          </div>
        </div>
        <SampleQuestion />
      </section>

      <ul className="ways">
        <li>
          <Tick />
          <h2>Build</h2>
          <p>Choose from five question types and set open and close dates.</p>
        </li>
        <li>
          <Tick />
          <h2>Share</h2>
          <p>Every published survey gets its own link and QR code.</p>
        </li>
        <li>
          <Tick />
          <h2>Read results</h2>
          <p>See answers per question as charts, then export to CSV or PDF.</p>
        </li>
      </ul>
    </>
  )
}