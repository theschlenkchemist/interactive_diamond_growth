import { procedureFor, RECIPE_TARGETS } from '../sim/procedures'
import type { SimState } from '../sim/types'

export function Checklist({ s }: { s: SimState }) {
  const steps = procedureFor(s.recipe)
  let firstOpen = true
  return (
    <section className="panel">
      <h3>Procedure</h3>
      <p className="sub">{RECIPE_TARGETS[s.recipe].text}</p>
      <ol className="steps">
        {steps.map((st) => {
          const done = st.done(s)
          const current = !done && firstOpen
          if (!done) firstOpen = false
          return (
            <li key={st.id} className={done ? 'done' : current ? 'current' : ''}>
              <b>{st.title}</b>
              {current && <p>{st.detail}</p>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function GrowthPanel({ s }: { s: SimState }) {
  const t = s.growth.ternary
  const excess = t.C - t.O
  return (
    <section className="panel">
      <h3>Process outcome</h3>
      <div className="kv">
        <span>Regime</span>
        <b>{s.growth.regime}</b>
      </div>
      <div className="kv">
        <span>Atomic C / H / O</span>
        <b>
          {(t.C * 100).toFixed(1)} / {(t.H * 100).toFixed(1)} / {(t.O * 100).toFixed(1)} %
        </b>
      </div>
      <div className="kv">
        <span>C minus O</span>
        <b className={excess < 0 ? 'bad' : excess > 0.055 ? 'bad' : 'good'}>{(excess * 100).toFixed(2)} %</b>
      </div>
      <div className="kv">
        <span>Thickness</span>
        <b>{s.growth.thickness.toFixed(3)} &micro;m</b>
      </div>
      <div className="kv">
        <span>Quality</span>
        <b>{(s.growth.quality * 100).toFixed(0)} %</b>
      </div>
      <div className="kv">
        <span>Plasma stability</span>
        <b>{(s.plasma.stability * 100).toFixed(0)} %</b>
      </div>
      <div className="kv">
        <span>Window integrity</span>
        <b className={s.windowHealth < 0.6 ? 'bad' : 'good'}>{(s.windowHealth * 100).toFixed(0)} %</b>
      </div>
    </section>
  )
}

export function LogView({ s }: { s: SimState }) {
  const items = s.log.slice(-40).reverse()
  return (
    <section className="panel log">
      <h3>Event log</h3>
      <ul>
        {items.map((l, i) => (
          <li key={i} className={l.kind}>
            <span className="t">{l.t.toFixed(0).padStart(4, '0')}</span> {l.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
