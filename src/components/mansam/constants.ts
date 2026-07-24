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
  new THREE.Vector3(0, 8.1, 18),
  new THREE.Vector3(0, 4.5, 9),
  new THREE.Vector3(0, 1.2, 0),
  new THREE.Vector3(0, -2.4, -14),
  new THREE.Vector3(0, -6.8, -42),
  new THREE.Vector3(0, -12.5, -86),
  new THREE.Vector3(0, -18.8, -148),
  new THREE.Vector3(0, -28, -220),
  new THREE.Vector3(0, -38, -280),
  new THREE.Vector3(0, -50, -340),
], false, 'catmullrom', 0.15)

export const LOOK_AHEAD_STEP = 0.032

export const MACHINE_POSITION = new THREE.Vector3(0, -52, -360)
export const MACHINE_SCALE = 3.2
