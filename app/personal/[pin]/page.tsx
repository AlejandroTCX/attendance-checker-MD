'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
	ArrowLeft,
	Save,
	User,
	RefreshCw,
	Building2,
	Briefcase,
	Clock,
	AlertTriangle,
	CheckCircle2,
} from 'lucide-react';
import LogoLoader from '@/components/ui/logoLoader';

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
	if (!t) return '';
	return t.slice(0, 5);
}

function normalizeEmpleado(e: Empleado | null) {
	if (!e) return null;
	return {
		...e,
		nombre: e.nombre ?? '',
		puesto: e.puesto ?? '',
		departamento: e.departamento ?? '',
		razon_social: e.razon_social ?? '',
		hora_entrada: hhmm(e.hora_entrada) || '',
		hora_salida: hhmm(e.hora_salida) || '',
		tolerancia_minutos: e.tolerancia_minutos ?? 0,
		tiempo_comida_minutos: e.tiempo_comida_minutos ?? 0,
		activo: !!e.activo,
	};
}

function isValidHHMM(v: string) {
	if (!v) return true; // vacío permitido
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v.trim());
	return !!m;
}

function diffKeys(a: any, b: any) {
	const keys = Object.keys({ ...(a || {}), ...(b || {}) });
	return keys.filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]));
}

