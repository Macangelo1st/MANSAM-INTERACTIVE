import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

type MachineImageProps = {
  originalImage: string
  xrayImage: string
  isActive: boolean
}

export function MachineImage({ originalImage, xrayImage, isActive }: MachineImageProps) {
  const xrayRef = useRef<HTMLDivElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!xrayRef.current || !glowRef.current) return

    const timeline = gsap.timeline({ defaults: { duration: 0.45, ease: 'power2.out' } })
    timeline.to(xrayRef.current, { opacity: isActive ? 1 : 0 }, 0)
    timeline.to(glowRef.current, { opacity: isActive ? 0.8 : 0, filter: isActive ? 'brightness(1.25) saturate(1.2)' : 'brightness(1) saturate(1)' }, 0)

    return () => timeline.kill()
  }, [isActive])

  return (
    <div className="machine-image-shell">
      <div className="machine-image-frame">
        <img className="machine-image-base" src={originalImage} alt="MANSAM subsea machine" />
        <div ref={glowRef} className="machine-engineering-glow" />
        <div ref={xrayRef} className="machine-image-overlay">
          <img className="machine-image-xray" src={xrayImage} alt="Engineering x-ray inspection overlay" />
        </div>
      </div>
    </div>
  )
}
