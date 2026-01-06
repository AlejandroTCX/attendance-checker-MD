"use client"

import { useMemo } from "react"
import type { ProcessedRecord } from "@/lib/types"
import { StatsCard } from "./stats-card"
import { Users, Clock, LogIn, LogOut, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculateStats } from "@/lib/csv-processor"

interface StatsDashboardProps {
  records: ProcessedRecord[]
}

export function StatsDashboard({ records }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const employeeStats = calculateStats(records)
    const totalEmployees = new Set(records.map((r) => r.pin)).size
    const totalEntradas = records.filter((r) => r.type === "entrada").length
    const totalSalidas = records.filter((r) => r.type === "salida").length
    const avgHours = employeeStats.reduce((sum, e) => sum + e.horasTrabajadas, 0) / (employeeStats.length || 1)

    return {
      employeeStats: employeeStats.sort((a, b) => b.horasTrabajadas - a.horasTrabajadas),
      totalEmployees,
      totalEntradas,
      totalSalidas,
      avgHours: avgHours.toFixed(1),
    }
  }, [records])

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Empleados" value={stats.totalEmployees} icon={Users} description="Empleados activos" />
        <StatsCard title="Total Entradas" value={stats.totalEntradas} icon={LogIn} description="Registros de entrada" />
        <StatsCard title="Total Salidas" value={stats.totalSalidas} icon={LogOut} description="Registros de salida" />
        <StatsCard
          title="Promedio Horas"
          value={`${stats.avgHours}h`}
          icon={Clock}
          description="Horas trabajadas promedio"
        />
      </div>

      {/* Top Employees by Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Empleados por Horas Trabajadas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-right">Horas Trabajadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.employeeStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.employeeStats.slice(0, 10).map((employee) => (
                    <TableRow key={employee.pin}>
                      <TableCell className="font-medium">{employee.nombre}</TableCell>
                      <TableCell className="font-mono text-sm">{employee.pin}</TableCell>
                      <TableCell className="text-right">{employee.totalEntradas}</TableCell>
                      <TableCell className="text-right">{employee.totalSalidas}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatHours(employee.horasTrabajadas)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
