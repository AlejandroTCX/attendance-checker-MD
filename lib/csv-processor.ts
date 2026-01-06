import type { AttendanceRecord, Employee, ProcessedRecord, EmployeeStats } from "./types"

export function parseCSV(csvContent: string): AttendanceRecord[] {
  const lines = csvContent.trim().split(/\r?\n/)
  const records: AttendanceRecord[] = []

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(",") // ✅ coma
    if (parts.length >= 3) {
      records.push({
        device_ip: parts[0].trim(),
        pin: parts[1].trim(),       // aquí da igual que el header sea PIN
        timestamp: parts[2].trim(),
      })
    }
  }

  return records
}


export function parseEmployeeCSV(csvContent: string): Employee[] {
  const lines = csvContent.trim().split("\n")
  const employees: Employee[] = []

  // Skip header if exists
  const startIndex = lines[0].includes("pin") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(",")
    if (parts.length >= 2) {
      employees.push({
        pin: parts[0].trim(),
        nombre: parts[1].trim(),
      })
    }
  }

  return employees
}

export function processRecords(attendanceRecords: AttendanceRecord[], employees: Employee[]): ProcessedRecord[] {
  const employeeMap = new Map(employees.map((e) => [e.pin, e.nombre]))

  // Sort by timestamp
  const sortedRecords = [...attendanceRecords].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const processed: ProcessedRecord[] = []
  const lastActionByPin = new Map<string, "entrada" | "salida">()

  sortedRecords.forEach((record, index) => {
    const lastAction = lastActionByPin.get(record.pin) || "salida"
    const currentType: "entrada" | "salida" = lastAction === "salida" ? "entrada" : "salida"

    processed.push({
      id: `${record.pin}-${index}`,
      pin: record.pin,
      nombre: employeeMap.get(record.pin) || `Desconocido (${record.pin})`,
      timestamp: new Date(record.timestamp),
      type: currentType,
      device_ip: record.device_ip,
    })

    lastActionByPin.set(record.pin, currentType)
  })

  return processed
}

export function calculateStats(records: ProcessedRecord[]): EmployeeStats[] {
  const statsMap = new Map<string, EmployeeStats>()

  records.forEach((record) => {
    if (!statsMap.has(record.pin)) {
      statsMap.set(record.pin, {
        pin: record.pin,
        nombre: record.nombre,
        totalEntradas: 0,
        totalSalidas: 0,
        horasTrabajadas: 0,
      })
    }

    const stats = statsMap.get(record.pin)!

    if (record.type === "entrada") {
      stats.totalEntradas++
      stats.ultimaEntrada = record.timestamp
    } else {
      stats.totalSalidas++
      stats.ultimaSalida = record.timestamp

      // Calculate hours worked if we have both entrada and salida
      if (stats.ultimaEntrada) {
        const hours = (record.timestamp.getTime() - stats.ultimaEntrada.getTime()) / (1000 * 60 * 60)
        stats.horasTrabajadas += hours
      }
    }
  })

  return Array.from(statsMap.values())
}
