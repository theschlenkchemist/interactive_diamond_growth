import { CAVITY } from '../sim/physics'
import type { SimState } from '../sim/types'

const PX_PER_MM = 1.75
const SUBSTRATE_Y = 336
const windowY = SUBSTRATE_Y - CAVITY.substrateToWindow * PX_PER_MM

export default function ReactorView({ s }: { s: SimState }) {
  const jackDrop = (1 - s.chamber.jack) * 46
  const [r, g, b] = s.plasma.colour
  const ballR = s.plasma.ballRadius * PX_PER_MM
  const ballY = SUBSTRATE_Y - s.plasma.ballCentreHeight * PX_PER_MM
  const flicker = s.plasma.lit ? 0.9 + 0.1 * Math.sin(s.t * 7.3) * (1.2 - s.plasma.stability) : 0
  const glowing = s.plasma.lit && ballR > 0

  return (
    <svg viewBox="0 0 440 560" className="reactor-svg" role="img" aria-label="Reactor cutaway">
      <defs>
        <linearGradient id="alu" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5c6470" />
          <stop offset="18%" stopColor="#aeb7c2" />
          <stop offset="40%" stopColor="#dfe5ec" />
          <stop offset="62%" stopColor="#9aa3af" />
          <stop offset="100%" stopColor="#4e555f" />
        </linearGradient>
        <linearGradient id="aluDark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a4048" />
          <stop offset="35%" stopColor="#7f8894" />
          <stop offset="70%" stopColor="#666e79" />
          <stop offset="100%" stopColor="#33383f" />
        </linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a6320" />
          <stop offset="35%" stopColor="#d8bd6a" />
          <stop offset="70%" stopColor="#a58a35" />
          <stop offset="100%" stopColor="#6d5719" />
        </linearGradient>
        <linearGradient id="interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10141a" />
          <stop offset="100%" stopColor="#05070a" />
        </linearGradient>
        <radialGradient id="ball">
          <stop offset="0%" stopColor={`rgb(255,255,255)`} stopOpacity="0.98" />
          <stop offset="35%" stopColor={`rgb(${r},${g},${b})`} stopOpacity="0.92" />
          <stop offset="75%" stopColor={`rgb(${r},${g},${b})`} stopOpacity="0.35" />
          <stop offset="100%" stopColor={`rgb(${r},${g},${b})`} stopOpacity="0" />
        </radialGradient>
        <filter id="bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="9" result="bl" />
          <feMerge>
            <feMergeNode in="bl" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softshadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.45" />
        </filter>
      </defs>

      <rect x="0" y="0" width="440" height="560" fill="#0d1016" />

      {/* frame extrusion */}
      <rect x="24" y="60" width="16" height="470" fill="url(#aluDark)" rx="2" />
      <rect x="400" y="60" width="16" height="470" fill="url(#aluDark)" rx="2" />
      <rect x="24" y="200" width="392" height="12" fill="url(#aluDark)" rx="2" />

      {/* pyrometer */}
      <g transform="translate(96,96) rotate(28)" filter="url(#softshadow)">
        <rect x="0" y="0" width="30" height="86" rx="5" fill="#191b1f" stroke="#000" />
        <rect x="4" y="8" width="22" height="60" fill="#101216" />
        <rect x="2" y="70" width="26" height="8" fill="#c9a227" />
      </g>
      <text x="60" y="92" className="lbl">
        pyrometer
      </text>

      {/* waveguide and stub tuners */}
      <rect x="150" y="126" width="200" height="46" rx="4" fill="url(#alu)" stroke="#2a2e34" filter="url(#softshadow)" />
      <g>
        {[200, 250, 300].map((x, i) => (
          <g key={x}>
            <rect x={x - 7} y={112 - i * 0} width="14" height="16" fill="url(#brass)" rx="2" />
            <circle cx={x} cy={108} r="8" fill="#20242a" stroke="#555" />
          </g>
        ))}
      </g>
      <text x="356" y="150" className="lbl">
        waveguide
      </text>

      {/* vertical coupling section down to cavity */}
      <rect x="176" y="170" width="88" height="34" fill="url(#alu)" stroke="#2a2e34" />

      {/* cavity body */}
      <rect x="130" y="200" width="180" height="140" rx="6" fill="url(#alu)" stroke="#2a2e34" filter="url(#softshadow)" />
      {/* cutaway interior */}
      <rect x="152" y="206" width="136" height="132" fill="url(#interior)" />

      {/* quartz window */}
      <rect
        x="156"
        y={windowY - 5}
        width="128"
        height="10"
        rx="2"
        fill={s.windowCracked ? '#5a2a2a' : '#cfe6ef'}
        opacity={s.windowCracked ? 0.9 : 0.55}
        stroke={s.windowCracked ? '#ff6b6b' : '#8fb6c4'}
      />
      {s.windowCracked && (
        <g stroke="#ff8a8a" strokeWidth="1.4" fill="none">
          <path d={`M170 ${windowY} L196 ${windowY - 6} L214 ${windowY + 5} L246 ${windowY - 4} L272 ${windowY + 3}`} />
        </g>
      )}
      <text x="296" y={windowY + 3} className="lbl">
        quartz window
      </text>
      {!s.windowCracked && s.windowHealth < 0.999 && (
        <rect
          x="156"
          y={windowY - 5}
          width={128 * (1 - s.windowHealth)}
          height="10"
          fill="#ff5c5c"
          opacity="0.55"
        />
      )}

      {/* plasma */}
      {glowing && (
        <g filter="url(#bloom)" opacity={flicker}>
          <circle cx="220" cy={ballY} r={ballR * 1.35} fill="url(#ball)" />
          <ellipse cx="220" cy={SUBSTRATE_Y - 3} rx={ballR * 1.1} ry={ballR * 0.28} fill={`rgb(${r},${g},${b})`} opacity="0.35" />
        </g>
      )}

      {/* substrate and stage, moves with the jack */}
      <g transform={`translate(0,${jackDrop})`}>
        <rect x="188" y={SUBSTRATE_Y - 4} width="64" height="6" rx="1" fill={s.chamber.sampleLoaded ? '#8d9298' : 'none'} stroke={s.chamber.sampleLoaded ? '#c7ccd2' : 'none'} />
        <rect x="164" y={SUBSTRATE_Y + 2} width="112" height="14" rx="3" fill="url(#brass)" />
        <rect x="150" y={SUBSTRATE_Y + 16} width="140" height="10" rx="2" fill="url(#aluDark)" />
        {/* base flange */}
        <rect x="108" y={SUBSTRATE_Y + 26} width="224" height="26" rx="4" fill="url(#alu)" stroke="#2a2e34" filter="url(#softshadow)" />
        {/* water lines */}
        <path d={`M108 ${SUBSTRATE_Y + 40} L60 ${SUBSTRATE_Y + 56}`} stroke="#d8b23a" strokeWidth="7" fill="none" strokeLinecap="round" opacity={s.utilities.coolingWater ? 1 : 0.3} />
        <path d={`M332 ${SUBSTRATE_Y + 40} L380 ${SUBSTRATE_Y + 56}`} stroke="#d8b23a" strokeWidth="7" fill="none" strokeLinecap="round" opacity={s.utilities.coolingWater ? 1 : 0.3} />
        {/* scissor jack */}
        <g stroke="#8a9099" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d={`M170 ${SUBSTRATE_Y + 54} L262 ${SUBSTRATE_Y + 96}`} />
          <path d={`M262 ${SUBSTRATE_Y + 54} L170 ${SUBSTRATE_Y + 96}`} />
        </g>
        <rect x="150" y={SUBSTRATE_Y + 96} width="132" height="10" rx="2" fill="url(#aluDark)" />
        <circle cx="292" cy={SUBSTRATE_Y + 75} r="11" fill="#22262c" stroke="#666" />
      </g>

      {/* seal indicator */}
      {!s.chamber.sealed && (
        <text x="220" y={SUBSTRATE_Y + 20} className="warn" textAnchor="middle">
          NOT SEATED
        </text>
      )}

      {/* gas inlet and pump port */}
      <path d="M130 226 L70 226" stroke="#9aa3af" strokeWidth="5" strokeLinecap="round" />
      <text x="24" y="222" className="lbl">
        gas in
      </text>
      <path d="M310 300 L378 300" stroke="#9aa3af" strokeWidth="6" strokeLinecap="round" />
      <text x="352" y="292" className="lbl">
        to pump
      </text>

      {/* viewport */}
      <circle cx="140" cy="300" r="13" fill={glowing ? `rgb(${r},${g},${b})` : '#1a1d22'} stroke="#c7ccd2" strokeWidth="2" opacity={glowing ? 0.9 : 1} />

      {/* readouts */}
      <g className="hud">
        <text x="24" y="500">
          {s.chamber.pressure < 1 ? s.chamber.pressure.toExponential(1) : s.chamber.pressure.toFixed(2)} Torr
        </text>
        <text x="24" y="520">
          FP {s.generator.forward.toFixed(0)} W / RP {s.generator.reflected.toFixed(0)} W
        </text>
        <text x="24" y="540">
          pyrometer {s.thermal.pyrometerReading > 0 ? s.thermal.pyrometerReading.toFixed(0) + ' \u00b0C' : '---'}
        </text>
      </g>
    </svg>
  )
}
