import * as THREE from 'three'

export const JOURNEY_CAMERA_STOPS = [
  { scroll: 0, camera: 0 },
  { scroll: 0.11, camera: 0 },
  { scroll: 0.18, camera: 0.12 },
  { scroll: 0.29, camera: 0.12 },
  { scroll: 0.38, camera: 0.3 },
  { scroll: 0.52, camera: 0.3 },
  { scroll: 0.63, camera: 0.52 },
  { scroll: 0.84, camera: 0.82 },
  { scroll: 0.91, camera: 0.88 },
  { scroll: 0.98, camera: 0.96 },
  { scroll: 1, camera: 1 },
]

export function getJourneyCameraProgress(scroll: number) {
  for (let index = 1; index < JOURNEY_CAMERA_STOPS.length; index += 1) {
    const previous = JOURNEY_CAMERA_STOPS[index - 1]
    const current = JOURNEY_CAMERA_STOPS[index]
    if (scroll <= current.scroll) {
      const segmentProgress = THREE.MathUtils.smoothstep(
        THREE.MathUtils.clamp((scroll - previous.scroll) / (current.scroll - previous.scroll), 0, 1),
        0,
        1,
      )
      return THREE.MathUtils.lerp(previous.camera, current.camera, segmentProgress)
    }
  }
  return 1
}

export function updateCamera(
  camera: THREE.PerspectiveCamera,
  path: THREE.CatmullRomCurve3,
  progress: number,
  lookAhead: number,
  lookTarget: THREE.Vector3,
) {
  const cameraProgress = getJourneyCameraProgress(progress)
  path.getPointAt(cameraProgress, camera.position)
  path.getPointAt(Math.min(cameraProgress + lookAhead, 1), lookTarget)
  camera.lookAt(lookTarget)
  return cameraProgress
}
