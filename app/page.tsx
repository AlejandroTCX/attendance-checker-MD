"use client";

import { useEffect, useState } from "react";
import { AttendanceTable } from "@/components/attendance-table";
import { StatsDashboard } from "@/components/stats-dashboard";
import {
  parseCSV,
  parseEmployeeCSV,
  processRecords,
} from "@/lib/csv-processor";
import type { AttendanceRecord, Employee, ProcessedRecord } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, BarChart3, TableIcon } from "lucide-react";

export default function Home() {
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStaticCSVs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const attRes = await fetch("/data/attendance_log_simple.csv", {
          cache: "no-store",
        });
        if (!attRes.ok)
          throw new Error("No pude cargar attendance_log_simple.csv");
        const attText = await attRes.text();

        const empRes = await fetch("/data/Check%20personal%20MD.csv", {
          cache: "no-store",
        });
        if (!empRes.ok) throw new Error("No pude cargar Check personal MD.csv");
        const empText = await empRes.text();

        // DEBUG rápido (para ver si realmente están leyendo contenido)
        console.log("attendance bytes:", attText.length);
        console.log("employees bytes:", empText.length);
        console.log("attendance head:", attText.split("\n").slice(0, 3));
        console.log("employees head:", empText.split("\n").slice(0, 3));

        const att = parseCSV(attText);
        const emp = parseEmployeeCSV(empText);

        console.log("attendance parsed:", att.length);
        console.log("employees parsed:", emp.length);

        setAttendanceRecords(att);
        setEmployees(emp);

        const processed = processRecords(att, emp);
        console.log("processed:", processed.length);
        setProcessedRecords(processed);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando/procesando CSVs");
      } finally {
        setIsLoading(false);
      }
    };

    loadStaticCSVs();
  }, []);

  const hasData = processedRecords.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Sistema de Control de Asistencia
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestión de entradas y salidas de personal
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="text-center text-muted-foreground py-12">
            Cargando CSVs…
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 border rounded-lg">
            <p className="font-medium">Error:</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && !hasData && (
          <div className="max-w-3xl mx-auto p-4 border rounded-lg">
            <p className="font-medium">
              CSVs cargados, pero no hay registros procesados.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Revisa en consola cuántos registros parseó cada archivo
              (attendance/employees) y si los PIN coinciden.
            </p>
          </div>
        )}

        {!isLoading && !error && hasData && (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="records" className="gap-2">
                <TableIcon className="h-4 w-4" />
                Registros
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <StatsDashboard records={processedRecords} />
            </TabsContent>

            <TabsContent value="records">
              <AttendanceTable records={processedRecords} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
