export interface AttendanceRecord {
  device_ip: string
  pin: string
  timestamp: string
}

export interface Employee {
  pin: string
  nombre: string
}

export interface ProcessedRecord {
  id: string
  pin: string
  nombre: string
  timestamp: Date
  type: "entrada" | "salida"
  device_ip: string
}

export interface EmployeeStats {
  pin: string
  nombre: string
  totalEntradas: number
  totalSalidas: number
  horasTrabajadas: number
  ultimaEntrada?: Date
  ultimaSalida?: Date
}
