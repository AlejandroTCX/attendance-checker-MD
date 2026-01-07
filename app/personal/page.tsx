"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Pencil,
  RefreshCw,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import RunnerLoader from "@/components/ui/runnerLoader";
import LogoLoader from "@/components/ui/logoLoader";

type Empleado = {
  pin: number;
  nombre: string;
  puesto: string | null;
  departamento: string | null;
  razon_social: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  tolerancia_minutos: number | null;
  tiempo_comida_minutos: number | null;
  activo: boolean | null;
};

export default function EmpleadosPage() {
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando empleados");
      setEmpleados(json.workers || []);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return empleados;
    return empleados.filter((e) => {
      return (
        String(e.pin).includes(s) ||
        (e.nombre || "").toLowerCase().includes(s) ||
        (e.departamento || "").toLowerCase().includes(s) ||
        (e.puesto || "").toLowerCase().includes(s)
      );
    });
  }, [empleados, q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header mejorado */}
        <div className="mb-6 lg:mb-8">
          {/* Botón de regresar */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-red-600/50 hover:text-white transition-all mb-4 shadow-lg group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span>Regresar</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Empleados
                </h1>
                <p className="text-neutral-400 text-sm mt-1">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "empleado" : "empleados"} registrados
                </p>
              </div>
            </div>

            <button
              onClick={load}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:border-red-600/50 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Recargar</span>
            </button>
          </div>
        </div>

        {/* Barra de búsqueda mejorada */}
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-4 mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-black/80 rounded-xl px-4 py-3 border border-neutral-800">
              <Search className="text-neutral-400 flex-shrink-0" size={20} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Buscar por PIN, nombre, depto..."
                className="w-full bg-transparent text-white placeholder:text-neutral-500 focus:outline-none"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="text-neutral-400 hover:text-neutral-200 transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              onClick={load}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buscar
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Vista Desktop: Tabla */}
        <div className="hidden lg:block bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 overflow-hidden shadow-xl">
          <div className="grid grid-cols-9 px-6 py-4 bg-gradient-to-r from-neutral-900/80 to-neutral-800/80 text-sm font-semibold text-neutral-300 uppercase tracking-wider border-b border-neutral-800">
            <span>PIN</span>
            <span className="col-span-2">Nombre</span>
            <span>Depto</span>
            <span>Puesto</span>
            <span>Entrada</span>
            <span>Salida</span>
            <span>Activo</span>
            <span className="text-right">Acción</span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {isLoading && <LogoLoader label="Cargando empleados..." />}

            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-block p-4 bg-neutral-800 rounded-full mb-4">
                  <Users className="text-neutral-600" size={32} />
                </div>
                <p className="text-neutral-400">No se encontraron empleados</p>
              </div>
            )}

            {!isLoading &&
              filtered.map((e) => (
                <div
                  key={e.pin}
                  className="grid grid-cols-9 px-6 py-4 text-white text-sm border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-all"
                >
                  <span className="font-mono text-red-500 font-semibold">
                    {e.pin}
                  </span>
                  <span className="col-span-2 font-semibold text-white">
                    {e.nombre}
                  </span>
                  <span className="text-neutral-300">
                    {e.departamento ?? "—"}
                  </span>
                  <span className="text-neutral-400 text-xs">
                    {e.puesto ?? "—"}
                  </span>
                  <span className="font-mono text-neutral-300">
                    {(e.hora_entrada ?? "").slice(0, 5) || "—"}
                  </span>
                  <span className="font-mono text-neutral-300">
                    {(e.hora_salida ?? "").slice(0, 5) || "—"}
                  </span>
                  <span>
                    {e.activo ? (
                      <span className="inline-block px-2 py-1 rounded-full bg-white/10 border border-white/30 text-white text-xs font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-medium">
                        Inactivo
                      </span>
                    )}
                  </span>
                  <div className="text-right">
                    <Link
                      href={`/personal/${e.pin}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/80 border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Vista Móvil: Cards Compactos */}
        <div className="lg:hidden space-y-3">
          {isLoading && <LogoLoader label="Cargando empleados..." />}

          {!isLoading && filtered.length === 0 && (
            <div className="p-12 text-center bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50">
              <div className="inline-block p-4 bg-neutral-800 rounded-full mb-4">
                <Users className="text-neutral-600" size={32} />
              </div>
              <p className="text-neutral-400">No se encontraron empleados</p>
            </div>
          )}

          {!isLoading &&
            filtered.map((e) => (
              <div
                key={e.pin}
                className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-4 shadow-lg hover:shadow-xl hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-red-500 font-bold text-base">
                      #{e.pin}
                    </span>
                    {e.activo ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/30 text-white text-xs font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-medium">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-white font-bold text-base mb-1">
                  {e.nombre}
                </h3>

                <div className="flex items-center gap-3 text-xs text-neutral-400 mb-3">
                  {e.puesto && <span className="truncate">{e.puesto}</span>}
                  {e.departamento && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="truncate">{e.departamento}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-500">Horario:</span>
                    <span className="font-mono text-neutral-300">
                      {(e.hora_entrada ?? "").slice(0, 5) || "—"}
                    </span>
                    <span className="text-neutral-600">→</span>
                    <span className="font-mono text-neutral-300">
                      {(e.hora_salida ?? "").slice(0, 5) || "—"}
                    </span>
                  </div>

                  <Link
                    href={`/personal/${e.pin}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-md"
                  >
                    <Pencil size={12} />
                    Editar
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
