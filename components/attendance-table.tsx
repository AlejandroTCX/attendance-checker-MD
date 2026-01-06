"use client";

import { useMemo, useState } from "react";
import type { ProcessedRecord } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceTableProps {
  records: ProcessedRecord[];
}

type SortField = "timestamp" | "PIN" | "type";
type SortDirection = "asc" | "desc";

export function AttendanceTable({ records }: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedRecords = useMemo(() => {
    const filtered = records.filter(
      (record) =>
        record.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.pin.includes(searchTerm)
    );

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === "timestamp") {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortField === "NAME") {
        comparison = a.nombre.localeCompare(b.nombre);
      } else if (sortField === "type") {
        comparison = a.type.localeCompare(b.type);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [records, searchTerm, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Registros de Asistencia</CardTitle>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("NAME")}
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                  >
                    Empleado
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("type")}
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                  >
                    Tipo
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort("timestamp")}
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                  >
                    Fecha y Hora
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Dispositivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.nombre}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.pin}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.type === "entrada" ? "default" : "secondary"
                        }
                        className={
                          record.type === "entrada"
                            ? "bg-accent text-accent-foreground"
                            : ""
                        }
                      >
                        {record.type === "entrada" ? "↓ Entrada" : "↑ Salida"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(record.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {record.device_ip}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
