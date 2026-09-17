import { useEffect, useState } from 'react'

import Survey from './Survey'

const MIN_SIZE = 2
const MAX_SIZE = 10

// Two views, no router dependency: the hash decides which one renders.
function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

// Mirrors the backend's chunk-and-fold in app.py so the hint doesn't lie.
function groupCountFor(total, size) {
  const count = Math.ceil(total / size)
  if (count > 1) {
    const last = total - (count - 1) * size
    if (last < Math.max(2, size - 1)) return count - 1
  }
  return count
}

export default function App() {
  const route = useHashRoute()
  const [roster, setRoster] = useState(null)
  const [groups, setGroups] = useState(null)
  const [groupSize, setGroupSize] = useState(4)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`)
        return res.json()
      })
      .then(setRoster)
      .catch((err) => setError(err.message))
  }, [])

  function nudgeSize(delta) {
    setGroupSize((size) => Math.max(MIN_SIZE, Math.min(size + delta, MAX_SIZE)))
  }

  async function randomize() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/groups/randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_size: groupSize }),
      })
      if (!res.ok) throw new Error(`Backend responded ${res.status}`)
      const data = await res.json()
      setGroups(data.groups)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (route === 'survey') {
    return (
      <main className="page">
        <header className="topbar">
          <div>
            <h1>GroupMaker</h1>
            <p className="subtitle">Group formation survey</p>
          </div>
          <a className="ghost-button" href="#/">
            Back to roster
          </a>
        </header>
        <Survey />
      </main>
    )
  }

  if (error) {
    return (
      <main className="page">
        <h1>GroupMaker</h1>
        <p className="error">
          Could not reach the backend: {error}. Is <code>python app.py</code> running?
        </p>
      </main>
    )
  }

  if (!roster) {
    return (
      <main className="page">
        <h1>GroupMaker</h1>
        <p>Loading roster…</p>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>GroupMaker</h1>
          <p className="subtitle">{roster.course}</p>
        </div>
        <a className="ghost-button" href="#/survey">
          Survey
        </a>
      </header>

      <div className="controls">
        <div className="field">
          <span className="field-label" id="size-label">
            Group size
          </span>
          <div className="stepper" role="group" aria-labelledby="size-label">
            <button
              className="step"
              onClick={() => nudgeSize(-1)}
              disabled={groupSize <= MIN_SIZE}
              aria-label="Decrease group size"
            >
              &minus;
            </button>
            <span className="step-value" key={groupSize} aria-live="polite">
              {groupSize}
            </span>
            <button
              className="step"
              onClick={() => nudgeSize(1)}
              disabled={groupSize >= MAX_SIZE}
              aria-label="Increase group size"
            >
              +
            </button>
          </div>
        </div>

        <button className="randomize" onClick={randomize} disabled={loading}>
          <span>{loading ? 'Randomizing…' : 'Randomize Groups'}</span>
        </button>

        <p className="hint">
          {groupCountFor(roster.students.length, groupSize)} groups from{' '}
          {roster.students.length} students
        </p>
      </div>

      {groups ? (
        <section className="groups">
          {groups.map((g) => (
            <div className="card" key={g.number}>
              <h2>Group {g.number}</h2>
              <ul>
                {g.members.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <h2>Roster ({roster.students.length})</h2>
          <ul className="roster">
            {roster.students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
