import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { CAMERA_PATH, LOOK_AHEAD_STEP, MACHINE_POSITION } from './constants'
import type { WorldSceneProps } from './types'
import { HOTSPOT_CONFIG, type HotspotDefinition } from './hotspot-config'
import { createBubbleField, createParticleField, disposeParticleField, updateParticleField } from './systems/ParticleSystem'
import { getJourneyCameraProgress, updateCamera } from './systems/CameraSystem'
import originalMachineImage from '../../assets/machine-original.jpg'
import xrayMachineImage from '../../assets/machine-xray.jpg'

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose())
    return
  }
  material.dispose()
}

const machineVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const machineFragmentShader = `
  uniform sampler2D uOriginal;
  uniform sampler2D uXray;
  uniform vec2 uHotspotCenter;
  uniform vec2 uHotspotSize;
  uniform float uReveal;
  uniform float uInspection;
  varying vec2 vUv;
  void main() {
    vec4 original = texture2D(uOriginal, vUv);
    vec4 xray = texture2D(uXray, vUv);
    vec2 distanceFromCenter = abs(vUv - uHotspotCenter);
    float mask = 1.0 - smoothstep(0.72, 1.0, max(distanceFromCenter.x / uHotspotSize.x, distanceFromCenter.y / uHotspotSize.y));
    float reveal = uReveal * uInspection * mask;
    vec3 inspection = mix(original.rgb, xray.rgb, 0.92);
    inspection += vec3(0.02, 0.12, 0.16) * mask;
    gl_FragColor = vec4(mix(original.rgb, inspection, reveal), original.a * uReveal);
  }
`

const seabedVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    vUv = uv;
    vec3 displaced = position;
    float wave = sin(position.x * 0.11 + uTime * 0.035) * 0.35 + sin(position.y * 0.08 - uTime * 0.025) * 0.24;
    displaced.z += wave;
    vHeight = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const seabedFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vHeight;
  void main() {
    float grain = sin(vUv.x * 180.0) * sin(vUv.y * 140.0) * 0.035;
    float caustic = sin(vUv.x * 38.0 + uTime * 0.12) * sin(vUv.y * 26.0 - uTime * 0.09);
    caustic = smoothstep(0.72, 0.96, caustic) * 0.035;
    float edgeFade = smoothstep(0.0, 0.18, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    vec3 color = uColor + vec3(grain + vHeight * 0.025 + caustic);
    gl_FragColor = vec4(color, edgeFade);
  }
`

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

export function Scene({ progress, onHotspotChange }: WorldSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const fog = new THREE.FogExp2(0x03101d, 0.012)
    const backgroundColor = new THREE.Color('#071b28')
    scene.background = backgroundColor
    scene.fog = fog

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300)
    const cameraPath = CAMERA_PATH

    const sunDir = new THREE.Vector3(0.55, 0.30, -0.55).normalize()
    const oceanUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: sunDir },
      uCameraPos: { value: camera.position },
      uDeepColor: { value: new THREE.Color(0x052232) },
      uShallowColor: { value: new THREE.Color(0x6f9fac) },
      uSunColor: { value: new THREE.Color(0xb9d8d8) },
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

    const nearField = createParticleField(4200, 72, 560, 0.18, 0.42, 0xcfe7ef, 2)
    const farField = createParticleField(2200, 120, 580, 0.42, 0.28, 0x4d8ca2, 3)
    const bubbles = createBubbleField(700, 76, 560, 0.13, 0.22, 2)
    const largerBubbles = createBubbleField(90, 72, 560, 0.28, 0.13, 3)
    const seabedDust = createParticleField(850, 46, 72, 0.2, 0.24, 0xc5d6d1, 2)
    seabedDust.points.position.set(0, -47, -500)
    const nearFieldBaseOpacity = nearField.material.opacity
    const farFieldBaseOpacity = farField.material.opacity
    const bubbleBaseOpacity = bubbles.material.opacity
    const largerBubbleBaseOpacity = largerBubbles.material.opacity
    const seabedDustBaseOpacity = seabedDust.material.opacity
    nearField.material.opacity = 0
    farField.material.opacity = 0
    scene.add(nearField.points)
    scene.add(farField.points)
    scene.add(bubbles.points)
    scene.add(largerBubbles.points)
    scene.add(seabedDust.points)

    const seabed = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140, 36, 36),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#12333a') },
        },
        vertexShader: seabedVertexShader,
        fragmentShader: seabedFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    seabed.rotation.x = -Math.PI / 2
    seabed.position.set(0, -53, -520)
    scene.add(seabed)

    const rockGeometry = new THREE.DodecahedronGeometry(0.7, 0)
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x28474a,
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
      transparent: true,
      opacity: 0.8,
    })
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 72)
    const rockMatrix = new THREE.Matrix4()
    const rockPosition = new THREE.Vector3()
    const rockScale = new THREE.Vector3()
    const rockRotation = new THREE.Euler()
    for (let index = 0; index < rocks.count; index += 1) {
      rockPosition.set((Math.random() - 0.5) * 70, -52.1 + Math.random() * 1.2, -520 + (Math.random() - 0.5) * 70)
      rockScale.setScalar(0.3 + Math.random() * 1.6)
      rockRotation.set(Math.random(), Math.random(), Math.random())
      rockMatrix.compose(rockPosition, new THREE.Quaternion().setFromEuler(rockRotation), rockScale)
      rocks.setMatrixAt(index, rockMatrix)
    }
    rocks.instanceMatrix.needsUpdate = true
    scene.add(rocks)

    const shaftGroup = new THREE.Group()
    const shaftTex = shaftTexture()
    for (let i = 0; i < 12; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 70),
        new THREE.MeshBasicMaterial({
          map: shaftTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      mesh.position.set((i - 5.5) * 8, 8, -12 - i * 42)
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

    const textureLoader = new THREE.TextureLoader()
    const originalTexture = textureLoader.load(originalMachineImage)
    const xrayTexture = textureLoader.load(xrayMachineImage)
    ;[originalTexture, xrayTexture].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
    })

    const machineUniforms = {
      uOriginal: { value: originalTexture },
      uXray: { value: xrayTexture },
      uHotspotCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uHotspotSize: { value: new THREE.Vector2(0.12, 0.12) },
      uReveal: { value: 0 },
      uInspection: { value: 0 },
    }
    const machine = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.ShaderMaterial({
        uniforms: machineUniforms,
        vertexShader: machineVertexShader,
        fragmentShader: machineFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    machine.position.copy(MACHINE_POSITION)
    scene.add(machine)
    const leaderMaterial = new THREE.LineBasicMaterial({
      color: 0x7df6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const leaderGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
    const leaderLine = new THREE.Line(leaderGeometry, leaderMaterial)
    scene.add(leaderLine)

    const machineRaycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let activeHotspot: HotspotDefinition | null = null
    const setHotspot = (hotspot: HotspotDefinition | null) => {
      if (activeHotspot?.id === hotspot?.id) return
      activeHotspot = hotspot
      gsap.to(machineUniforms.uInspection, { value: hotspot ? 1 : 0, duration: 0.35, ease: 'power2.out' })
      if (hotspot) {
        machineUniforms.uHotspotCenter.value.set(
          (hotspot.position.left + hotspot.position.width / 2) / 100,
          1 - (hotspot.position.top + hotspot.position.height / 2) / 100,
        )
        machineUniforms.uHotspotSize.value.set(hotspot.position.width / 100, hotspot.position.height / 100)
        const toWorld = (x: number, y: number, z: number) => new THREE.Vector3((x / 100 - 0.5) * 18, (0.5 - y / 100) * 12, MACHINE_POSITION.z + z)
        leaderGeometry.setFromPoints([
          toWorld(hotspot.position.left + hotspot.position.width / 2, hotspot.position.top + hotspot.position.height / 2, 0.12),
          toWorld(hotspot.callout.startX, hotspot.callout.startY, 0.2),
          toWorld(hotspot.callout.endX, hotspot.callout.endY, 0.2),
        ])
      }
      gsap.to(leaderMaterial, { opacity: hotspot ? 0.9 : 0, duration: 0.35, ease: 'power2.out' })
      onHotspotChange?.(hotspot)
    }
    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
      machineRaycaster.setFromCamera(pointer, camera)
      const hit = machineRaycaster.intersectObject(machine)[0]
      if (!hit?.uv || machineUniforms.uReveal.value < 0.5) {
        setHotspot(null)
        return
      }
      const uv = hit.uv
      const hotspot = HOTSPOT_CONFIG.find((candidate) => {
        const x = uv.x * 100
        const y = (1 - uv.y) * 100
        return x >= candidate.position.left && x <= candidate.position.left + candidate.position.width && y >= candidate.position.top && y <= candidate.position.top + candidate.position.height
      }) ?? null
      setHotspot(hotspot)
    }
    window.addEventListener('pointermove', handlePointerMove)

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
    accentLight.position.copy(MACHINE_POSITION)
    accentLight.position.y += 3
    scene.add(accentLight)
    const machineAtmosphere = new THREE.PointLight(0x6bc4d0, 0, 46)
    machineAtmosphere.position.set(MACHINE_POSITION.x, MACHINE_POSITION.y + 5, MACHINE_POSITION.z + 8)
    scene.add(machineAtmosphere)

    const clock = new THREE.Clock()
    const lookAhead = LOOK_AHEAD_STEP
    const cameraLookTarget = new THREE.Vector3()
    let scrollProgress = 0
    let frame = 0
    let animationFrame = 0
    const surfaceColor = new THREE.Color('#78a9b4')
    const engineeringColor = new THREE.Color('#0F4F6C')
    const deepColor = new THREE.Color('#041E36')
    const fogSurface = new THREE.Color('#b9c8d3')
    const fogEngineering = new THREE.Color('#0F4F6C')
    const fogDeep = new THREE.Color('#041E36')
    const fogSeabed = new THREE.Color('#12333a')
    const nearParticleSurface = new THREE.Color('#d9e7f0')
    const nearParticleEngineering = new THREE.Color('#9fb7c8')
    const nearParticleDeep = new THREE.Color('#132b3f')
    const farParticleSurface = new THREE.Color('#7e9bb2')
    const farParticleEngineering = new THREE.Color('#496f87')
    const farParticleDeep = new THREE.Color('#0a1b2a')
    const sunBaseColor = new THREE.Color('#b9d8d8')
    const sunEngineeringColor = new THREE.Color('#D9DDE2')
    const sunDeepColor = new THREE.Color('#0F4F6C')
    const hemiSurfaceColor = new THREE.Color('#ffe6c5')
    const hemiEngineeringColor = new THREE.Color('#c8d8e6')
    const keySurfaceColor = new THREE.Color('#ffd8a8')
    const keyEngineeringColor = new THREE.Color('#b8d2e1')
    const accentBaseColor = new THREE.Color('#C76B29')
    const accentDeepColor = new THREE.Color('#D9DDE2')
    const blendedSurface = new THREE.Color()
    const blendedDeep = new THREE.Color()
    const fogColor = new THREE.Color()
    const sunColor = new THREE.Color()
    const nearParticleColor = new THREE.Color()
    const farParticleColor = new THREE.Color()

    function animate() {
      frame += 1
      const time = clock.getElapsedTime()
      oceanUniforms.uTime.value = time
      oceanUniforms.uCameraPos.value.copy(camera.position)

      updateParticleField(nearField, time, frame, 0.006, 0.16)
      updateParticleField(farField, time, frame, 0.003, 0.09)
      updateParticleField(bubbles, time, frame, 0.012, 0.3)
      updateParticleField(largerBubbles, time, frame, 0.008, 0.22)
      updateParticleField(seabedDust, time, frame, 0.001, 0.12)

      ;(seabed.material as THREE.ShaderMaterial).uniforms.uTime.value = time

      scrollProgress = progressRef.current
      const cameraProgress = getJourneyCameraProgress(scrollProgress)
      const depthProgress = THREE.MathUtils.clamp(cameraProgress, 0, 1)
      const discoveryProgress = THREE.MathUtils.smoothstep(scrollProgress, 0.86, 0.96)
      const approachProgress = THREE.MathUtils.smoothstep(scrollProgress, 0.94, 1)
      const surfaceZone = THREE.MathUtils.smoothstep(depthProgress, 0.0, 0.14)
      const engineeringZone = THREE.MathUtils.smoothstep(depthProgress, 0.10, 0.42)
      const deepZone = THREE.MathUtils.smoothstep(depthProgress, 0.38, 1.0)

      blendedSurface.copy(surfaceColor).lerp(engineeringColor, engineeringZone * 0.42)
      blendedDeep.copy(deepColor).lerp(engineeringColor, 0.18).lerp(fogSeabed, deepZone * 0.24)
      fogColor.copy(fogSurface).lerp(fogEngineering, engineeringZone * 0.72).lerp(fogDeep, deepZone * 0.8).lerp(fogSeabed, deepZone * 0.34)

      oceanUniforms.uShallowColor.value.copy(blendedSurface)
      oceanUniforms.uDeepColor.value.copy(blendedDeep)
      sunColor.copy(sunBaseColor).lerp(sunEngineeringColor, engineeringZone * 0.52).lerp(sunDeepColor, deepZone * 0.38)
      oceanUniforms.uSunColor.value.copy(sunColor)

      oceanUniforms.uOpacity.value = 0.92 - surfaceZone * 0.13 + deepZone * 0.03
      sunSprite.material.opacity = Math.max(0, 0.82 - depthProgress * 0.62)

      nearParticleColor.copy(nearParticleSurface).lerp(nearParticleEngineering, engineeringZone * 0.85).lerp(nearParticleDeep, deepZone * 0.92)
      farParticleColor.copy(farParticleSurface).lerp(farParticleEngineering, engineeringZone * 0.65).lerp(farParticleDeep, deepZone * 0.9)
      nearField.material.color.copy(nearParticleColor)
      farField.material.color.copy(farParticleColor)
      nearField.material.opacity = nearFieldBaseOpacity * (0.18 + engineeringZone * 0.42 + deepZone * 0.18)
      farField.material.opacity = farFieldBaseOpacity * (0.12 + deepZone * 0.42)
      bubbles.material.opacity = bubbleBaseOpacity * (0.2 + engineeringZone * 0.35 + deepZone * 0.55)
      largerBubbles.material.opacity = largerBubbleBaseOpacity * (0.16 + deepZone * 0.38)
      seabedDust.material.opacity = seabedDustBaseOpacity * deepZone * (0.45 + approachProgress * 0.55)
      nearField.material.size = 0.26 + engineeringZone * 0.06 - deepZone * 0.04
      farField.material.size = 0.55 + deepZone * 0.12

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

      updateCamera(camera, cameraPath, scrollProgress, lookAhead, cameraLookTarget)

      fog.color.copy(fogColor)
      backgroundColor.copy(blendedDeep).lerp(fogColor, 0.12)
      fog.density = 0.012 + engineeringZone * 0.028 + deepZone * 0.06
      hemi.color.copy(hemiSurfaceColor).lerp(hemiEngineeringColor, engineeringZone * 0.6).lerp(sunDeepColor, deepZone * 0.72)
      hemi.intensity = 1.05 - engineeringZone * 0.22 - deepZone * 0.58
      key.color.copy(keySurfaceColor).lerp(keyEngineeringColor, engineeringZone * 0.65).lerp(sunDeepColor, deepZone * 0.5)
      key.intensity = 1.3 - engineeringZone * 0.34 - deepZone * 0.72
      accentLight.color.copy(accentBaseColor).lerp(accentDeepColor, deepZone * 0.4)
      accentLight.intensity = 0.18 + deepZone * 0.7
      machineAtmosphere.intensity = deepZone * (0.08 + approachProgress * 0.22)
      shaftFade.v = 0.14 + engineeringZone * 0.25 + deepZone * 0.42
      debrisFade.v = deepZone * 0.85

      machineUniforms.uReveal.value = discoveryProgress * (0.62 + approachProgress * 0.38)
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      cancelAnimationFrame(animationFrame)
      originalTexture.dispose()
      xrayTexture.dispose()
      machine.geometry.dispose()
      machine.material.dispose()
      leaderGeometry.dispose()
      leaderMaterial.dispose()
      ;[nearField, farField, bubbles, largerBubbles, seabedDust].forEach((field) => {
        disposeParticleField(field)
      })
      shaftGroup.children.forEach((child) => {
        const shaftMesh = child as THREE.Mesh
        shaftMesh.geometry.dispose()
        disposeMaterial(shaftMesh.material)
      })
      shaftTex.dispose()
      seabed.geometry.dispose()
      seabed.material.dispose()
      rockGeometry.dispose()
      rockMaterial.dispose()
      rocks.dispose()
      renderer.dispose()
      scene.clear()
    }
  }, [onHotspotChange])

  return <canvas id="world-canvas" ref={canvasRef} />
}
