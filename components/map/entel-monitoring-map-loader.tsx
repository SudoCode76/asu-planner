"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

const EntelMonitoringMap = dynamic(
  () => import("@/components/map/entel-monitoring-map").then((mod) => mod.EntelMonitoringMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[760px] w-full rounded-lg" />,
  }
)

export function EntelMonitoringMapLoader() {
  return <EntelMonitoringMap />
}
