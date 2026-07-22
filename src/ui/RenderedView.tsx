import { useState } from 'react'
import ReactorView from './ReactorView'
import type { SimState } from '../sim/types'

const BASE = import.meta.env.BASE_URL

/**
 * Position of the plasma ball within the rendered sprite, as fractions of the
 * image. These depend on the camera in tools/blender/reactor.py. If you change
 * the camera, adjust these. The vertical span maps the simulated ball height in
 * millimetres onto the image.
 */
export const SPRITE_ANCHOR = {
  cx: 0.455, // horizontal centre of the cavity axis
  substrateY: 0.615, // image y of the substrate surface
  windowY: 0.315, // image y of the quartz window
  mmPerFrac: 62 / (0.615 - 0.315), // millimetres per unit of image height
}

export default function RenderedView({ s }: { s: SimState }) {
  const [missing, setMissing] = useState(false)
  const open = s.chamber.jack < 0.5
  const src = `${BASE}sprites/${open ? 'reactor_open' : 'reactor_closed'}.png`

  if (missing) {
    return (
      <div className="rendered-fallback">
        <ReactorView s={s} />
        <p className="sub">
          No Blender sprites found. Run <code>blender -b -P tools/blender/reactor.py</code> to generate them, then
          reload. Showing the vector cutaway in the meantime.
        </p>
      </div>
    )
  }

  const [r, g, b] = s.plasma.colour
  const a = SPRITE_ANCHOR
  const ballFrac = s.plasma.ballRadius / a.mmPerFrac
  const cyFrac = a.substrateY - s.plasma.ballCentreHeight / a.mmPerFrac
  const strength = s.plasma.lit ? 0.75 + 0.25 * s.plasma.stability : 0

  return (
    <div className="rendered">
      <img src={src} alt="Reactor" onError={() => setMissing(true)} draggable={false} />
      {s.plasma.lit && (
        <>
          <div
            className="sprite-glow"
            style={{
              left: `${a.cx * 100}%`,
              top: `${cyFrac * 100}%`,
              width: `${ballFrac * 560}%`,
              height: `${ballFrac * 560}%`,
              background: `radial-gradient(circle, rgba(255,255,255,${0.95 * strength}) 0%, rgba(${r},${g},${b},${0.9 * strength}) 26%, rgba(${r},${g},${b},${0.4 * strength}) 52%, rgba(${r},${g},${b},0) 74%)`,
            }}
          />
          <div
            className="sprite-glow pool"
            style={{
              left: `${a.cx * 100}%`,
              top: `${a.substrateY * 100}%`,
              width: `${ballFrac * 420}%`,
              height: `${ballFrac * 130}%`,
              background: `radial-gradient(ellipse, rgba(${r},${g},${b},${0.5 * strength}) 0%, rgba(${r},${g},${b},0) 70%)`,
            }}
          />
        </>
      )}
      {s.windowCracked && <div className="sprite-cracked">QUARTZ WINDOW CRACKED</div>}
    </div>
  )
}
