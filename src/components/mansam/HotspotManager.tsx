import { useEffect, useState } from 'react'
import { gsap } from 'gsap'
import type { HotspotDefinition } from './hotspot-config'

type HotspotManagerProps = {
  hotspots: HotspotDefinition[]
  activeHotspotId: string | null
  onSelect: (hotspot: HotspotDefinition | null) => void
}

export function HotspotManager({ hotspots, activeHotspotId, onSelect }: HotspotManagerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    const active = hotspots.find((hotspot) => hotspot.id === hoveredId) ?? null
    onSelect(active)
  }, [hoveredId, hotspots, onSelect])

  return (
    <div className="hotspot-manager">
      {hotspots.map((hotspot) => {
        const isActive = activeHotspotId === hotspot.id
        return (
          <button
            key={hotspot.id}
            type="button"
            className={`hotspot ${isActive ? 'is-active' : ''}`}
            style={{
              left: `${hotspot.position.left}%`,
              top: `${hotspot.position.top}%`,
              width: `${hotspot.position.width}%`,
              height: `${hotspot.position.height}%`,
            }}
            aria-label={`Inspect ${hotspot.name}`}
            onMouseEnter={() => {
              setHoveredId(hotspot.id)
              gsap.to(`.hotspot[data-id="${hotspot.id}"]`, { scale: 1.02, duration: 0.35, ease: 'power2.out' })
            }}
            onMouseLeave={() => {
              setHoveredId(null)
              gsap.to(`.hotspot[data-id="${hotspot.id}"]`, { scale: 1, duration: 0.35, ease: 'power2.out' })
            }}
            data-id={hotspot.id}
          />
        )
      })}
    </div>
  )
}
