# MWCVD reactor trainer

An interactive operator trainer for a 2.45 GHz microwave plasma CVD diamond reactor of the
type in the School of Chemistry at the University of Bristol: a SAIREM generator feeding a
compact aluminium cavity, MKS 647C multi gas controller, MKS Type 153 exhaust valve
controller, water cooled substrate stage on a scissor jack, and a Thermopoint pyrometer.

The trainee has to bring the rig up from cold: seat the chamber, pump down, establish gas
flows, set a strike pressure, bring the generator out of standby, strike the discharge, tune
out the reflected power, ramp to run condition, grow a film, and shut down cleanly. Faults
can be injected at any point.

> **Familiarisation aid only.** Every setpoint in this repository is provisional and has not
> yet been confirmed by the Bristol group. It is not a substitute for the local standard
> operating procedure, risk assessment or induction.

## Running it locally

You need Node.js 20 or newer. Check with `node --version`. If you do not have it, install from
[nodejs.org](https://nodejs.org) or, on a Mac with Homebrew, `brew install node`.

```bash
git clone https://github.com/<your-username>/mwcvd-trainer.git
cd mwcvd-trainer
npm install
npm run dev
```

Vite prints a local address, normally `http://localhost:5173`. Open it in a browser. Edits to
any file under `src/` reload the page immediately.

Other commands:

```bash
npm test     # runs the headless simulation tests, no browser involved
npm run build   # type checks and produces a static site in dist/
npm run preview # serves the built site locally
```

## Putting it on GitHub

1. Create a new empty repository on GitHub called `mwcvd-trainer`. Do not add a README,
   licence or .gitignore, because this folder already has them.
2. From inside this folder:

```bash
git init
git add .
git commit -m "Initial commit: MWCVD reactor trainer"
git branch -M main
git remote add origin https://github.com/<your-username>/mwcvd-trainer.git
git push -u origin main
```

3. On GitHub go to **Settings, Pages** and set **Source** to **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to
   `main`. After a minute or two the site is live at
   `https://<your-username>.github.io/mwcvd-trainer/`.

If you name the repository something other than `mwcvd-trainer`, change `base` in
`vite.config.ts` to match, otherwise the CSS and JavaScript will 404 on Pages.

## The three views

The left hand column switches between three renderings of the same simulation state.

**Vector cutaway.** A hand drawn SVG section. Always works, no assets needed. The plasma ball
genuinely moves and resizes with pressure and power, and the base flange drops with the jack.

**Rendered.** Uses Blender sprites if they are present, and falls back to the vector cutaway
if they are not. To generate them you need Blender installed locally, then:

```bash
blender --background --python tools/blender/reactor.py
```

That writes `public/sprites/reactor_closed.png` and `reactor_open.png` with transparent
backgrounds, and the app composites the plasma glow over them at runtime. Options:

```bash
blender -b -P tools/blender/reactor.py -- --samples 256 --width 1600
blender -b -P tools/blender/reactor.py -- --no-cutaway   # solid, not sectioned
```

The default is a quarter cutaway so the stage, substrate and quartz window are visible and
the plasma has somewhere to sit. Rendering takes a few minutes on CPU at the default 128
samples. If you move the camera in the script, update `SPRITE_ANCHOR` in
`src/ui/RenderedView.tsx` so the glow lands in the right place.

**Photographs.** Your own photographs of the rig with live instrument readouts drawn over the
real displays and clickable hotspots on the valves and buttons. Five views: instrument rack,
gas panel, chamber closed, chamber open, and a bench overview.

### Calibrating the photograph hotspots

The hotspot coordinates in `src/ui/hotspots.ts` were estimated, partly by automatically
detecting the illuminated displays. Some of them will be off. Fixing this takes two minutes:

1. Switch to the Photographs view.
2. Tick **calibrate**. The photo dims and every hotspot appears as a dashed box.
3. Drag the boxes onto the real instruments. Drag the small square at the bottom right corner
   to resize.
4. Press **Copy JSON** and paste the result over the `REGIONS` array in `src/ui/hotspots.ts`.

Coordinates are stored as fractions of the image, so they survive any resizing of the photos.

## How it is put together

The simulation is deliberately separated from the interface so it can be reviewed and tested
without a browser.

```
src/sim/            plant model and physics, no React anywhere
  gases.ts          gas properties, MFC correction factors, emission colours
  types.ts          the complete state shape
  initial.ts        cold start state
  physics.ts        ignition, coupling, ball geometry, thermal, growth chemistry
  engine.ts         the action dispatcher and the tick function
  procedures.ts     the SOP, expressed as data
  faults.ts         fault definitions, symptoms and correct responses
  smoke.test.ts     headless runs that assert the rig behaves
src/ui/             React components, thin viewers over the model
  ReactorView.tsx   vector cutaway
  RenderedView.tsx  Blender sprite compositing, falls back to the cutaway
  RigView.tsx       photograph views with overlays and the calibration editor
  hotspots.ts       photograph hotspot coordinates, edit these after calibrating
tools/blender/      parametric model and sprite renderer
public/photos/      rig photographs
public/sprites/     Blender output, generated, not in the repo until you make it
docs/               physics assumptions and the procedure write up
```

Everything the operator can do goes through `apply(state, action)` in `engine.ts`, so every
input is logged and a session can be replayed or assessed later.

## Where the content lives

The parts your colleagues will want to correct are all in plain files:

- `src/sim/procedures.ts` for the step by step procedure and its pass conditions
- `src/sim/faults.ts` for the fault list, symptoms and correct responses
- `src/sim/physics.ts` for the constants at the top of each section
- `docs/PHYSICS.md` for every assumption and where it came from

## Known gaps

- The rig as photographed has channels for H2, CH4, Ar and N2 on the 647C. There is **no CO2
  channel**. The CO2/CH4 recipe here assumes one is fitted.
- The generator front panel reads 2000 W. Confirm whether the head is 2 kW or 2.5 kW.
- Cavity dimensions, tuner behaviour and the real strike sequence are all estimates.
- Photograph hotspot coordinates are approximate. Use the calibration mode described above.
- The Blender model is built from the same provisional dimensions as the physics, so it is a
  reasonable likeness rather than a measured replica.