function Segmented({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string; tone?: 'danger' | 'success' }[];
}) {
	return (
		<div className='inline-flex rounded-xl bg-neutral-900/70 p-1 border border-neutral-800'>
			{options.map((opt) => {
				const active = value === opt.value;

				const activeTone =
					opt.tone === 'success'
						? 'bg-emerald-600 text-white shadow-emerald-600/25'
						: opt.tone === 'danger'
						? 'bg-red-600 text-white shadow-red-600/25'
						: 'bg-red-600 text-white shadow-red-600/25';

				return (
					<button
						key={opt.value}
						onClick={() => onChange(opt.value)}
						className={[
							'px-3 py-2 rounded-lg text-sm font-medium transition-all',
							'flex items-center justify-center gap-2 min-w-[110px]',
							active
								? `shadow-lg ${activeTone}`
								: 'text-neutral-300 hover:bg-neutral-800/70',
						].join(' ')}>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

function BadgePill({ children }: { children: React.ReactNode }) {
	return (
		<span className='inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300'>
			{children}
		</span>
	);
}

function Field({
	label,
	hint,
	icon,
	error,
	children,
}: {
	label: string;
	hint?: string;
	icon?: React.ReactNode;
	error?: string | null;
	children: React.ReactNode;
}) {
	return (
		<div className='space-y-2'>
			<div className='flex items-start justify-between gap-3'>
				<label className='text-sm font-medium text-neutral-300 flex items-center gap-2'>
					{icon}
					{label}
				</label>
				{hint ? <span className='text-xs text-neutral-500'>{hint}</span> : null}
			</div>

			{children}

			{error ? (
				<div className='text-xs text-red-300 flex items-center gap-2'>
					<AlertTriangle size={14} className='text-red-400' />
					{error}
				</div>
			) : null}
		</div>
	);
}

export default function PersonalEditPage() {
	const params = useParams<{ pin: string }>();
	const router = useRouter();
	const pin = useMemo(() => Number(params.pin), [params.pin]);

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [original, setOriginal] = useState<Empleado | null>(null);
	const [form, setForm] = useState<ReturnType<typeof normalizeEmpleado> | null>(
		null
	);

	const load = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/workers/${pin}`);
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Error cargando empleado');

			setOriginal(json.empleado);
			setForm(normalizeEmpleado(json.empleado));
		} catch (e: any) {
			setError(e?.message || 'Error');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!Number.isFinite(pin)) return;
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pin]);

	const normalizedOriginal = useMemo(
		() => normalizeEmpleado(original),
		[original]
	);

	const changedKeys = useMemo(() => {
		if (!normalizedOriginal || !form) return [];
		return diffKeys(normalizedOriginal, form);
	}, [normalizedOriginal, form]);

	const hasChanges = changedKeys.length > 0;

	const timeEntradaOk = useMemo(
		() => (form ? isValidHHMM(form.hora_entrada) : true),
		[form]
	);
	const timeSalidaOk = useMemo(
		() => (form ? isValidHHMM(form.hora_salida) : true),
		[form]
	);

	const canSave = hasChanges && !isSaving && timeEntradaOk && timeSalidaOk;

	const save = async () => {
		if (!form) return;

		setIsSaving(true);
		setError(null);

		try {
			const payload = {
				nombre: form.nombre,
				puesto: form.puesto || null,
				departamento: form.departamento || null,
				razon_social: form.razon_social || null,
				hora_entrada: form.hora_entrada ? hhmm(form.hora_entrada) : null,
				hora_salida: form.hora_salida ? hhmm(form.hora_salida) : null,
				tolerancia_minutos: Number(form.tolerancia_minutos ?? 0),
				tiempo_comida_minutos: Number(form.tiempo_comida_minutos ?? 0),
				activo: !!form.activo,
			};

			const res = await fetch(`/api/workers/${pin}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Error guardando');

			setOriginal(json.empleado);
			setForm(normalizeEmpleado(json.empleado));
		} catch (e: any) {
			setError(e?.message || 'Error');
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) return <LogoLoader label='Cargando empleado...' />;

	if (!form) {
		return (
			<div className='min-h-screen bg-black text-neutral-300 p-6'>
				<button
					onClick={() => router.push('/personal')}
					className='text-neutral-200 underline'>
					Volver
				</button>
				<p className='mt-4 text-red-400'>{error || 'Empleado no encontrado'}</p>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-black text-white'>
			{/* Header sticky */}
			<div className='sticky top-0 z-30 border-b border-neutral-800 bg-black/70 backdrop-blur'>
				<div className='max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3'>
					<button
						onClick={() => router.push('/personal')}
						className='inline-flex items-center gap-2 text-neutral-300 hover:text-white transition'>
						<ArrowLeft size={18} /> Volver
					</button>

					<div className='flex items-center gap-2'>
						{hasChanges ? (
							<BadgePill>• {changedKeys.length} cambio(s)</BadgePill>
						) : (
							<BadgePill>Sin cambios</BadgePill>
						)}

						<button
							onClick={load}
							className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 transition'>
							<RefreshCw size={16} /> Recargar
						</button>

						<button
							onClick={save}
							disabled={!canSave}
							className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white
                         hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition'>
							<Save size={18} />
							{isSaving ? 'Guardando...' : 'Guardar'}
						</button>
					</div>
				</div>
			</div>

			<div className='max-w-4xl mx-auto px-4 sm:px-6 py-6'>
				{/* Card principal */}
				<div className='bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'>
					<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6'>
						<div className='space-y-1'>
							<h1 className='text-xl sm:text-2xl font-bold flex items-center gap-2'>
								<User className='text-neutral-300' />
								Editar empleado
							</h1>
							<div className='flex flex-wrap items-center gap-2'>
								<BadgePill>PIN {pin}</BadgePill>
								<BadgePill>
									Estado:{' '}
									<span
										className={
											form.activo ? 'text-emerald-300' : 'text-red-300'
										}>
										{form.activo ? 'Activo' : 'Inactivo'}
									</span>
								</BadgePill>
							</div>
							<p className='text-neutral-400 text-sm'>
								Cambios se guardan en Supabase.
							</p>
						</div>

						{/* Toggle activo pro */}
						<div className='flex flex-col items-start sm:items-end gap-2'>
							<span className='text-xs text-neutral-500'>Estatus</span>
							<Segmented
								value={form.activo ? '1' : '0'}
								onChange={(v) => setForm({ ...form, activo: v === '1' })}
								options={[
									{ value: '1', label: 'Activo', tone: 'success' },
									{ value: '0', label: 'Inactivo', tone: 'danger' },
								]}
							/>
						</div>
					</div>

					{error ? (
						<div className='mb-5 p-3 rounded-xl border border-red-800 bg-red-900/20 text-red-100 flex items-start gap-2'>
							<AlertTriangle size={18} className='text-red-300 mt-0.5' />
							<div className='text-sm'>{error}</div>
						</div>
					) : null}

					{/* Sección: Datos */}
					<SectionTitle title='Datos generales' />

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<Field label='Nombre'>
							<input
								value={form.nombre}
								onChange={(e) => setForm({ ...form, nombre: e.target.value })}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field
							label='Puesto'
							icon={<Briefcase size={16} className='text-red-500' />}>
							<input
								value={form.puesto}
								onChange={(e) => setForm({ ...form, puesto: e.target.value })}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field
							label='Departamento'
							icon={<Building2 size={16} className='text-red-500' />}>
							<input
								value={form.departamento}
								onChange={(e) =>
									setForm({ ...form, departamento: e.target.value })
								}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field label='Razón social'>
							<input
								value={form.razon_social}
								onChange={(e) =>
									setForm({ ...form, razon_social: e.target.value })
								}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>
					</div>

					<div className='my-6 border-t border-neutral-800' />

					{/* Sección: Horarios */}
					<SectionTitle title='Horario' />

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<Field
							label='Hora entrada'
							hint='HH:MM'
							icon={<Clock size={16} className='text-red-500' />}
							error={
								!timeEntradaOk
									? 'Formato inválido. Usa HH:MM (ej: 09:00)'
									: null
							}>
							<input
								value={form.hora_entrada}
								onChange={(e) =>
									setForm({ ...form, hora_entrada: e.target.value })
								}
								placeholder='09:00'
								inputMode='numeric'
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field
							label='Hora salida'
							hint='HH:MM'
							icon={<Clock size={16} className='text-red-500' />}
							error={
								!timeSalidaOk ? 'Formato inválido. Usa HH:MM (ej: 18:00)' : null
							}>
							<input
								value={form.hora_salida}
								onChange={(e) =>
									setForm({ ...form, hora_salida: e.target.value })
								}
								placeholder='18:00'
								inputMode='numeric'
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field label='Tolerancia' hint='minutos'>
							<input
								type='number'
								value={form.tolerancia_minutos}
								onChange={(e) =>
									setForm({
										...form,
										tolerancia_minutos: Number(e.target.value),
									})
								}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>

						<Field label='Tiempo de comida' hint='minutos'>
							<input
								type='number'
								value={form.tiempo_comida_minutos}
								onChange={(e) =>
									setForm({
										...form,
										tiempo_comida_minutos: Number(e.target.value),
									})
								}
								className='w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono
                           focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition'
							/>
						</Field>
					</div>

					{/* Footer hints */}
					<div className='mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
						<div className='text-xs text-neutral-500 flex items-center gap-2'>
							<CheckCircle2 size={14} className='text-neutral-600' />
							Tip: el botón Guardar se bloquea si la hora no está en formato
							correcto.
						</div>

						<div className='text-xs text-neutral-500'>
							Última acción:{' '}
							<span className='text-neutral-300'>
								{isSaving
									? 'Guardando...'
									: hasChanges
									? 'Pendiente'
									: 'Sin cambios'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function SectionTitle({ title }: { title: string }) {
	return (
		<div className='mb-4'>
			<div className='text-sm font-semibold text-neutral-200'>{title}</div>
			<div className='text-xs text-neutral-500'>
				Ajusta los campos y guarda los cambios.
			</div>
		</div>
	);
}
