import { describe, expect, it } from 'vitest'
import { initialState } from './initial'
import { apply, tick, type Action } from './engine'
import { optimumTuning } from './physics'
import type { SimState } from './types'

function run(s: SimState, seconds: number) {
  for (let i = 0; i < seconds * 10; i++) tick(s, 0.1)
}
function act(s: SimState, ...as: Action[]) {
  for (const a of as) apply(s, a)
}
function match(s: SimState) {
  const o = optimumTuning(s.chamber.pressure, s.plasma.lit)
  act(s, { type: 'tuner', key: 'stub1', value: o.stub1 }, { type: 'tuner', key: 'stub2', value: o.stub2 }, { type: 'tuner', key: 'slidingShort', value: o.slidingShort })
}

describe('CO2/CH4 run', () => {
  it('pumps down, strikes, ramps and grows diamond', () => {
    const s = initialState('CO2CH4')
    act(s, { type: 'loadSample' }, { type: 'jack', value: 1 })
    expect(s.chamber.sealed).toBe(true)

    act(s, { type: 'throttleMode', mode: 'open' }, { type: 'pump', on: true })
    run(s, 60)
    expect(s.chamber.pressure).toBeLessThan(0.1)

    act(
      s,
      { type: 'cylinder', gas: 'CH4', open: true },
      { type: 'panelValve', gas: 'CH4', open: true },
      { type: 'mfcChannel', gas: 'CH4', on: true },
      { type: 'mfcSetpoint', gas: 'CH4', value: 52 },
      { type: 'cylinder', gas: 'CO2', open: true },
      { type: 'panelValve', gas: 'CO2', open: true },
      { type: 'mfcChannel', gas: 'CO2', on: true },
      { type: 'mfcSetpoint', gas: 'CO2', value: 48 },
      { type: 'throttleMode', mode: 'auto' },
      { type: 'pressureSetpoint', value: 12 },
    )
    run(s, 60)
    expect(s.chamber.pressure).toBeGreaterThan(9)
    expect(s.chamber.pressure).toBeLessThan(16)

    match(s)
    act(s, { type: 'genPower', on: true }, { type: 'genStandby', on: true }, { type: 'genSetpoint', value: 1000 }, { type: 'genRun', on: true })
    run(s, 10)
    expect(s.plasma.lit).toBe(true)

    // ramp in steps, retuning
    for (const [p, w] of [[20, 950], [30, 1000], [45, 1050]] as [number, number][]) {
      act(s, { type: 'pressureSetpoint', value: p }, { type: 'genSetpoint', value: w })
      run(s, 30)
      match(s)
      run(s, 20)
      expect(s.plasma.lit).toBe(true)
    }
    run(s, 200)

    expect(s.windowCracked).toBe(false)
    expect(s.thermal.substrate).toBeGreaterThan(350)
    expect(s.growth.ternary.C - s.growth.ternary.O).toBeGreaterThan(0)
    expect(s.growth.thickness).toBeGreaterThan(0)
    expect(s.growth.regime).toMatch(/diamond/)
  })
})

describe('safety behaviours', () => {
  it('trips the interlock when cooling water is lost', () => {
    const s = initialState('H2CH4')
    act(s, { type: 'loadSample' }, { type: 'jack', value: 1 }, { type: 'throttleMode', mode: 'open' }, { type: 'pump', on: true })
    run(s, 40)
    act(
      s,
      { type: 'cylinder', gas: 'H2', open: true },
      { type: 'panelValve', gas: 'H2', open: true },
      { type: 'mfcChannel', gas: 'H2', on: true },
      { type: 'mfcSetpoint', gas: 'H2', value: 300 },
      { type: 'throttleMode', mode: 'auto' },
      { type: 'pressureSetpoint', value: 20 },
    )
    run(s, 60)
    match(s)
    act(s, { type: 'genPower', on: true }, { type: 'genStandby', on: true }, { type: 'genSetpoint', value: 750 }, { type: 'genRun', on: true })
    run(s, 10)
    expect(s.plasma.lit).toBe(true)

    act(s, { type: 'utility', key: 'coolingWater', on: false })
    run(s, 2)
    expect(s.interlocks.tripped).toBe(true)
    expect(s.plasma.lit).toBe(false)
    expect(s.generator.running).toBe(false)
  })

  it('will not seal or pump down with the jack part raised', () => {
    const s = initialState('H2CH4')
    act(s, { type: 'jack', value: 0.8 }, { type: 'throttleMode', mode: 'open' }, { type: 'pump', on: true })
    run(s, 60)
    expect(s.chamber.sealed).toBe(false)
    expect(s.chamber.pressure).toBeGreaterThan(700)
  })

  it('cracks the quartz window if the ball rides high', () => {
    const s = initialState('H2CH4')
    act(s, { type: 'loadSample' }, { type: 'jack', value: 1 }, { type: 'throttleMode', mode: 'open' }, { type: 'pump', on: true })
    run(s, 40)
    act(
      s,
      { type: 'cylinder', gas: 'H2', open: true },
      { type: 'panelValve', gas: 'H2', open: true },
      { type: 'mfcChannel', gas: 'H2', on: true },
      { type: 'mfcSetpoint', gas: 'H2', value: 300 },
      { type: 'throttleMode', mode: 'auto' },
      { type: 'pressureSetpoint', value: 18 },
    )
    run(s, 60)
    match(s)
    act(s, { type: 'genPower', on: true }, { type: 'genStandby', on: true }, { type: 'genSetpoint', value: 700 }, { type: 'genRun', on: true })
    run(s, 10)
    expect(s.plasma.lit).toBe(true)
    // now do the wrong thing: drop pressure hard while winding power up
    act(s, { type: 'pressureSetpoint', value: 6 }, { type: 'genSetpoint', value: 2000 })
    run(s, 120)
    expect(s.windowCracked).toBe(true)
  })
})
