import { EngineeringPanel } from './EngineeringPanel'
import type { HotspotDefinition } from './hotspot-config'

type MachineSectionProps = {
  hotspot: HotspotDefinition | null
}

export function MachineSection({ hotspot }: MachineSectionProps) {
  return <EngineeringPanel hotspot={hotspot} />
}
