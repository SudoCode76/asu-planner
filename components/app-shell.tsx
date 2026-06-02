import Link from "next/link"
import {
  BarChart3Icon,
  LogOutIcon,
  MapIcon,
  MonitorDotIcon,
  PlusIcon,
  Rows3Icon,
} from "lucide-react"

import { logout } from "@/app/actions/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { User } from "@supabase/supabase-js"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3Icon },
  { href: "/links/new", label: "Nuevo enlace", icon: PlusIcon },
  { href: "/monitoring", label: "Monitoreo Entel", icon: MonitorDotIcon },
  { href: "/links", label: "Historial", icon: Rows3Icon },
]

export function AppShell({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-background/95 shadow-sm lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
            <MapIcon />
          </div>
          <div>
            <p className="font-semibold">FiberMap ASU</p>
            <p className="text-xs text-muted-foreground">Presupuesto optico ASU</p>
          </div>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild className="justify-start rounded-lg">
              <Link href={item.href}>
                <item.icon data-icon="inline-start" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t p-4">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Tema</p>
                <p className="text-xs text-muted-foreground">Claro, oscuro o sistema</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
          <div className="min-w-0 rounded-lg border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Badge variant="secondary">Sesion</Badge>
              <span className="text-xs text-muted-foreground">Activa</span>
            </div>
            <p className="truncate text-sm font-medium">{user.email}</p>
          </div>
          <form action={logout}>
            <Button variant="outline" className="w-full justify-start">
              <LogOutIcon data-icon="inline-start" />
              Cerrar sesion
            </Button>
          </form>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 shadow-sm lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <MapIcon />
          FiberMap ASU
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/links/new">
              <PlusIcon data-icon="inline-start" />
              Nuevo
            </Link>
          </Button>
        </div>
      </header>
      <main className="lg:pl-64">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
