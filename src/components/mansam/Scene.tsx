import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CAMERA_PATH, LOOK_AHEAD_STEP, MACHINE_POSITION, MACHINE_SCALE } from './constants'
import type { WorldSceneProps } from './types'
import type { HotspotDefinition } from './hotspot-config'

type MachineState = {
  activeHotspot: HotspotDefinition | null
  mouseX: number
  mouseY: number
}

function dotTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const gradient = ctx!.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,.95)')
  gradient.addColorStop(0.4, 'rgba(190,220,235,.5)')
  gradient.addColorStop(1, 'rgba(190,220,235,0)')
  ctx!.fillStyle = gradient
  ctx!.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

function sunTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx!.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,238,214,0.95)')
  gradient.addColorStop(0.25, 'rgba(255,190,110,0.55)')
  gradient.addColorStop(0.6, 'rgba(230,140,70,0.15)')
  gradient.addColorStop(1, 'rgba(230,140,70,0)')
  ctx!.fillStyle = gradient
  ctx!.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function shaftTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 460
  const ctx = canvas.getContext('2d')
  const gradient = ctx!.createLinearGradient(0, 0, 0, 460)
  gradient.addColorStop(0, 'rgba(255,225,180,.5)')
  gradient.addColorStop(0.6, 'rgba(180,150,120,.1)')
  gradient.addColorStop(1, 'rgba(180,150,120,0)')
  ctx!.fillStyle = gradient
  ctx!.fillRect(0, 0, 100, 460)
  return new THREE.CanvasTexture(canvas)
}

