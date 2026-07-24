import type { HotspotDefinition } from './hotspot-config'

type CalloutProps = {
  hotspot: HotspotDefinition | null
}

export function Callout({ hotspot }: CalloutProps) {
  if (!hotspot) return null

  return (
    <svg className="callout-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={`M ${hotspot.callout.startX} ${hotspot.callout.startY} L ${hotspot.callout.endX} ${hotspot.callout.endY}`} />
      <circle cx={hotspot.callout.endX} cy={hotspot.callout.endY} r="1.2" />
    </svg>
  )
}
