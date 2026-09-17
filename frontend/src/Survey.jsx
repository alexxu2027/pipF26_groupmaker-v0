import { useEffect, useRef, useState } from 'react'

/* A listbox built out of buttons — a native <select> can't be styled to match. */
function Dropdown({ options, value, invalid, onChange }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open || !panelRef.current) return
    const el = panelRef.current.children[active]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function openPanel() {
    const i = options.indexOf(value)
    setActive(i >= 0 ? i : 0)
    setOpen(true)
  }

  function choose(option) {
    onChange(option)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openPanel()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + options.length) % options.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) choose(options[active])
      else openPanel()
    }
  }

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className={`dropdown-trigger${open ? ' is-open' : ''}${invalid ? ' is-invalid' : ''}`}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'dropdown-value' : 'dropdown-placeholder'}>
          {value || 'Choose one…'}
        </span>
        <span className="dropdown-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul className="dropdown-panel" role="listbox" ref={panelRef}>
          {options.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              className={`dropdown-option${i === active ? ' is-active' : ''}${
                option === value ? ' is-chosen' : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
            >
              {option}
              {option === value && <span className="dropdown-check" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Scale({ field, value, invalid, onChange }) {
  return (
    <div className={`scale${invalid ? ' is-invalid' : ''}`}>
      <span className="scale-end">{field.low_label}</span>
      <div className="scale-track" role="group">
        {field.values.map((v) => (
          <button
            type="button"
            key={v}
            className={`scale-dot${v === value ? ' is-on' : ''}`}
            onClick={() => onChange(v)}
            aria-pressed={v === value}
          >
            {v}
          </button>
        ))}
      </div>
      <span className="scale-end">{field.high_label}</span>
    </div>
  )
}

function MultiSelect({ field, value, invalid, onChange }) {
  const chosen = value || []
  function toggle(option) {
    onChange(chosen.includes(option) ? chosen.filter((v) => v !== option) : [...chosen, option])
  }
  return (
    <div className={`chips${invalid ? ' is-invalid' : ''}`}>
      {field.values.map((option) => (
        <button
          type="button"
          key={option}
          className={`chip${chosen.includes(option) ? ' is-on' : ''}`}
          onClick={() => toggle(option)}
          aria-pressed={chosen.includes(option)}
        >
          <span className="chip-tick" aria-hidden="true" />
          {option}
        </button>
      ))}
    </div>
  )
}

function Field({ field, value, invalid, onChange }) {
  if (field.type === 'dropdown') {
    return <Dropdown options={field.values} value={value} invalid={invalid} onChange={onChange} />
  }
  if (field.type === 'scale') {
    return <Scale field={field} value={value} invalid={invalid} onChange={onChange} />
  }
  if (field.type === 'multiselect') {
    return <MultiSelect field={field} value={value} invalid={invalid} onChange={onChange} />
  }
  const Tag = field.multiline ? 'textarea' : 'input'
  return (
    <Tag
      className={`text-input${invalid ? ' is-invalid' : ''}`}
      rows={field.multiline ? 3 : undefined}
      value={value || ''}
      placeholder={field.placeholder || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default function Survey() {
  const [schema, setSchema] = useState(null)
  const [answers, setAnswers] = useState({})
  const [missing, setMissing] = useState([])
  const [status, setStatus] = useState('editing') // editing | saving | done
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/survey/schema')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`)
        return res.json()
      })
      .then(setSchema)
      .catch((err) => setError(err.message))
  }, [])

  function setAnswer(column, value) {
    setAnswers((prev) => ({ ...prev, [column]: value }))
    setMissing((prev) => prev.filter((c) => c !== column))
  }

  function findMissing(fields) {
    return fields
      .filter((f) => !f.optional)
      .filter((f) => {
        const v = answers[f.column]
        return f.type === 'multiselect' ? !v || v.length === 0 : !v || !String(v).trim()
      })
      .map((f) => f.column)
  }

  async function submit(e) {
    e.preventDefault()
    const gaps = findMissing(schema.fields)
    setMissing(gaps)
    setError(null)
    if (gaps.length > 0) {
      const first = document.querySelector('.q.is-missing')
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setStatus('saving')
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMissing(data.missing || [])
        throw new Error(data.error || `Backend responded ${res.status}`)
      }
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('editing')
    }
  }

  if (error && !schema) {
    return <p className="error">Could not load the survey: {error}</p>
  }
  if (!schema) {
    return <p>Loading survey…</p>
  }

  if (status === 'done') {
    return (
      <section className="done-card">
        <span className="done-mark" aria-hidden="true" />
        <h2>Thanks — that's saved.</h2>
        <p>Your answers were added to the response sheet. You can close this tab.</p>
        <a className="ghost-button" href="#/">
          Back to the roster
        </a>
      </section>
    )
  }

  const labelFor = (column) => schema.fields.find((f) => f.column === column)?.question

  return (
    <form className="survey" onSubmit={submit} noValidate>
      <p className="survey-intro">{schema.intro}</p>

      {missing.length > 0 && (
        <div className="banner banner-warn" role="alert">
          <strong>
            {missing.length} question{missing.length > 1 ? 's' : ''} still need
            {missing.length > 1 ? '' : 's'} an answer:
          </strong>
          <ul>
            {missing.map((column) => (
              <li key={column}>{labelFor(column)}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="banner banner-error" role="alert">
          {error} Your answers are still here — fix the issue and submit again.
        </div>
      )}

      <ol className="questions">
        {schema.fields.map((field, i) => (
          <li
            className={`q${missing.includes(field.column) ? ' is-missing' : ''}`}
            key={field.column}
          >
            <div className="q-head">
              <span className="q-number">{String(i + 1).padStart(2, '0')}</span>
              <span className="q-text">
                {field.question}
                {field.optional && <span className="q-optional">optional</span>}
              </span>
            </div>
            <Field
              field={field}
              value={answers[field.column]}
              invalid={missing.includes(field.column)}
              onChange={(v) => setAnswer(field.column, v)}
            />
          </li>
        ))}
      </ol>

      <div className="survey-actions">
        <button className="randomize" type="submit" disabled={status === 'saving'}>
          <span>{status === 'saving' ? 'Saving…' : 'Submit survey'}</span>
        </button>
        <a className="ghost-button" href="#/">
          Cancel
        </a>
      </div>
    </form>
  )
}
