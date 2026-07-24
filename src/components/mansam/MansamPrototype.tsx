import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MachineSection } from './MachineSection'
import { Scene } from './Scene'
import type { HotspotDefinition } from './hotspot-config'

gsap.registerPlugin(ScrollTrigger)

export function MansamPrototype() {
  const [progress, setProgress] = useState(0)
  const [playVisible, setPlayVisible] = useState(false)
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [activeHotspot, setActiveHotspot] = useState<HotspotDefinition | null>(null)
  const playRef = useRef<HTMLButtonElement | null>(null)
  const videoRef = useRef<HTMLDivElement | null>(null)
  const depthDotRef = useRef<HTMLDivElement | null>(null)
  const depthValueRef = useRef<HTMLDivElement | null>(null)
  const cursorDotRef = useRef<HTMLDivElement | null>(null)
  const cursorRingRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const dot = cursorDotRef.current
    const ring = cursorRingRef.current
    const handleMouseMove = (event: MouseEvent) => {
      if (!dot || !ring) return
      dot.style.left = `${event.clientX}px`
      dot.style.top = `${event.clientY}px`
    }
    window.addEventListener('mousemove', handleMouseMove)
    const tick = () => {
      if (!dot || !ring) return
      const currentX = parseFloat(ring.style.left || '0') || window.innerWidth / 2
      const currentY = parseFloat(ring.style.top || '0') || window.innerHeight / 2
      ring.style.left = `${currentX + (dot.style.left ? parseFloat(dot.style.left) - currentX : 0) * 0.15}px`
      ring.style.top = `${currentY + (dot.style.top ? parseFloat(dot.style.top) - currentY : 0) * 0.15}px`
    }
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      gsap.ticker.remove(tick)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('#arrival', { opacity: 1 })
      gsap.set('#scrollHint', { opacity: 1 })

      ScrollTrigger.create({
        trigger: '#scrollTrack',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        onUpdate: (self) => {
          const value = self.progress
          setProgress(value)
          const depth = Math.round(value * 560)
          if (depthValueRef.current) depthValueRef.current.textContent = String(depth).padStart(3, '0')
          if (depthDotRef.current) depthDotRef.current.style.top = `${value * 100}%`

          const fadeWindow = (start: number, end: number, fadeOutStart: number, fadeOutEnd: number) => {
            const fadeIn = gsap.utils.clamp(0, 1, (value - start) / (end - start))
            const fadeOut = 1 - gsap.utils.clamp(0, 1, (value - fadeOutStart) / (fadeOutEnd - fadeOutStart))
            return fadeIn * fadeOut
          }
          const setBeat = (selector: string, opacity: number, y = 0) => {
            const element = document.querySelector(selector)
            if (element instanceof HTMLElement) {
              element.style.opacity = String(opacity)
              element.style.transform = `translateY(${y}px)`
            }
          }

          setBeat('#scrollHint', 1 - gsap.utils.clamp(0, 1, value / 0.12))
          const hero = fadeWindow(0, 0.02, 0.10, 0.16)
          setBeat('#arrival', hero, -gsap.utils.interpolate(0, 42, 1 - hero))
          setBeat('#descent-frag', fadeWindow(0.14, 0.18, 0.24, 0.29) * 0.7)

          const video = fadeWindow(0.31, 0.35, 0.49, 0.55)
          setBeat('#station-hud-left', video)
          setBeat('#station-hud-right', video)
          setBeat('#station-credo', video)
          setPlayVisible(video > 0.35)
        },
      })
    })

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const ring = cursorRingRef.current
    const dots = document.querySelectorAll('[data-magnet]')
    const handleEnter = () => ring?.classList.add('grow')
    const handleLeave = () => {
      ring?.classList.remove('grow')
      gsap.to('[data-magnet]', { x: 0, y: 0, duration: 0.4, ease: 'power3.out' })
    }
    const handleMove = (event: Event) => {
      const mouseEvent = event as MouseEvent
      const target = mouseEvent.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      gsap.to(target, {
        x: (mouseEvent.clientX - (rect.left + rect.width / 2)) * 0.2,
        y: (mouseEvent.clientY - (rect.top + rect.height / 2)) * 0.3,
        duration: 0.4,
        ease: 'power3.out',
      })
    }

    dots.forEach((el) => {
      el.addEventListener('mouseenter', handleEnter)
      el.addEventListener('mouseleave', handleLeave)
      el.addEventListener('mousemove', handleMove)
    })

    return () => {
      dots.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter)
        el.removeEventListener('mouseleave', handleLeave)
        el.removeEventListener('mousemove', handleMove)
      })
    }
  }, [])

  useEffect(() => {
    if (!playRef.current) return
    playRef.current.style.opacity = playVisible ? '1' : '0'
    playRef.current.style.pointerEvents = playVisible ? 'auto' : 'none'
  }, [playVisible])

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.style.opacity = isVideoOpen ? '1' : '0'
    videoRef.current.style.pointerEvents = isVideoOpen ? 'auto' : 'none'
  }, [isVideoOpen])

  const videoSrc = useMemo(() => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', [])

  return (
    <div>
      <div className="cursor-dot" ref={cursorDotRef} />
      <div className="cursor-ring" ref={cursorRingRef} />
      <div className="grain" />
      <div className="vignette" />

      <header>
        <div className="logo">MAN<span>SAM</span></div>
        <nav>
          <a href="#">Solutions</a>
          <a href="#">Projects</a>
          <a href="#">Equipment</a>
          <a href="#">Contact</a>
        </nav>
      </header>

      <div className="depth-hud">
        <div className="track"><div className="dot" ref={depthDotRef} id="depthDot" /></div>
        <div className="txt"><b id="depthVal" ref={depthValueRef}>000</b>&nbsp;M &middot; DESCENT</div>
      </div>

      <div className="scroll-track" id="scrollTrack">
        <div className="stage">
          <Scene progress={progress} onPlayVisibilityChange={setPlayVisible} onHotspotChange={setActiveHotspot} />

          <div className="beat interactive" id="arrival">
            <div className="eyebrow">Specialist Subsea &amp; Offshore Engineering</div>
            <h1>Engineering the Solutions<br /><b>Others Can&apos;t</b></h1>
            <p>MANSAM partners with leading EPC contractors to solve complex subsea engineering challenges through specialist services, proprietary equipment, and in-house engineering expertise.</p>
            <div className="ctas">
              <a href="#" className="primary" data-magnet>Talk to an Expert <span className="arrow" /></a>
              <a href="#" data-magnet>View Our Projects <span className="arrow" /></a>
            </div>
          </div>

          <div className="beat" id="descent-frag">descending toward the work —</div>

          <div className="beat" id="station-hud-left">
            <h2>Trusted by leading offshore contractors across Oil &amp; Gas, Offshore Wind and Marine Infrastructure.</h2>
          </div>

          <div className="beat" id="station-hud-right">
            <div className="stat-line"><span className="n">250+</span><span className="l">Proprietary Engineering Assets*</span></div>
            <div className="stat-line"><span className="n">50+</span><span className="l">Permanent Specialists*</span></div>
            <div className="stat-line"><span className="n stat-line__wide">Global Projects</span><span className="l">Across Multiple Continents</span></div>
            <div className="stat-line"><span className="n">2011</span><span className="l">Established</span></div>
            <div className="stat-line"><span className="n stat-line__wide">ISO 9001 • ISO 14001 • ISO 45001</span><span className="l">Certified</span></div>
          </div>

          <button
            ref={playRef}
            className="play-control interactive"
            id="playCtrl"
            data-magnet
            aria-label="Play project reel"
            onClick={() => setIsVideoOpen(true)}
          >
            <svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z" /></svg>
          </button>

          <div className="beat" id="station-credo">
            <p><b>MANSAM</b> partners with leading EPC contractors to solve complex subsea engineering challenges through specialist services, proprietary equipment, and in‑house engineering expertise.</p>
          </div>

          <div className="scroll-hint" id="scrollHint"><div className="stem"><i /></div>DIVE IN</div>
          <MachineSection hotspot={activeHotspot} />
        </div>
      </div>

      <div
        ref={videoRef}
        className="video-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsVideoOpen(false)
        }}
      >
        <video src={videoSrc} playsInline controls style={{ width: '100vw', height: '100vh', objectFit: 'cover', opacity: isVideoOpen ? 1 : 0 }} />
      </div>
    </div>
  )
}
