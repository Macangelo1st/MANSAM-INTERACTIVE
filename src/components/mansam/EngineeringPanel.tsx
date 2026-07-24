import type { HotspotDefinition } from './hotspot-config'

type EngineeringPanelProps = {
  hotspot: HotspotDefinition | null
}

export function EngineeringPanel({ hotspot }: EngineeringPanelProps) {
  if (!hotspot) return null

  return (
    <div className="engineering-panel">
      <div className="engineering-panel__label">Engineering inspection</div>
      <h3>{hotspot.name}</h3>
      <div className="engineering-panel__meta">
        <span>Purpose</span>
        <strong>{hotspot.purpose}</strong>
      </div>
      <p>{hotspot.technicalDescription}</p>
      <ul>
        {hotspot.keySpecifications.map((spec) => (
          <li key={spec}>{spec}</li>
        ))}
      </ul>
    </div>
  )
}
