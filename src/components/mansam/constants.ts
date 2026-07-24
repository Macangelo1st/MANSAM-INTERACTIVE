import * as THREE from 'three'

export const COLOR_PALETTE = {
  oceanDepth: new THREE.Color('#041E36'),
  engineeringPrecision: new THREE.Color('#0F4F6C'),
  growthReliability: new THREE.Color('#C76B29'),
  industrialStrength: new THREE.Color('#D9DDE2'),
  white: new THREE.Color('#FFFFFF'),
}

export const CAMERA_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 11, 26),
  new THREE.Vector3(0.4, 8.2, 18),
  new THREE.Vector3(-0.8, 4.4, 4),
  new THREE.Vector3(1.2, 0.8, -28),
  new THREE.Vector3(-1.4, -5.8, -86),
  new THREE.Vector3(0.8, -12.5, -158),
  new THREE.Vector3(2.2, -20.5, -238),
  new THREE.Vector3(-1.6, -30, -330),
  new THREE.Vector3(1.1, -39, -422),
  new THREE.Vector3(-0.5, -46, -486),
  new THREE.Vector3(0, -49, -522),
  new THREE.Vector3(0, -50, -536),
], false, 'catmullrom', 0.15)

export const LOOK_AHEAD_STEP = 0.032

export const MACHINE_POSITION = new THREE.Vector3(0, -48, -520)
