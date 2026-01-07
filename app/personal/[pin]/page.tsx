"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User, RefreshCw } from "lucide-react";
import RunnerLoader from "@/components/ui/runnerLoader";
import LogoLoader from "@/components/ui/logoLoader";

type Empleado = {
  pin: number;
  nombre: string;
  puesto: string | null;
  departamento: string | null;
  razon_social: string | null;
  hora_entrada: string | null; // "09:00:00" o "09:00"
  hora_salida: string | null;
  tolerancia_minutos: number | null;
  tiempo_comida_minutos: number | null;
  activo: boolean | null;
};

function hhmm(t: string | null | undefined) {
  if (!t) return "";
  return t.slice(0, 5);
}

export default function PersonalEditPage() {
  const params = useParams<{ pin: string }>();
  const router = useRouter();
  const pin = useMemo(() => Number(params.pin), [params.pin]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Empleado | null>(null);
  const [form, setForm] = useState<Empleado | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workers/${pin}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando empleado");
      setOriginal(json.empleado);
      setForm(json.empleado);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(pin)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const hasChanges = useMemo(() => {
    if (!original || !form) return false;
    return JSON.stringify(original) !== JSON.stringify(form);
  }, [original, form]);

  const save = async () => {
    if (!form) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        nombre: form.nombre,
        puesto: form.puesto,
        departamento: form.departamento,
        razon_social: form.razon_social,
        hora_entrada: form.hora_entrada ? hhmm(form.hora_entrada) : null,
        hora_salida: form.hora_salida ? hhmm(form.hora_salida) : null,
        tolerancia_minutos: form.tolerancia_minutos ?? 0,
        tiempo_comida_minutos: form.tiempo_comida_minutos ?? 0,
        activo: !!form.activo,
      };

      const res = await fetch(`/api/workers/${pin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando");

      setOriginal(json.empleado);
      setForm(json.empleado);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LogoLoader label="Cargando empleado..." />;

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
        <button
          onClick={() => router.push("/personal")}
          className="text-slate-200 underline"
        >
          Volver
        </button>
        <p className="mt-4 text-red-400">{error || "Empleado no encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/personal")}
            className="inline-flex items-center gap-2 text-slate-200 hover:text-white"
          >
            <ArrowLeft size={18} /> Volver
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw size={16} /> Recargar
            </button>

            <button
              onClick={save}
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSaving
                ? "Guardando..."
                : hasChanges
                ? "Guardar cambios"
                : "Sin cambios"}
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
            <User className="text-slate-300" /> Editar empleado (PIN {form.pin})
          </h1>
          <p className="text-slate-400 mb-6">
            Edita la información del empleado. (Se guarda en Supabase)
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-700 bg-red-900/20 text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre">
              <input
                value={form.nombre || ""}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Puesto">
              <input
                value={form.puesto || ""}
                onChange={(e) => setForm({ ...form, puesto: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Departamento">
              <input
                value={form.departamento || ""}
                onChange={(e) =>
                  setForm({ ...form, departamento: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Razón social">
              <input
                value={form.razon_social || ""}
                onChange={(e) =>
                  setForm({ ...form, razon_social: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Hora entrada (HH:MM)">
              <input
                value={hhmm(form.hora_entrada)}
                onChange={(e) =>
                  setForm({ ...form, hora_entrada: e.target.value })
                }
                placeholder="09:00"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Hora salida (HH:MM)">
              <input
                value={hhmm(form.hora_salida)}
                onChange={(e) =>
                  setForm({ ...form, hora_salida: e.target.value })
                }
                placeholder="18:00"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Tolerancia (min)">
              <input
                type="number"
                value={form.tolerancia_minutos ?? 0}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tolerancia_minutos: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <Field label="Tiempo comida (min)">
              <input
                type="number"
                value={form.tiempo_comida_minutos ?? 0}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tiempo_comida_minutos: Number(e.target.value),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </Field>

            <div className="md:col-span-2">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Activo
              </label>
              <button
                onClick={() => setForm({ ...form, activo: !form.activo })}
                className={`px-4 py-2 rounded-lg border transition ${
                  form.activo
                    ? "bg-emerald-700/20 border-emerald-700 text-emerald-200"
                    : "bg-red-900/20 border-red-700 text-red-200"
                }`}
              >
                {form.activo ? "Sí, activo" : "No, inactivo"}
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Tip: si quieres validar formato de hora, dime y lo dejamos con
            máscara y validación (HH:MM) para evitar errores.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-slate-300 text-sm font-medium mb-2 block">
        {label}
      </label>
      {children}
    </div>
  );
}
