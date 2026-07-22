// ---------------------------------------------------------------------------
// Hotspot coordinates for the photograph based rig views.
//
// All values are fractions of the image width and height, so they survive
// resizing. They were estimated by eye and by automatic detection of the
// illuminated displays, and they are APPROXIMATE.
//
// To fix them: open the app, switch to a photo view, tick "calibrate", drag and
// resize the boxes onto the real instruments, press "Copy JSON", and paste the
// result over the REGIONS array below.
// ---------------------------------------------------------------------------

export type PhotoId = 'rack' | 'gaspanel' | 'chamber' | 'stage' | 'overview'

export interface Photo {
  id: PhotoId
  file: string
  label: string
  credit: string
}

export const PHOTOS: Photo[] = [
  { id: 'rack', file: 'rack.jpg', label: 'Instrument rack', credit: 'IMG_1582' },
  { id: 'gaspanel', file: 'gaspanel.jpg', label: 'Gas panel', credit: 'IMG_1413' },
  { id: 'chamber', file: 'chamber.jpg', label: 'Chamber, closed', credit: 'IMG_1412' },
  { id: 'stage', file: 'stage.jpg', label: 'Chamber open, stage', credit: 'IMG_1491' },
  { id: 'overview', file: 'overview.jpg', label: 'Bench overview', credit: 'IMG_1408' },
]

/** What a region does when the simulation is running. */
export type RegionKind =
  | 'readout' // draws live instrument text over the real display
  | 'control' // clickable, drives an action
  | 'glow' // plasma light spills out of a viewport here
  | 'note' // labelled only, no behaviour

export interface Region {
  id: string
  photo: PhotoId
  kind: RegionKind
  label: string
  x: number
  y: number
  w: number
  h: number
  /** For glow regions, radius as a fraction of image width. */
  r?: number
  confidence: 'detected' | 'estimated'
}

export const REGIONS: Region[] = [
  // --- instrument rack ----------------------------------------------------
  { id: 'sairem_lcd', photo: 'rack', kind: 'readout', label: 'SAIREM generator', x: 0.541, y: 0.199, w: 0.124, h: 0.057, confidence: 'detected' },
  { id: 'sairem_start', photo: 'rack', kind: 'control', label: 'START / STOP', x: 0.688, y: 0.196, w: 0.052, h: 0.056, confidence: 'estimated' },
  { id: 'sairem_standby', photo: 'rack', kind: 'control', label: 'STAND BY', x: 0.792, y: 0.203, w: 0.048, h: 0.038, confidence: 'estimated' },
  { id: 'type153', photo: 'rack', kind: 'readout', label: 'Type 153 exhaust valve', x: 0.395, y: 0.408, w: 0.200, h: 0.058, confidence: 'estimated' },
  { id: 'mks647c', photo: 'rack', kind: 'readout', label: 'MKS 647C gas controller', x: 0.555, y: 0.497, w: 0.195, h: 0.058, confidence: 'estimated' },
  { id: 'pressure_lcd', photo: 'rack', kind: 'readout', label: 'Chamber pressure', x: 0.522, y: 0.613, w: 0.086, h: 0.037, confidence: 'detected' },
  { id: 'thermopoint', photo: 'rack', kind: 'readout', label: 'Thermopoint pyrometer', x: 0.397, y: 0.741, w: 0.106, h: 0.045, confidence: 'detected' },
  { id: 'waterpanel', photo: 'rack', kind: 'readout', label: 'Water and reflected power', x: 0.640, y: 0.735, w: 0.092, h: 0.058, confidence: 'estimated' },
  { id: 'fluke', photo: 'rack', kind: 'readout', label: 'Fluke 52 II thermocouple', x: 0.198, y: 0.352, w: 0.112, h: 0.078, confidence: 'estimated' },

  // --- gas panel ----------------------------------------------------------
  { id: 'valve_H2', photo: 'gaspanel', kind: 'control', label: 'H2 isolation', x: 0.235, y: 0.395, w: 0.130, h: 0.075, confidence: 'estimated' },
  { id: 'valve_CH4', photo: 'gaspanel', kind: 'control', label: 'CH4 isolation', x: 0.540, y: 0.375, w: 0.115, h: 0.070, confidence: 'estimated' },
  { id: 'valve_CO2', photo: 'gaspanel', kind: 'control', label: 'CO2 isolation (to be fitted)', x: 0.655, y: 0.372, w: 0.105, h: 0.068, confidence: 'estimated' },
  { id: 'valve_Ar', photo: 'gaspanel', kind: 'control', label: 'Ar isolation', x: 0.310, y: 0.845, w: 0.140, h: 0.075, confidence: 'estimated' },
  { id: 'valve_N2', photo: 'gaspanel', kind: 'control', label: 'N2 isolation', x: 0.745, y: 0.370, w: 0.100, h: 0.065, confidence: 'estimated' },
  { id: 'mfc_CH4', photo: 'gaspanel', kind: 'readout', label: 'CH4 MFC', x: 0.585, y: 0.700, w: 0.165, h: 0.055, confidence: 'estimated' },
  { id: 'mfc_Ar', photo: 'gaspanel', kind: 'readout', label: 'Ar MFC', x: 0.290, y: 0.812, w: 0.175, h: 0.058, confidence: 'estimated' },

  // --- chamber, closed ----------------------------------------------------
  { id: 'viewport', photo: 'chamber', kind: 'glow', label: 'Viewport', x: 0.405, y: 0.452, w: 0.075, h: 0.056, r: 0.055, confidence: 'estimated' },
  { id: 'cavity_body', photo: 'chamber', kind: 'note', label: 'Cavity body', x: 0.330, y: 0.330, w: 0.310, h: 0.230, confidence: 'estimated' },
  { id: 'jack_knob', photo: 'chamber', kind: 'control', label: 'Jack', x: 0.590, y: 0.700, w: 0.080, h: 0.060, confidence: 'estimated' },

  // --- chamber open -------------------------------------------------------
  { id: 'substrate_stage', photo: 'stage', kind: 'control', label: 'Substrate stage', x: 0.390, y: 0.740, w: 0.230, h: 0.110, confidence: 'estimated' },
  { id: 'window_open', photo: 'stage', kind: 'note', label: 'Quartz window, seen through the viewport', x: 0.400, y: 0.245, w: 0.180, h: 0.130, confidence: 'estimated' },
]

export function regionsFor(photo: PhotoId): Region[] {
  return REGIONS.filter((r) => r.photo === photo)
}
