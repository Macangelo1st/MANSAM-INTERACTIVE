import type * as THREE from 'three'
import type { HotspotDefinition } from './hotspot-config'

export type DepthState = {
  progress: number
  cameraPosition: THREE.Vector3
  cameraLookAt: THREE.Vector3
}

export type WorldSceneProps = {
  progress: number
  onDepthChange?: (value: number) => void
  onPlayVisibilityChange?: (visible: boolean) => void
  onHotspotChange?: (hotspot: HotspotDefinition | null) => void
}
