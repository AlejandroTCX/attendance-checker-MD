'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import LogoLoader from '@/components/ui/logoLoader';
import {
	Users,
	Clock,
	AlertTriangle,
	CheckCircle,
	Calendar,
	ArrowRight,
	FileText,
	Settings,
	UserCog,
	Building2,
	BarChart3,
	CalendarDays,
} from 'lucide-react';

type WorkerRow = {
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

type ChecadaRow = {
	pin: number;
	device_ip: string | null;
	timestamp_utc: string; // <- YA NO UTC, string tal cual
};

type PersonInfo = {
	name: string;
	puesto: string;
	departamento: string;
	horarioEntrada: string; // HH:MM
	horarioSalida: string;
	tolerancia: number;
	activo: boolean;
};

type DayRow = {
	pin: string;
	name: string;
	departamento: string;
	puesto: string;

	scheduledEntry: string;
	entryTime: string;
	entryTs: string;

	// ✅ salida detectada (segunda checada >= 60 min después)
	exitTime: string; // '' si no hay
	exitTs: string; // '' si no hay

	lastTs: string; // 👈 NUEVO: última checada del día (para ordenar)
	lastTime: string;

	diffMinutes: number;
	isLate: boolean;
};

/* =======================
   HELPERS SIN TIMEZONE
   ======================= */

function ymdFromTimestamp(ts: string) {
	const s = String(ts).trim();

	// Caso ISO: 2026-01-08T...
	if (s[4] === '-' && s[7] === '-') return s.slice(0, 10);

	// Caso con espacio: 2026-01-08 16:44:53
	if (s.includes(' ') && s.split(' ')[0]?.length >= 10) {
		const d = s.split(' ')[0];
		if (d[4] === '-' && d[7] === '-') return d.slice(0, 10);
	}

	// Si viene raro, intenta extraer YYYY-MM-DD con regex
	const m = s.match(/(\d{4}-\d{2}-\d{2})/);
	return m?.[1] || '';
}

function hhmmFromTimestamp(ts: string) {
	const s = String(ts).trim();
	// Busca HH:MM en cualquier formato
	const m = s.match(/(\d{2}):(\d{2})/);
	return m ? `${m[1]}:${m[2]}` : '00:00';
}

function hhmm(t: string | null | undefined) {
	if (!t) return '';
	return String(t).slice(0, 5);
}

function parseTimeToMinutes(timeStr: string): number {
	const [hh, mm] = String(timeStr || '0:0')
		.split(':')
		.map(Number);
	return (hh || 0) * 60 + (mm || 0);
}

function getMonthStringFromDay(day: string) {
	// YYYY-MM-DD -> YYYY-MM
	return day.slice(0, 7);
}

/* =======================
   UI HELPERS
   ======================= */

function BadgePill({ children }: { children: React.ReactNode }) {
	return (
		<span className='inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300'>
			{children}
		</span>
	);
}
function minutesFromTimestamp(ts: string) {
	return parseTimeToMinutes(hhmmFromTimestamp(ts));
}

/* =======================
   COMPONENT
   ======================= */

export default function Dashboard() {
	const [loading, setLoading] = useState(true);
	const dateInputRef = useRef<HTMLInputElement>(null);

	// ✅ filtro por día (cualquier día)
	const [filterDay, setFilterDay] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
			2,
			'0'
		)}-${String(d.getDate()).padStart(2, '0')}`;
	});

	// ✅ atajos opcionales
	const setToday = () => {
		const d = new Date();
		setFilterDay(
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
				d.getDate()
			).padStart(2, '0')}`
		);
	};

	const setYesterday = () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		setFilterDay(
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
				d.getDate()
			).padStart(2, '0')}`
		);
	};

	// data
	const [pinToInfo, setPinToInfo] = useState<Record<string, PersonInfo>>({});
	const [monthChecadas, setMonthChecadas] = useState<ChecadaRow[]>([]);
	const [apiError, setApiError] = useState<string | null>(null);

	/* cargar empleados */
	useEffect(() => {
		const loadWorkers = async () => {
			try {
				setApiError(null);
				const res = await fetch('/api/workers');
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Error cargando empleados');

				const map: Record<string, PersonInfo> = {};
				(json.workers as WorkerRow[]).forEach((w) => {
					const pin = String(w.pin);
					map[pin] = {
						name: w.nombre || `PIN ${pin}`,
						puesto: w.puesto ?? 'N/A',
						departamento: w.departamento ?? 'N/A',
						horarioEntrada: hhmm(w.hora_entrada) || '09:00',
						horarioSalida: hhmm(w.hora_salida) || '18:00',
						tolerancia: w.tolerancia_minutos ?? 19,
						activo: !!w.activo,
					};
				});

				setPinToInfo(map);
			} catch (e: any) {
				setApiError(e?.message || 'Error');
			}
		};

		loadWorkers();
	}, []);

	/* cargar checadas del mes */
	useEffect(() => {
		const month = getMonthStringFromDay(filterDay);

		const loadChecadas = async () => {
			try {
				setLoading(true);
				setApiError(null);

				const res = await fetch(`/api/attendanceLog?month=${month}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Error cargando checadas');

				setMonthChecadas(json.checadas ?? []);
			} catch (e: any) {
				setApiError(e?.message || 'Error');
				setMonthChecadas([]);
			} finally {
				setLoading(false);
			}
		};

		loadChecadas();
	}, [filterDay]);

	/* =======================
     COMPUTED (SIN Date)
     ======================= */

	const computed = useMemo(() => {
		const monthKey = getMonthStringFromDay(filterDay);

		const logsMonth = monthChecadas
			.map((c) => ({
				pin: String(c.pin),
				ts: String(c.timestamp_utc),
			}))
			.filter((x) => !!pinToInfo[x.pin]);

		const logsDay = logsMonth.filter(
			(x) => ymdFromTimestamp(x.ts) === filterDay
		);

		// por pin para obtener la primera entrada del día
		const byPin: Record<string, string[]> = {};
		for (const l of logsDay) {
			if (!byPin[l.pin]) byPin[l.pin] = [];
			byPin[l.pin].push(l.ts);
		}

		let dayRows: DayRow[] = Object.entries(byPin)
			.map(([pin, timestamps]) => {
				const info = pinToInfo[pin];
				if (!info) return null;

				const sorted = timestamps.slice().sort(); // strings ISO ordenan bien
				const entryTs = sorted[0];
				const lastTs = sorted[sorted.length - 1];

				const entryTime = hhmmFromTimestamp(entryTs);
				const entryMinutes = minutesFromTimestamp(entryTs);

				// ✅ salida: primera checada que esté al menos 60 min después de la entrada
				const exitCandidate = sorted.find(
					(ts) => minutesFromTimestamp(ts) >= entryMinutes + 60
				);
				const lastMinutes = minutesFromTimestamp(lastTs);
				const exitTs = lastMinutes >= entryMinutes + 60 ? lastTs : '';
				const exitTime = exitTs ? hhmmFromTimestamp(exitTs) : '';

				const lastTime = hhmmFromTimestamp(lastTs);

				const scheduled = parseTimeToMinutes(info.horarioEntrada);
				const diff = entryMinutes - scheduled;
				const isLate = diff > info.tolerancia;

				return {
					pin,
					name: info.name,
					departamento: info.departamento,
					puesto: info.puesto,
					scheduledEntry: info.horarioEntrada,
					entryTime,
					entryTs,

					exitTime,
					exitTs,

					lastTs, // 👈
					lastTime, // 👈 (opcional)
					diffMinutes: diff,
					isLate,
				} as DayRow;
			})
			.filter(Boolean) as DayRow[];

		// ✅ orden por timestamp (asc). Si quieres desc: b.entryTs.localeCompare(a.entryTs)
		dayRows.sort((a, b) => b.lastTs.localeCompare(a.lastTs));

		const presentes = dayRows.length;
		const retardos = dayRows.filter((r) => r.isLate).length;
		const aTiempo = presentes - retardos;

		/* acumulado mensual */
		const personDays: Record<string, Record<string, string[]>> = {};
		for (const l of logsMonth) {
			const dateKey = ymdFromTimestamp(l.ts);

			if (!dateKey.startsWith(monthKey)) continue;

			if (!personDays[l.pin]) personDays[l.pin] = {};
			if (!personDays[l.pin][dateKey]) personDays[l.pin][dateKey] = [];
			personDays[l.pin][dateKey].push(l.ts);
		}

		const alertPins = Object.entries(personDays)
			.map(([pin, days]) => {
				const info = pinToInfo[pin];
				if (!info) return null;

				let lateCount = 0;
				Object.values(days).forEach((timestamps) => {
					const entryTs = timestamps.slice().sort()[0];
					const entryTime = hhmmFromTimestamp(entryTs);
					const entryMinutes = parseTimeToMinutes(entryTime);
					const scheduled = parseTimeToMinutes(info.horarioEntrada);
					if (entryMinutes > scheduled + info.tolerancia) lateCount++;
				});

				if (lateCount < 3) return null;

				return {
					pin,
					count: lateCount,
					name: info.name,
					departamento: info.departamento,
					puesto: info.puesto,
				};
			})
			.filter(Boolean)
			.sort((a: any, b: any) => b.count - a.count);

		return {
			monthKey,
			presentes,
			retardos,
			aTiempo,
			dayRows,
			alertPins,
			totalEmployees: Object.keys(pinToInfo).length,
			totalChecadasMonth: logsMonth.length,
		};
	}, [filterDay, monthChecadas, pinToInfo]);

	if (loading) return <LogoLoader label='Cargando resumen...' />;

	const showDateText =
		filterDay &&
		new Date(filterDay + 'T12:00:00').toLocaleDateString('es-MX', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});

	const openDatePicker: React.MouseEventHandler<HTMLButtonElement> = (e) => {
		e.preventDefault();
		const el = dateInputRef.current;
		if (!el) return;

		// Chrome/Edge
		const anyEl = el as any;
		if (typeof anyEl.showPicker === 'function') {
			anyEl.showPicker();
			return;
		}

		// Fallback (Safari / otros)
		el.focus();
		el.click();
	};

	/* ====== RETURN ====== */

	return (
		<div className='min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'>
				{/* Header con logo */}
				<div className='mb-6 lg:mb-8'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-14 h-12 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-center overflow-hidden'>
							<img
								src='/Logo%20Mariana%20Nuevo%20.png'
								alt='Mariana Distribuciones'
								className='w-full h-full object-contain p-2'
							/>
						</div>

						<div className='flex-1'>
							<h1 className='text-3xl sm:text-4xl font-bold text-white'>
								Resumen de Asistencia
							</h1>
							<p className='text-neutral-400 text-sm sm:text-base'>
								Filtra por día + alertas por acumulación de retardos
							</p>
						</div>

						<div className='hidden sm:flex items-center gap-2'>
							<BadgePill>{computed.totalEmployees} empleados</BadgePill>
							<BadgePill>Mes: {computed.monthKey}</BadgePill>
						</div>
					</div>

					{apiError ? (
						<div className='mt-4 p-3 rounded-xl border border-red-900/60 bg-red-900/20 text-red-200 flex items-center gap-2'>
							<AlertTriangle size={18} className='text-red-300' />
							<span className='text-sm'>{apiError}</span>
						</div>
					) : null}
				</div>

				{/* Navigation Pills */}
				<div className='mb-2 lg:mb-2'>
					<div className='flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory'>
						<a
							href='/calendar'
							className='group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0'>
							<div className='w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all'>
								<Calendar className='text-red-500' size={18} />
							</div>
							<span className='text-sm font-medium text-neutral-200 group-hover:text-white'>
								Calendario
							</span>
							<ArrowRight
								className='text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all'
								size={16}
							/>
						</a>

						<a
							href='/personal'
							className='group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0'>
							<div className='w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all'>
								<UserCog className='text-red-500' size={18} />
							</div>
							<span className='text-sm font-medium text-neutral-200 group-hover:text-white'>
								Personal
							</span>
							<ArrowRight
								className='text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all'
								size={16}
							/>
						</a>

						<a
							href='/reportes'
							className='group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0'>
							<div className='w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all'>
								<FileText className='text-red-500' size={18} />
							</div>
							<span className='text-sm font-medium text-neutral-200 group-hover:text-white'>
								Reportes
							</span>
							<ArrowRight
								className='text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all'
								size={16}
							/>
						</a>

						<a
							href='/settings'
							className='group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0'>
							<div className='w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all'>
								<Settings className='text-red-500' size={18} />
							</div>
							<span className='text-sm font-medium text-neutral-200 group-hover:text-white'>
								Configuración
							</span>
							<ArrowRight
								className='text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all'
								size={16}
							/>
						</a>
					</div>
				</div>
				<div className='mb-3 flex items-center justify-between gap-3'>
					<div className='min-w-0'>
						<div className='text-sm text-neutral-400'>Día seleccionado</div>
						<div className='text-white font-semibold truncate'>
							{showDateText}
						</div>
					</div>

					<span className='hidden sm:inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300'>
						<CalendarDays size={14} className='text-red-400' />
						{filterDay}
					</span>
				</div>

				{/* Filtro por día */}
				{/* Filtro por día (más estético) */}
				<div className='relative overflow-hidden rounded-2xl border border-neutral-800/60 bg-neutral-950/50 p-3 sm:p-4 mb-2 shadow-lg'>
					{/* glow más sutil */}
					<div className='pointer-events-none absolute -top-28 -right-28 h-48 w-48 rounded-full bg-red-600/5 blur-3xl' />

					<div className='relative flex flex-col gap-2.5'>
						{/* Header compacto */}
						<div className='flex items-center justify-between gap-3'>
							<div className='flex items-center gap-2 min-w-0'>
								<div className='h-9 w-9 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-center shrink-0'>
									<Calendar className='text-red-500' size={16} />
								</div>

								<div className='min-w-0'>
									<div className='text-white font-semibold leading-tight'>
										Filtro por día
									</div>
									{/* opcional: quítalo si lo quieres aún más compacto */}
									<div className='text-[11px] text-neutral-500 truncate'>
										Selecciona una fecha
									</div>
								</div>
							</div>

							{/* Atajos mini */}
							<div className='flex items-center gap-2 shrink-0'>
								<button
									onClick={setToday}
									className='px-2.5 py-1.5 rounded-lg bg-neutral-900/70 border border-neutral-800 text-neutral-200 hover:bg-neutral-800/80 transition text-xs'>
									Hoy
								</button>
								<button
									onClick={setYesterday}
									className='px-2.5 py-1.5 rounded-lg bg-neutral-900/70 border border-neutral-800 text-neutral-200 hover:bg-neutral-800/80 transition text-xs'>
									Ayer
								</button>
							</div>
						</div>

						{/* Controles compactos */}
						<div className='flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between'>
							{/* Input date */}
							<div className='flex-1'>
								<div className='relative'>
									<input
										ref={dateInputRef}
										type='date'
										value={filterDay}
										onChange={(e) => setFilterDay(e.target.value)}
										className='w-full pr-11 px-3 py-2.5 bg-black/50 border border-neutral-800 rounded-xl text-white
focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-sm'
									/>

									<button
										type='button'
										onClick={openDatePicker}
										className='absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-neutral-800 bg-neutral-900/60
hover:bg-neutral-800/80 transition flex items-center justify-center'
										aria-label='Abrir calendario'>
										<CalendarDays size={16} className='text-red-400' />
									</button>

									{/* badge del mes (solo desktop) */}
									<div className='hidden sm:flex absolute right-10 top-1/2 -translate-y-1/2'>
										<span className='px-2 py-0.5 rounded-lg text-[10px] border border-neutral-800 bg-neutral-900/60 text-neutral-300'>
											{computed.monthKey}
										</span>
									</div>
								</div>
							</div>

							{/* Stats mini (más discretas) */}
							<div className='flex flex-wrap gap-2 sm:justify-end'>
								<span className='inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-2.5 py-0.5 text-[11px] text-neutral-300'>
									<span className='h-1.5 w-1.5 rounded-full bg-neutral-500' />
									Mes{' '}
									<span className='text-neutral-100'>{computed.monthKey}</span>
								</span>

								<span className='inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-2.5 py-0.5 text-[11px] text-neutral-300'>
									<span className='h-1.5 w-1.5 rounded-full bg-neutral-500' />
									Checadas{' '}
									<span className='text-neutral-100'>
										{computed.totalChecadasMonth}
									</span>
								</span>

								<span className='inline-flex items-center gap-2 rounded-full border border-red-900/40 bg-red-900/10 px-2.5 py-0.5 text-[11px] text-red-200'>
									<span className='h-1.5 w-1.5 rounded-full bg-red-400' />
									Alertas{' '}
									<span className='text-red-100'>
										{computed.alertPins.length}
									</span>
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Cards resumen del día */}
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4'>
					<div className='bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700 p-4 shadow-lg hover:border-neutral-600 transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<div className='p-2 bg-white/10 rounded-lg'>
								<Users className='text-white' size={20} />
							</div>
							<div className='text-right'>
								<p className='text-neutral-400 text-xs'>Llegaron</p>
								<p className='text-2xl sm:text-3xl font-bold text-white'>
									{computed.presentes}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-1.5 text-neutral-400 text-xs'>
							<BarChart3 size={12} />
							<span>Presentes del día</span>
						</div>
					</div>

					<div className='bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700 p-4 shadow-lg hover:border-neutral-600 transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<div className='p-2 bg-emerald-600/15 rounded-lg'>
								<CheckCircle className='text-emerald-300' size={20} />
							</div>
							<div className='text-right'>
								<p className='text-neutral-400 text-xs'>A tiempo</p>
								<p className='text-2xl sm:text-3xl font-bold text-white'>
									{computed.aTiempo}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-1.5 text-neutral-400 text-xs'>
							<CheckCircle size={12} className='text-emerald-300' />
							<span>Puntuales</span>
						</div>
					</div>

					<div className='bg-gradient-to-br from-red-950/40 to-red-900/20 backdrop-blur-sm rounded-xl border border-red-900/50 p-4 shadow-lg hover:border-red-800/70 transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<div className='p-2 bg-red-600/20 rounded-lg'>
								<Clock className='text-red-400' size={20} />
							</div>
							<div className='text-right'>
								<p className='text-red-300 text-xs'>Retardos</p>
								<p className='text-2xl sm:text-3xl font-bold text-red-400'>
									{computed.retardos}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-1.5 text-red-300 text-xs'>
							<Clock size={12} />
							<span>Llegadas tarde</span>
						</div>
					</div>
				</div>

				{/* Alertas + Tabla */}
				<div className='grid grid-cols-1 lg:grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-4 sm:gap-6 items-start'>
					{/* ALERTAS */}
					<div className='bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-3 sm:p-4 shadow-xl'>
						<div className='flex items-center justify-between gap-3 mb-4'>
							<div className='flex items-center gap-3'>
								<AlertTriangle className='text-red-500' size={22} />
								<h2 className='text-lg sm:text-xl font-bold text-white'>
									Alertas (3+ retardos en el mes)
								</h2>
							</div>
							<BadgePill>{computed.alertPins.length} personas</BadgePill>
						</div>

						{computed.alertPins.length ? (
							<div className='space-y-2'>
								{computed.alertPins.slice(0, 10).map((p) => (
									<div
										key={p.pin}
										className='flex items-center gap-3 rounded-xl border border-neutral-800/70 bg-black/30 px-3 py-2'>
										<div className='h-2 w-2 rounded-full bg-red-400/80 shrink-0' />

										<div className='min-w-0 flex-1'>
											<div className='text-sm text-white font-medium truncate'>
												{p.name}
											</div>
											<div className='text-[11px] text-neutral-500 truncate'>
												{p.departamento} • {p.puesto} • PIN {p.pin}
											</div>
										</div>

										<span className='shrink-0 rounded-full border border-red-900/60 bg-red-900/15 px-2.5 py-1 text-[11px] text-red-200 font-semibold'>
											{p.count}
										</span>
									</div>
								))}

								{computed.alertPins.length > 10 ? (
									<div className='text-[11px] text-neutral-500 pt-1'>
										Mostrando 10 de {computed.alertPins.length}
									</div>
								) : null}
							</div>
						) : (
							<div className='text-neutral-400 text-sm'>
								Sin alertas en este mes 🎉
							</div>
						)}
					</div>

					{/* LLEGADAS DEL DÍA */}
					<div className='bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-3 sm:p-4 shadow-xl'>
						<div className='flex items-center justify-between gap-3 mb-4'>
							<div className='flex items-center gap-3 min-w-0'>
								<Building2 className='text-red-500 shrink-0' size={22} />
								<h2 className='text-lg sm:text-xl font-bold text-white truncate'>
									Llegadas del día
								</h2>
							</div>

							<div className='shrink-0'>
								<BadgePill>{computed.dayRows.length} registros</BadgePill>
							</div>
						</div>

						<div className='rounded-xl border border-neutral-800 overflow-hidden'>
							{/* ✅ Scroll interno */}
							<div className='max-h-[65vh] overflow-y-auto'>
								{/* ===== MÓVIL: TARJETAS ===== */}
								<div className='sm:hidden p-3 space-y-3'>
									{computed.dayRows.map((r) => (
										<div
											key={r.pin}
											className='p-3 rounded-xl border border-neutral-800 bg-black/35'>
											<div className='flex items-start justify-between gap-3'>
												<div className='min-w-0'>
													<div className='text-white font-semibold truncate'>
														{r.name}
													</div>
													<div className='text-xs text-neutral-500 truncate'>
														{r.puesto} • PIN {r.pin}
													</div>
													<div className='text-xs text-neutral-400 truncate mt-1'>
														{r.departamento}
													</div>
												</div>

												<div className='text-right shrink-0'>
													<div className='font-mono text-white text-lg leading-none'>
														{r.entryTime}
													</div>
													<div className='text-[11px] text-neutral-500 font-mono mt-1'>
														Prog: {r.scheduledEntry}
													</div>
												</div>
											</div>

											<div className='mt-3 flex items-center justify-between'>
												<div
													className={[
														'font-mono text-sm',
														r.isLate ? 'text-red-300' : 'text-emerald-300',
													].join(' ')}>
													{r.diffMinutes >= 0 ? '+' : ''}
													{r.diffMinutes}m
												</div>

												{r.isLate ? (
													<span className='inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-red-600/20 border border-red-700 text-red-200'>
														Retardo
													</span>
												) : (
													<span className='inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-emerald-600/15 border border-emerald-700/40 text-emerald-200'>
														A tiempo
													</span>
												)}
											</div>
										</div>
									))}

									{!computed.dayRows.length ? (
										<div className='py-10 text-center text-neutral-400'>
											No hay checadas para este día.
										</div>
									) : null}
								</div>

								{/* ===== DESKTOP: TABLA ===== */}
								<div className='hidden sm:block overflow-x-auto'>
									<table className='w-full text-sm min-w-[720px]'>
										<thead className='bg-neutral-900 sticky top-0 z-10'>
											<tr className='text-neutral-300'>
												<th className='text-left px-3 py-2'>Empleado</th>
												<th className='text-left px-3 py-2'>Depto</th>
												<th className='text-right px-3 py-2 whitespace-nowrap'>
													Entrada
												</th>
												<th className='text-right px-3 py-2 whitespace-nowrap'>
													Dif
												</th>
												<th className='text-right px-3 py-2 whitespace-nowrap'>
													Salida
												</th>

												<th className='text-right px-3 py-2 whitespace-nowrap'>
													Estatus
												</th>
											</tr>
										</thead>

										<tbody className='bg-black/30'>
											{computed.dayRows.map((r) => (
												<tr
													key={r.pin}
													className='border-t border-neutral-800 hover:bg-neutral-900/50 transition'>
													<td className='px-3 py-2 min-w-[260px]'>
														<div className='text-white font-medium truncate'>
															{r.name}
														</div>
														<div className='text-xs text-neutral-500 truncate'>
															{r.puesto} • PIN {r.pin}
														</div>
													</td>

													<td className='px-3 py-2 text-neutral-300 max-w-[220px]'>
														<div className='truncate'>{r.departamento}</div>
													</td>

													<td className='px-3 py-2 text-right font-mono text-white whitespace-nowrap'>
														{r.entryTime}
														<div className='text-[11px] text-neutral-500 whitespace-nowrap'>
															{r.scheduledEntry}
														</div>
													</td>

													<td
														className={[
															'px-3 py-2 text-right font-mono whitespace-nowrap',
															r.isLate ? 'text-red-300' : 'text-emerald-300',
														].join(' ')}>
														{r.diffMinutes >= 0 ? '+' : ''}
														{r.diffMinutes}m
													</td>
													<td className='px-3 py-2 text-right font-mono text-white whitespace-nowrap'>
														{r.exitTime || '—'}
														<div className='text-[11px] text-neutral-500 whitespace-nowrap'>
															{r.exitTime ? 'detectada' : 'sin registro'}
														</div>
													</td>

													<td className='px-3 py-2 text-right whitespace-nowrap'>
														{r.isLate ? (
															<span className='inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-red-600/20 border border-red-700 text-red-200'>
																Retardo
															</span>
														) : (
															<span className='inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-emerald-600/15 border border-emerald-700/40 text-emerald-200'>
																A tiempo
															</span>
														)}
													</td>
												</tr>
											))}

											{!computed.dayRows.length ? (
												<tr>
													<td
														colSpan={5}
														className='px-3 py-10 text-center text-neutral-400'>
														No hay checadas para este día.
													</td>
												</tr>
											) : null}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div className='mt-3 text-xs text-neutral-500'>
							* “3+ retardos” se calcula con el mes del día seleccionado (
							{computed.monthKey}).
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