function createField(count: number, spread: number, zRange: number, size: number, opacity: number, color: number) {
  const pos = new Float32Array(count * 3)
  const spd = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * spread
    pos[i * 3 + 1] = (Math.random() - 0.5) * 40 - 4
    pos[i * 3 + 2] = (Math.random() * zRange) - zRange * 0.8
    spd[i] = 0.1 + Math.random() * 0.3
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const material = new THREE.PointsMaterial({
    size,
    map: dotTexture(),
    transparent: true,
    depthWrite: false,
    color,
    opacity,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  return { points, geometry, spd, count }
}

export function Scene({ progress, onPlayVisibilityChange }: WorldSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const fog = new THREE.FogExp2(0x03101d, 0.012)
    scene.fog = fog

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300)
    const cameraPath = CAMERA_PATH

    const sunDir = new THREE.Vector3(0.55, 0.30, -0.55).normalize()
    const oceanUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sunDir },
      uCameraPos: { value: camera.position },
      uDeepColor: { value: new THREE.Color(0x052232) },
      uShallowColor: { value: new THREE.Color(0xdf9c5e) },
      uSunColor: { value: new THREE.Color(0xffb066) },
      uOpacity: { value: 1 },
    }

    const oceanGeo = new THREE.PlaneGeometry(700, 700, 110, 110)
    oceanGeo.rotateX(-Math.PI / 2)

    const oceanMat = new THREE.ShaderMaterial({
      uniforms: oceanUniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vElevation;
        float waveHeight(vec2 p, float t){
          float e = 0.0;
          e += 0.55 * sin(dot(p, normalize(vec2(1.0,0.3))) * 0.07 + t*1.1);
          e += 0.28 * sin(dot(p, normalize(vec2(-0.6,1.0))) * 0.14 + t*1.7);
          e += 0.13 * sin(dot(p, normalize(vec2(0.4,-0.8))) * 0.33 + t*2.5);
          e += 0.05 * sin(dot(p, normalize(vec2(0.9,0.5))) * 0.62 + t*3.3);
          return e;
        }
        void main(){
          vec3 pos = position;
          float e = waveHeight(pos.xz, uTime);
          pos.y += e;
          float eps = 0.8;
          float hx = waveHeight(pos.xz + vec2(eps,0.0), uTime);
          float hz = waveHeight(pos.xz + vec2(0.0,eps), uTime);
          vec3 tangentX = normalize(vec3(eps, hx-e, 0.0));
          vec3 tangentZ = normalize(vec3(0.0, hz-e, eps));
          vNormal = normalize(cross(tangentZ, tangentX));
          vElevation = e;
          vec4 worldPos = modelMatrix * vec4(pos,1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunColor;
        uniform vec3 uCameraPos;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vElevation;
        void main(){
          vec3 viewDir = normalize(uCameraPos - vWorldPos);
          vec3 n = normalize(vNormal);
          float fresnel = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.0);
          vec3 reflectDir = reflect(-uSunDir, n);
          float spec = pow(max(dot(reflectDir, viewDir), 0.0), 140.0);
          float glint = pow(max(dot(reflectDir, viewDir), 0.0), 14.0) * 0.35;
          vec3 base = mix(uDeepColor, uShallowColor, fresnel);
          vec3 color = base + uSunColor * (spec*1.6 + glint);
          color += vElevation * 0.05;
          gl_FragColor = vec4(color, uOpacity);
        }
      `,
    })

    const ocean = new THREE.Mesh(oceanGeo, oceanMat)
    scene.add(ocean)

    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }))
    sunSprite.scale.set(60, 60, 1)
    sunSprite.position.set(sunDir.x * 180, sunDir.y * 180 + 3, sunDir.z * 180)
    scene.add(sunSprite)

    const nearField = createField(1200, 50, 120, 0.26, 0.6, 0xcfe7ef)
    const farField = createField(500, 90, 160, 0.55, 0.35, 0x2f7c9c)
    const nearFieldBaseOpacity = nearField.points.material.opacity
    const farFieldBaseOpacity = farField.points.material.opacity
    nearField.points.material.opacity = 0
    farField.points.material.opacity = 0
    scene.add(nearField.points)
    scene.add(farField.points)

    const shaftGroup = new THREE.Group()
    const shaftTex = shaftTexture()
    for (let i = 0; i < 5; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 36),
        new THREE.MeshBasicMaterial({
          map: shaftTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      mesh.position.set((i - 2) * 8, 10, -4 - i * 4)
      mesh.rotation.x = -0.2
      mesh.rotation.z = (Math.random() - 0.5) * 0.25
      mesh.material.opacity = 0
      shaftGroup.add(mesh)
    }
    scene.add(shaftGroup)
    const shaftFade = { v: 0 }

    const debris = new THREE.Group()
    const debrisGeo = new THREE.IcosahedronGeometry(0.6, 0)
    for (let i = 0; i < 10; i += 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x264a5c,
        metalness: 0.6,
        roughness: 0.4,
        transparent: true,
        opacity: 0,
      })
      const mesh = new THREE.Mesh(debrisGeo, mat)
      mesh.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30 - 8, -30 - Math.random() * 60)
      mesh.scale.setScalar(0.4 + Math.random() * 0.8)
      mesh.userData.spin = (Math.random() - 0.5) * 0.4
      debris.add(mesh)
    }
    scene.add(debris)
    const debrisFade = { v: 0 }

    const discoveryCanvas = document.createElement('canvas')
    discoveryCanvas.width = 1200
    discoveryCanvas.height = 700
    const discoveryCtx = discoveryCanvas.getContext('2d')
    const discoveryTexture = new THREE.CanvasTexture(discoveryCanvas)
    const discoveryPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(13.5, 7.8),
      new THREE.MeshBasicMaterial({
        map: discoveryTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    discoveryPlane.position.set(0, -2.4, -64)
    scene.add(discoveryPlane)

    function paintDiscovery(time: number) {
      const w = discoveryCanvas.width
      const h = discoveryCanvas.height
      const gradient = discoveryCtx!.createLinearGradient(0, 0, w, h)
      gradient.addColorStop(0, '#041E36')
      gradient.addColorStop(0.5, '#0F4F6C')
      gradient.addColorStop(1, '#08263a')
      discoveryCtx!.fillStyle = gradient
      discoveryCtx!.fillRect(0, 0, w, h)

      discoveryCtx!.fillStyle = 'rgba(217,221,226,0.10)'
      for (let i = 0; i < 70; i += 1) {
        const x = Math.random() * w
        const y = Math.random() * h
        const r = 1 + Math.random() * 3
        discoveryCtx!.beginPath()
        discoveryCtx!.arc(x, y, r, 0, Math.PI * 2)
        discoveryCtx!.fill()
      }

      discoveryCtx!.strokeStyle = 'rgba(199,107,41,0.35)'
      discoveryCtx!.lineWidth = 4
      discoveryCtx!.beginPath()
      discoveryCtx!.moveTo(120, h * 0.74)
      discoveryCtx!.lineTo(420 + Math.sin(time * 0.5) * 28, h * 0.74)
      discoveryCtx!.lineTo(530 + Math.sin(time * 0.5) * 24, h * 0.42)
      discoveryCtx!.lineTo(840 + Math.sin(time * 0.5) * 20, h * 0.42)
      discoveryCtx!.lineTo(910 + Math.sin(time * 0.5) * 16, h * 0.22)
      discoveryCtx!.lineTo(w - 120, h * 0.22)
      discoveryCtx!.stroke()

      discoveryCtx!.strokeStyle = 'rgba(217,221,226,0.18)'
      discoveryCtx!.lineWidth = 1.8
      discoveryCtx!.beginPath()
      discoveryCtx!.moveTo(140, h * 0.25)
      discoveryCtx!.lineTo(360, h * 0.25)
      discoveryCtx!.lineTo(430, h * 0.52)
      discoveryCtx!.lineTo(760, h * 0.52)
      discoveryCtx!.lineTo(830, h * 0.78)
      discoveryCtx!.lineTo(w - 130, h * 0.78)
      discoveryCtx!.stroke()

      discoveryCtx!.fillStyle = 'rgba(255,255,255,0.92)'
      discoveryCtx!.font = '700 62px Raleway, sans-serif'
      discoveryCtx!.fillText('MANSAM', 110, 150)
      discoveryCtx!.fillStyle = 'rgba(217,221,226,0.78)'
      discoveryCtx!.font = '500 28px Manrope, sans-serif'
      discoveryCtx!.fillText('ENGINEERING EXCELLENCE', 112, 205)

      discoveryTexture.needsUpdate = true
    }

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resize)

    const hemi = new THREE.HemisphereLight(0xffe3bd, 0x03101d, 1.05)
    scene.add(hemi)
    const key = new THREE.PointLight(0xffd8b0, 1.3, 90)
    key.position.set(10, 14, 14)
    scene.add(key)
    const accentLight = new THREE.PointLight(0xC76B29, 0, 60)
    accentLight.position.set(0, 2, -70)
    scene.add(accentLight)

    const clock = new THREE.Clock()
    const lookAhead = LOOK_AHEAD_STEP
    let scrollProgress = progress

    function animate() {
      const time = clock.getElapsedTime()
      oceanUniforms.uTime.value = time
      oceanUniforms.uCameraPos.value.copy(camera.position)

      const attributes = nearField.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < nearField.count; i += 1) {
        attributes[i * 3 + 1] += nearField.spd[i] * 0.012
        if (attributes[i * 3 + 1] > 36) attributes[i * 3 + 1] = -36
      }
      nearField.geometry.attributes.position.needsUpdate = true

      const attributes2 = farField.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < farField.count; i += 1) {
        attributes2[i * 3 + 1] += farField.spd[i] * 0.007
        if (attributes2[i * 3 + 1] > 36) attributes2[i * 3 + 1] = -36
      }
      farField.geometry.attributes.position.needsUpdate = true

      const depthProgress = THREE.MathUtils.clamp(scrollProgress * 1.15, 0, 1)
      const surfaceZone = THREE.MathUtils.smoothstep(depthProgress, 0.0, 0.14)
      const engineeringZone = THREE.MathUtils.smoothstep(depthProgress, 0.10, 0.42)
      const deepZone = THREE.MathUtils.smoothstep(depthProgress, 0.38, 1.0)

      const surfaceColor = new THREE.Color('#9fb8c9')
      const engineeringColor = new THREE.Color('#0F4F6C')
      const deepColor = new THREE.Color('#041E36')
      const fogSurface = new THREE.Color('#b9c8d3')
      const fogEngineering = new THREE.Color('#0F4F6C')
      const fogDeep = new THREE.Color('#041E36')
      const nearParticleSurface = new THREE.Color('#d9e7f0')
      const nearParticleEngineering = new THREE.Color('#9fb7c8')
      const nearParticleDeep = new THREE.Color('#132b3f')
      const farParticleSurface = new THREE.Color('#7e9bb2')
      const farParticleEngineering = new THREE.Color('#496f87')
      const farParticleDeep = new THREE.Color('#0a1b2a')

      const blendedSurface = surfaceColor.clone().lerp(engineeringColor, engineeringZone * 0.42)
      const blendedDeep = deepColor.clone().lerp(engineeringColor, 0.18)
      const fogColor = fogSurface.clone().lerp(fogEngineering, engineeringZone * 0.72).lerp(fogDeep, deepZone * 0.8)

      oceanUniforms.uShallowColor.value.copy(blendedSurface)
      oceanUniforms.uDeepColor.value.copy(blendedDeep)
      oceanUniforms.uSunColor.value.copy(new THREE.Color('#f6c48f').lerp(new THREE.Color('#D9DDE2'), engineeringZone * 0.52).lerp(new THREE.Color('#0F4F6C'), deepZone * 0.38))

      oceanUniforms.uOpacity.value = 0.92 - surfaceZone * 0.13 + deepZone * 0.03
      sunSprite.material.opacity = Math.max(0, 0.82 - depthProgress * 0.62)

      const nearParticleColor = nearParticleSurface.clone().lerp(nearParticleEngineering, engineeringZone * 0.85).lerp(nearParticleDeep, deepZone * 0.92)
      const farParticleColor = farParticleSurface.clone().lerp(farParticleEngineering, engineeringZone * 0.65).lerp(farParticleDeep, deepZone * 0.9)
      nearField.points.material.color.copy(nearParticleColor)
      farField.points.material.color.copy(farParticleColor)
      nearField.points.material.opacity = nearFieldBaseOpacity * (0.18 + engineeringZone * 0.42 + deepZone * 0.18)
      farField.points.material.opacity = farFieldBaseOpacity * (0.12 + deepZone * 0.42)
      nearField.points.material.size = 0.26 + engineeringZone * 0.06 - deepZone * 0.04
      farField.points.material.size = 0.55 + deepZone * 0.12

      shaftGroup.children.forEach((mesh, index) => {
        const shaftDepth = THREE.MathUtils.clamp(index / Math.max(shaftGroup.children.length - 1, 1), 0, 1)
        const shaftMesh = mesh as THREE.Mesh
        const shaftMaterial = shaftMesh.material as THREE.MeshBasicMaterial
        shaftMaterial.opacity = (0.08 + engineeringZone * 0.32 + deepZone * 0.25) * (1 - shaftDepth * 0.28)
      })

      debris.children.forEach((mesh) => {
        const debrisMesh = mesh as THREE.Mesh
        debrisMesh.rotation.x += debrisMesh.userData.spin * 0.01
        debrisMesh.rotation.y += debrisMesh.userData.spin * 0.008
        const debrisMaterial = debrisMesh.material as THREE.MeshStandardMaterial
        debrisMaterial.opacity = debrisFade.v * 0.5
      })

      const thumbnailDistance = camera.position.distanceTo(discoveryPlane.position)
      const thumbnailReveal = 1 - THREE.MathUtils.clamp((thumbnailDistance - 18) / 86, 0, 1)
      discoveryPlane.material.opacity = Math.max(0, thumbnailReveal * 0.95)
      onPlayVisibilityChange?.(thumbnailReveal > 0.2)

      const curvePoint = cameraPath.getPointAt(scrollProgress)
      const curveLookTarget = cameraPath.getPointAt(Math.min(scrollProgress + lookAhead, 1))
      camera.position.copy(curvePoint)
      camera.lookAt(curveLookTarget)

      fog.color.copy(fogColor)
      fog.density = 0.012 + engineeringZone * 0.028 + deepZone * 0.06
      hemi.color.copy(new THREE.Color('#ffe6c5').lerp(new THREE.Color('#c8d8e6'), engineeringZone * 0.6).lerp(new THREE.Color('#0F4F6C'), deepZone * 0.72))
      hemi.intensity = 1.05 - engineeringZone * 0.22 - deepZone * 0.58
      key.color.copy(new THREE.Color('#ffd8a8').lerp(new THREE.Color('#b8d2e1'), engineeringZone * 0.65).lerp(new THREE.Color('#0F4F6C'), deepZone * 0.5))
      key.intensity = 1.3 - engineeringZone * 0.34 - deepZone * 0.72
      accentLight.color.copy(new THREE.Color('#C76B29').lerp(new THREE.Color('#D9DDE2'), deepZone * 0.4))
      accentLight.intensity = 0.18 + deepZone * 0.7
      shaftFade.v = 0.14 + engineeringZone * 0.25 + deepZone * 0.42
      debrisFade.v = deepZone * 0.85

      paintDiscovery(time)
      renderer.render(scene, camera)
      scrollProgress = progress
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      renderer.dispose()
      scene.clear()
    }
  }, [progress, onPlayVisibilityChange])

  return <canvas id="world-canvas" ref={canvasRef} />
}
