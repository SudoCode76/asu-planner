import { Badge } from "@/components/ui/badge"
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/fibermap/constants"
import type { LinkStatus } from "@/lib/fibermap/calculations"

export function StatusBadge({ status }: { status: LinkStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
