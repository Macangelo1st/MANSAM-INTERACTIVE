import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MachineSection } from './MachineSection'
import { Scene } from './Scene'

gsap.registerPlugin(ScrollTrigger)

export function MansamPrototype() {
  const [progress, setProgress] = useState(0)
  const [playVisible, setPlayVisible] = useState(false)
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [machineVisible, setMachineVisible] = useState(false)
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
          const depth = Math.round(value * 380)
          if (depthValueRef.current) depthValueRef.current.textContent = String(depth).padStart(3, '0')
          if (depthDotRef.current) depthDotRef.current.style.top = `${value * 100}%`
        },
      })

      ScrollTrigger.create({
        trigger: '#scrollTrack',
        start: 'top top',
        end: '18% top',
        scrub: true,
        onUpdate: (self) => {
          const el = document.getElementById('scrollHint')
          if (el) el.style.opacity = String(1 - self.progress)
        },
      })

      ScrollTrigger.create({
        trigger: '#scrollTrack',
        start: '6% top',
        end: '26% top',
        scrub: true,
        onUpdate: (self) => {
          const el = document.getElementById('arrival')
          if (el) {
            el.style.opacity = String(1 - self.progress)
            el.style.transform = `translateY(${-self.progress * 60}px)`
          }
        },
      })

      ScrollTrigger.create({
        trigger: '#scrollTrack',
        start: '24% top',
        end: '34% top',
        scrub: true,
        onUpdate: (self) => {
          const v = self.progress < 0.5 ? self.progress * 2 : (1 - self.progress) * 2
          const el = document.getElementById('descent-frag')
          if (el) el.style.opacity = String(Math.max(0, v) * 0.7)
        },
      })

      ;['#station-hud-left', '#station-hud-right', '#station-credo'].forEach((sel) => {
        ScrollTrigger.create({
          trigger: '#scrollTrack',
          start: '62% top',
          end: '78% top',
          scrub: true,
          onUpdate: (self) => {
            const el = document.querySelector(sel)
            if (el instanceof HTMLElement) el.style.opacity = String(self.progress)
          },
        })
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

    dots.forEach((el) => {
      el.addEventListener('mouseenter', handleEnter)
      el.addEventListener('mouseleave', handleLeave)
      el.addEventListener('mousemove', (event: MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
        gsap.to(event.currentTarget, {
          x: (event.clientX - (rect.left + rect.width / 2)) * 0.2,
          y: (event.clientY - (rect.top + rect.height / 2)) * 0.3,
          duration: 0.4,
          ease: 'power3.out',
        })
      })
    })

    return () => {
      dots.forEach((el) => {
        el.removeEventListener('mouseenter', handleEnter)
        el.removeEventListener('mouseleave', handleLeave)
      })
    }
  }, [])

  useEffect(() => {
    setMachineVisible(progress > 0.78)
  }, [progress])

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
          <Scene progress={progress} onPlayVisibilityChange={setPlayVisible} />

          <div className="beat interactive" id="arrival">
            <div className="eyebrow">Specialist Subsea &amp; Offshore Engineering</div>
            <h1>Engineering <b>Excellence</b><br />Beneath the Surface.</h1>
            <p>Delivering precision‑engineered offshore and subsea solutions for the world's most demanding marine infrastructure.</p>
            <div className="ctas">
              <a href="#" className="primary" data-magnet>Explore Our Engineering <span className="arrow" /></a>
              <a href="#" data-magnet>Watch Our Story <span className="arrow" /></a>
            </div>
          </div>

          <div className="beat" id="descent-frag">descending toward the work —</div>

          <div className="beat" id="station-hud-left">
            <div className="eyebrow">Engineering In Motion</div>
            <h2>Proprietary equipment. In‑house expertise. Every metre engineered with intent.</h2>
          </div>

          <div className="beat" id="station-hud-right">
            <div className="stat-line"><span className="n">250+</span><span className="l">Proprietary Engineering Assets</span></div>
            <div className="stat-line"><span className="n">50+</span><span className="l">Permanent Specialists</span></div>
            <div className="stat-line"><span className="n">2011</span><span className="l">Established</span></div>
            <div className="stat-line"><span className="n" style={{ fontSize: '1rem' }}>ISO 9001·14001·45001</span><span className="l">Certified</span></div>
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
          <MachineSection visible={machineVisible} />
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
