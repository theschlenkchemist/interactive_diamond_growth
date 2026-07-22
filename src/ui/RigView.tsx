import { useRef, useState } from 'react'
import { GASES } from '../sim/gases'
import type { SimState } from '../sim/types'
import type { Action } from '../sim/engine'
import { PHOTOS, regionsFor, type PhotoId, type Region } from './hotspots'

type D = (a: Action) => void

const BASE = import.meta.env.BASE_URL

// ---------------------------------------------------------------------------
// What each readout region draws. Keyed by region id so the coordinates and the
// content stay independent: recalibrating a box never touches the physics.
// ---------------------------------------------------------------------------
function readout(id: string, s: SimState) {
  switch (id) {
    case 'sairem_lcd':
      return (
        <div className="ov-lcd sairem-skin">
          <div>
            SET <b>{(s.generator.setpoint / 1000).toFixed(2)}</b>
          </div>
          <div>
            FP <b>{(s.generator.forward / 1000).toFixed(2)}</b> RP{' '}
            <b className={s.generator.reflected > 150 ? 'bad' : ''}>{(s.generator.reflected / 1000).toFixed(2)}</b>
          </div>
        </div>
      )
    case 'pressure_lcd':
      return (
        <div className="ov-lcd blue-skin">
          {s.chamber.pressure < 1 ? s.chamber.pressure.toExponential(1) : s.chamber.pressure.toFixed(2)} Torr
        </div>
      )
    case 'thermopoint':
      return (
        <div className="ov-lcd blue-skin">
          <div className="big">{s.thermal.pyrometerReading > 0 ? `${s.thermal.pyrometerReading.toFixed(0)} \u00b0C` : '--- \u00b0C'}</div>
          <div className="sm">EMS {s.thermal.pyrometerEmissivity.toFixed(2)}</div>
        </div>
      )
    case 'mks647c':
      return (
        <div className="ov-lcd dark-skin cols">
          {(['H2', 'CH4', 'CO2', 'Ar', 'N2'] as const).map((g) => (
            <div key={g} className={s.mfc[g].channelOn && s.mfc[g].setpoint > 0 && s.mfc[g].actual < s.mfc[g].setpoint * 0.5 ? 'bad' : ''}>
              <span>{GASES[g].channel}</span>
              {s.mfc[g].actual.toFixed(0)}
            </div>
          ))}
        </div>
      )
    case 'type153':
      return (
        <div className="ov-lcd dark-skin">
          {s.throttleMode.toUpperCase()} &middot; pos {(s.throttlePosition * 100).toFixed(0)}% &middot; SP {s.pressureSetpoint.toFixed(0)} Torr
        </div>
      )
    case 'waterpanel':
      return (
        <div className="ov-lcd amber-skin">
          <div>{s.utilities.coolingWater ? `${s.utilities.waterFlow.toFixed(1)} L/min` : 'NO FLOW'}</div>
          <div>RP {s.generator.reflected.toFixed(0)} W</div>
        </div>
      )
    case 'fluke':
      return <div className="ov-lcd grey-skin">{s.thermal.stage.toFixed(1)} &deg;C</div>
    case 'mfc_CH4':
      return <div className="ov-lcd dark-skin">CH4 {s.mfc.CH4.actual.toFixed(1)}</div>
    case 'mfc_Ar':
      return <div className="ov-lcd dark-skin">Ar {s.mfc.Ar.actual.toFixed(1)}</div>
    default:
      return null
  }
}

function controlState(id: string, s: SimState): boolean {
  if (id.startsWith('valve_')) return s.panelValves[id.slice(6) as keyof typeof s.panelValves]
  if (id === 'sairem_start') return s.generator.running
  if (id === 'sairem_standby') return s.generator.standby
  if (id === 'jack_knob') return s.chamber.jack >= 0.98
  if (id === 'substrate_stage') return s.chamber.sampleLoaded
  return false
}

function controlAction(id: string, s: SimState): Action | null {
  if (id.startsWith('valve_')) {
    const gas = id.slice(6) as keyof typeof s.panelValves
    return { type: 'panelValve', gas, open: !s.panelValves[gas] }
  }
  if (id === 'sairem_start') return { type: 'genRun', on: !s.generator.running }
  if (id === 'sairem_standby') return { type: 'genStandby', on: !s.generator.standby }
  if (id === 'jack_knob') return { type: 'jack', value: s.chamber.jack >= 0.98 ? 0 : 1 }
  if (id === 'substrate_stage') return { type: 'loadSample' }
  return null
}

// ---------------------------------------------------------------------------

