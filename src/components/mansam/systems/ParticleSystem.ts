import * as THREE from 'three'

export type ParticleField = {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  speeds: Float32Array
  drifts: Float32Array
  phases: Float32Array
  count: number
  verticalRange: [number, number]
  updateStride: number
}

function createDotTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,.95)')
  gradient.addColorStop(0.4, 'rgba(190,220,235,.5)')
  gradient.addColorStop(1, 'rgba(190,220,235,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

const sharedDotTexture = createDotTexture()

export function createParticleField(
  count: number,
  spread: number,
  zRange: number,
  size: number,
  opacity: number,
  color: number,
  updateStride = 1,
): ParticleField {
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  const drifts = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * spread
    positions[index * 3 + 1] = (Math.random() - 0.5) * 86 - 10
    positions[index * 3 + 2] = -(Math.random() * zRange)
    speeds[index] = 0.1 + Math.random() * 0.3
    drifts[index] = 0.04 + Math.random() * 0.12
    phases[index] = Math.random() * Math.PI * 2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    size,
    map: sharedDotTexture,
    transparent: true,
    depthWrite: false,
    color,
    opacity,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)

  return {
    points,
    geometry,
    material,
    speeds,
    drifts,
    phases,
    count,
    verticalRange: [-54, 33],
    updateStride,
  }
}

export function createBubbleField(count: number, spread: number, zRange: number, size: number, opacity: number, updateStride = 2) {
  return createParticleField(count, spread, zRange, size, opacity, 0xd9f3f5, updateStride)
}

export function updateParticleField(field: ParticleField, time: number, frame: number, verticalSpeed: number, lateralSpeed: number) {
  if (frame % field.updateStride !== 0) return
  const positions = field.geometry.attributes.position.array as Float32Array
  const [minimumY, maximumY] = field.verticalRange
  for (let index = 0; index < field.count; index += 1) {
    const offset = index * 3
    positions[offset] += Math.sin(time * lateralSpeed + field.phases[index]) * field.drifts[index] * 0.004
    positions[offset + 1] += verticalSpeed * field.speeds[index]
    if (positions[offset + 1] > maximumY) positions[offset + 1] = minimumY
  }
  field.geometry.attributes.position.needsUpdate = true
}

export function disposeParticleField(field: ParticleField) {
  field.geometry.dispose()
  field.material.dispose()
}

export function disposeParticleTexture() {
  sharedDotTexture.dispose()
}
