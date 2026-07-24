import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { MACHINE_POSITION, MACHINE_SCALE } from './constants'
import type { HotspotDefinition } from './hotspot-config'

type MachinePlaneProps = {
  visible: boolean
  activeHotspot: HotspotDefinition | null
  onMouseMove: (x: number, y: number) => void
}

export function MachinePlane({ visible, activeHotspot, onMouseMove }: MachinePlaneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const originalTextureRef = useRef<THREE.Texture | null>(null)
  const xrayTextureRef = useRef<THREE.Texture | null>(null)
  const [texturesLoaded, setTexturesLoaded] = useState(false)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const originalImage = '/src/assets/machine-original.jpg'
    const xrayImage = '/src/assets/machine-xray.jpg'

    loader.load(originalImage, (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      originalTextureRef.current = tex
    })

    loader.load(xrayImage, (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      xrayTextureRef.current = tex
    })

    let loadedCount = 0
    const checkLoaded = () => {
      loadedCount++
      if (loadedCount === 2) setTexturesLoaded(true)
    }

    loader.load(originalImage, () => checkLoaded())
    loader.load(xrayImage, () => checkLoaded())

    return () => {
      loader.dispose(originalTextureRef.current)
      loader.dispose(xrayTextureRef.current)
    }
  }, [])

  useEffect(() => {
    if (!groupRef.current) return

    const group = groupRef.current

    const geometry = new THREE.PlaneGeometry(10, 6, 1, 1)

    const material = new THREE.MeshBasicMaterial({
      map: originalTextureRef.current,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: visible ? 1 : 0,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(MACHINE_POSITION)
    mesh.scale.setScalar(MACHINE_SCALE)
    mesh.rotation.x = -0.15

    group.add(mesh)

    return () => {
      group.remove(mesh)
      geometry.dispose()
      material.dispose()
    }
  }, [visible, texturesLoaded])

  return <group ref={groupRef} />
}