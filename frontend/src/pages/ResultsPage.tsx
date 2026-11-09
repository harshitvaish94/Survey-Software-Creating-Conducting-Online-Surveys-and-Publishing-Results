import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, Pie } from 'react-chartjs-2'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

import { exportResults, getResults } from '../api/surveys'
import type { QuestionResult, SurveyResults } from '../api/surveys'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
)

const PALETTE = [
  '#2a44e8',
  '#ffd93d',
  '#2fbf8f',
  '#ff6b6b',
  '#8f6bff',
  '#ffa94d',
  '#4dabf7',
  '#12172b',
]

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; results: SurveyResults }

function ChoiceResult({ question }: { question: QuestionResult }) {
  const counts = question.counts ?? []
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  if (total === 0) {
    return <p className="hint">No answers yet.</p>
  }

  const labels = counts.map((c) => c.label)
  const data = counts.map((c) => c.count)
  const colors = counts.map((_, i) => PALETTE[i % PALETTE.length])

  const usePie =
    question.type === 'single' || question.type === 'dropdown'

  const percent = (count: number) =>
    Math.round((count / total) * 1000) / 10

  const summary = counts
    .map((c) => `${c.label}: ${c.count}`)
    .join(', ')

  return (
    <div className="res-grid">
      <div
        className="res-chart"
        role="img"
        aria-label={`${usePie ? 'Pie' : 'Bar'} chart of answers. ${summary}`}
      >
        {usePie ? (
          <Pie
            data={{
              labels,
              datasets: [
                {
                  data,
                  backgroundColor: colors,
                  borderColor: '#12172b',
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        ) : (
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: 'Votes',
                  data,
                  backgroundColor: colors,
                  borderColor: '#12172b',
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0 },
                },
              },
            }}
          />
        )}
      </div>

      <table className="res-table">
        <caption className="res-sr">Answer counts</caption>

        <thead>
          <tr>
            <th scope="col">Answer</th>
            <th scope="col">Votes</th>
            <th scope="col">Share</th>
          </tr>
        </thead>

        <tbody>
          {counts.map((c) => (
            <tr key={c.label}>
              <th scope="row">{c.label}</th>
              <td>{c.count}</td>
              <td>{percent(c.count)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RatingResult({ question }: { question: QuestionResult }) {
  const n = question.totalRatings ?? 0

  if (n === 0) {
    return <p className="hint">No answers yet.</p>
  }

  return (
    <p className="res-rating">
      Average rating:{' '}
      <strong>{(question.average ?? 0).toFixed(1)}</strong>
      {' '}from {n} {n === 1 ? 'rating' : 'ratings'}
    </p>
  )
}

function TextResult({ question }: { question: QuestionResult }) {
  const answers = (question.textAnswers ?? []).filter(
    (a) => a && a.trim(),
  )

  if (answers.length === 0) {
    return <p className="hint">No answers yet.</p>
  }

  return (
    <ul className="res-text">
      {answers.map((a, i) => (
        <li key={i}>{a}</li>
      ))}
    </ul>
  )
}

export default function ResultsPage() {
  const { id } = useParams()
  const surveyId = Number(id)

  const [state, setState] = useState<State>({
    status: 'loading',
  })

  const [attempt, setAttempt] = useState(0)

  // SMS-31: Export loading state
  const [exporting, setExporting] = useState(false)

  // SMS-31: Export CSV or PDF
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(true)
      await exportResults(surveyId, format)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Export failed.',
      )
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!Number.isInteger(surveyId)) {
      return
    }

    getResults(surveyId)
      .then(
        (results) =>
          !cancelled &&
          setState({ status: 'ready', results }),
      )
      .catch(
        (err) =>
          !cancelled &&
          setState({
            status: 'error',
            message:
              err instanceof Error
                ? err.message
                : 'Unable to load results.',
          }),
      )

    return () => {
      cancelled = true
    }
  }, [surveyId, attempt])

  if (!Number.isInteger(surveyId)) {
    return (
      <section className="hero">
        <h1>Results not found</h1>
        <Link to="/dashboard" className="btn">
          Back to dashboard
        </Link>
      </section>
    )
  }

  if (state.status === 'loading') {
    return <p role="status">Loading results…</p>
  }

  if (state.status === 'error') {
    return (
      <section className="hero">
        <h1>Could not load results</h1>

        <p role="alert">{state.message}</p>

        <button
          type="button"
          className="btn"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((a) => a + 1)
          }}
        >
          Try again
        </button>
      </section>
    )
  }

  const { results } = state

  return (
    <>
      <div className="res-head">
        <div>
          <Link to="/dashboard" className="res-back">
            ← Dashboard
          </Link>

          <h1>{results.title}</h1>

          <p className="lead">
            {results.totalResponses}{' '}
            {results.totalResponses === 1
              ? 'response'
              : 'responses'}
          </p>

          {/* SMS-31: Export buttons */}
          <div className="res-actions">
            <button
              type="button"
              className="btn"
              disabled={exporting}
              onClick={() => handleExport('csv')}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <button
              type="button"
              className="btn"
              disabled={exporting}
              onClick={() => handleExport('pdf')}
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {results.totalResponses === 0 ? (
        <section className="hero">
          <h2>No responses yet</h2>

          <p>
            Share the survey link{' '}
            <strong>/s/{surveyId}</strong> and the results
            will appear here.
          </p>
        </section>
      ) : (
        results.questions.map((q, i) => (
          <section
            key={q.id}
            className="res-card"
            aria-labelledby={`rq-${q.id}`}
          >
            <h2 id={`rq-${q.id}`}>
              {i + 1}. {q.text ?? q.prompt ?? ''}
            </h2>

            {q.type === 'rating' ? (
              <RatingResult question={q} />
            ) : q.type === 'text' ? (
              <TextResult question={q} />
            ) : (
              <ChoiceResult question={q} />
            )}
          </section>
        ))
      )}
    </>
  )
}