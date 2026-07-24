export type HotspotDefinition = {
  id: string
  name: string
  purpose: string
  technicalDescription: string
  keySpecifications: string[]
  position: {
    left: number
    top: number
    width: number
    height: number
  }
  callout: {
    startX: number
    startY: number
    endX: number
    endY: number
  }
}

export const MACHINE_ASSETS = {
  originalImage: '/src/assets/machine-original.jpg',
  xrayImage: '/src/assets/machine-xray.jpg',
}

export const HOTSPOT_CONFIG: HotspotDefinition[] = [
  {
    id: 'thruster-core',
    name: 'Thruster Core',
    purpose: 'Propulsion vector control',
    technicalDescription: 'High-flow wet-end assembly for controlled thrust and stabilisation during seabed inspection.',
    keySpecifications: ['4.8 kN thrust envelope', 'Hydraulic balancing module', 'Precision bearing stack'],
    position: { left: 18, top: 28, width: 18, height: 20 },
    callout: { startX: 24, startY: 38, endX: 72, endY: 22 },
  },
  {
    id: 'pressure-chamber',
    name: 'Pressure Chamber',
    purpose: 'Subsystem isolation and load management',
    technicalDescription: 'A reinforced inspection chamber designed to maintain controlled internal pressure during deployment.',
    keySpecifications: ['Pressure-rated shell', 'Sensor feed manifold', 'High-visibility service window'],
    position: { left: 52, top: 22, width: 18, height: 24 },
    callout: { startX: 61, startY: 34, endX: 72, endY: 38 },
  },
  {
    id: 'sensor-array',
    name: 'Sensor Array',
    purpose: 'Inspection and acoustic telemetry',
    technicalDescription: 'A layered sensing cluster tuned for imaging, acoustic capture, and signal relay in low-visibility water.',
    keySpecifications: ['Multi-band sensor stack', 'Optical telemetry eye', 'Rapid data relay path'],
    position: { left: 66, top: 48, width: 16, height: 18 },
    callout: { startX: 74, startY: 57, endX: 72, endY: 65 },
  },
]