export default function RigView({ s, d }: { s: SimState; d: D }) {
  const [photo, setPhoto] = useState<PhotoId>('rack')
  const [calibrate, setCalibrate] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, Partial<Region>>>({})
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'size'; x0: number; y0: number; r: Region } | null>(null)

  const meta = PHOTOS.find((p) => p.id === photo)!
  const regions = regionsFor(photo).map((r) => ({ ...r, ...overrides[r.id] }))

  const onPointerDown = (e: React.PointerEvent, r: Region, mode: 'move' | 'size') => {
    if (!calibrate) return
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { id: r.id, mode, x0: e.clientX, y0: e.clientY, r }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const dg = drag.current
    const el = wrapRef.current
    if (!dg || !el) return
    const box = el.getBoundingClientRect()
    const dx = (e.clientX - dg.x0) / box.width
    const dy = (e.clientY - dg.y0) / box.height
    setOverrides((o) => ({
      ...o,
      [dg.id]:
        dg.mode === 'move'
          ? { x: +(dg.r.x + dx).toFixed(3), y: +(dg.r.y + dy).toFixed(3) }
          : { w: +Math.max(0.01, dg.r.w + dx).toFixed(3), h: +Math.max(0.008, dg.r.h + dy).toFixed(3) },
    }))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const copyJson = () => {
    const merged = regionsFor(photo).map((r) => ({ ...r, ...overrides[r.id] }))
    navigator.clipboard?.writeText(JSON.stringify(merged, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const [pr, pg, pb] = s.plasma.colour
  const glowStrength = s.plasma.lit ? Math.min(1, s.plasma.ballRadius / 18) * (0.75 + 0.25 * s.plasma.stability) : 0

  return (
    <section className="panel rigview">
      <div className="rig-tabs">
        {PHOTOS.map((p) => (
          <button key={p.id} className={`tab ${photo === p.id ? 'on' : ''}`} onClick={() => setPhoto(p.id)}>
            {p.label}
          </button>
        ))}
        <label className="cal">
          <input type="checkbox" checked={calibrate} onChange={(e) => setCalibrate(e.target.checked)} /> calibrate
        </label>
        {calibrate && (
          <button className="ghost small" onClick={copyJson}>
            {copied ? 'copied' : 'Copy JSON'}
          </button>
        )}
      </div>

      <div
        className={`rig-photo ${calibrate ? 'calibrating' : ''}`}
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img src={`${BASE}photos/${meta.file}`} alt={meta.label} draggable={false} />

        {regions.map((r) => {
          const style = { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }

          if (r.kind === 'glow') {
            const cx = (r.x + r.w / 2) * 100
            const cy = (r.y + r.h / 2) * 100
            return (
              <div key={r.id}>
                {glowStrength > 0 && (
                  <div
                    className="ov-glow"
                    style={{
                      left: `${cx}%`,
                      top: `${cy}%`,
                      width: `${(r.r ?? r.w) * 620}%`,
                      height: `${(r.r ?? r.w) * 620}%`,
                      background: `radial-gradient(circle, rgba(255,255,255,${0.95 * glowStrength}) 0%, rgba(${pr},${pg},${pb},${0.85 * glowStrength}) 22%, rgba(${pr},${pg},${pb},${0.35 * glowStrength}) 48%, rgba(${pr},${pg},${pb},0) 72%)`,
                    }}
                  />
                )}
                {calibrate && (
                  <div className="ov-box cal-box" style={style} onPointerDown={(e) => onPointerDown(e, r, 'move')}>
                    <span className="cal-label">{r.id}</span>
                    <span className="cal-handle" onPointerDown={(e) => onPointerDown(e, r, 'size')} />
                  </div>
                )}
              </div>
            )
          }

          if (r.kind === 'readout') {
            return (
              <div key={r.id} className={`ov-box readout-box ${calibrate ? 'cal-box' : ''}`} style={style} onPointerDown={(e) => onPointerDown(e, r, 'move')}>
                {!calibrate && readout(r.id, s)}
                {calibrate && (
                  <>
                    <span className="cal-label">{r.id}</span>
                    <span className="cal-handle" onPointerDown={(e) => onPointerDown(e, r, 'size')} />
                  </>
                )}
              </div>
            )
          }

          if (r.kind === 'control') {
            const on = controlState(r.id, s)
            const act = controlAction(r.id, s)
            return (
              <button
                key={r.id}
                className={`ov-box control-box ${on ? 'on' : ''} ${calibrate ? 'cal-box' : ''}`}
                style={style}
                title={r.label}
                onPointerDown={(e) => onPointerDown(e, r, 'move')}
                onClick={() => {
                  if (!calibrate && act) d(act)
                }}
              >
                {calibrate ? (
                  <>
                    <span className="cal-label">{r.id}</span>
                    <span className="cal-handle" onPointerDown={(e) => onPointerDown(e, r, 'size')} />
                  </>
                ) : (
                  <span className="ov-tip">{r.label}</span>
                )}
              </button>
            )
          }

          return calibrate ? (
            <div key={r.id} className="ov-box cal-box note" style={style} onPointerDown={(e) => onPointerDown(e, r, 'move')}>
              <span className="cal-label">{r.id}</span>
              <span className="cal-handle" onPointerDown={(e) => onPointerDown(e, r, 'size')} />
            </div>
          ) : null
        })}
      </div>

      <p className="sub">
        {meta.credit}. Hotspot positions are approximate. Tick calibrate, drag the boxes onto the real instruments, then
        Copy JSON and paste it into <code>src/ui/hotspots.ts</code>.
      </p>
    </section>
  )
}
