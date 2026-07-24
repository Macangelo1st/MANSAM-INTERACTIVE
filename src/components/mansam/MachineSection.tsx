import { useState } from 'react'
import { Callout } from './Callout'
import { EngineeringPanel } from './EngineeringPanel'
import { HotspotManager } from './HotspotManager'
import { HOTSPOT_CONFIG, MACHINE_ASSETS, type HotspotDefinition } from './hotspot-config'
import { MachineImage } from './MachineImage'

type MachineSectionProps = {
  visible: boolean
}

export function MachineSection({ visible }: MachineSectionProps) {
  const [activeHotspot, setActiveHotspot] = useState<HotspotDefinition | null>(null)

  return (
    <div className={`machine-section ${visible ? 'is-visible' : ''}`}>
      <div className="machine-shell">
        <MachineImage
          originalImage={MACHINE_ASSETS.originalImage}
          xrayImage={MACHINE_ASSETS.xrayImage}
          isActive={Boolean(activeHotspot)}
        />
        <HotspotManager
          hotspots={HOTSPOT_CONFIG}
          activeHotspotId={activeHotspot?.id ?? null}
          onSelect={setActiveHotspot}
        />
        <Callout hotspot={activeHotspot} />
        <EngineeringPanel hotspot={activeHotspot} />
      </div>
    </div>
  )
}
