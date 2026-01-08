'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

function Segmented({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
	return (
		<div className='inline-flex rounded-xl bg-neutral-900/70 p-1 border border-neutral-800'>
			{options.map((opt) => {
				const active = value === opt.value;
				return (
					<button
						key={opt.value}
						onClick={() => onChange(opt.value)}
						className={[
							'px-3 py-2 rounded-lg text-sm font-medium transition-all',
							'flex items-center justify-center gap-2 min-w-[110px]',
							active
								? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
								: 'text-neutral-300 hover:bg-neutral-800/70',
						].join(' ')}>
						{opt.icon}
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

/* =======================
   COMPONENT
   ======================= */

export default function Dashboard() {
	const [loading, setLoading] = useState(true);

	// filtros
	const [dayPreset, setDayPreset] = useState<'today' | 'yesterday'>('today');
	const [filterDay, setFilterDay] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
			2,
			'0'
		)}-${String(d.getDate()).padStart(2, '0')}`;
	});

	// data
	const [pinToInfo, setPinToInfo] = useState<Record<string, PersonInfo>>({});
	const [monthChecadas, setMonthChecadas] = useState<ChecadaRow[]>([]);
	const [apiError, setApiError] = useState<string | null>(null);

	/* preset hoy / ayer */
	useEffect(() => {
		const d = new Date();
		if (dayPreset === 'yesterday') d.setDate(d.getDate() - 1);
		setFilterDay(
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
				d.getDate()
			).padStart(2, '0')}`
		);
	}, [dayPreset]);

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

		const byPin: Record<string, string[]> = {};
		for (const l of logsDay) {
			if (!byPin[l.pin]) byPin[l.pin] = [];
			byPin[l.pin].push(l.ts);
		}

		const dayRows: DayRow[] = Object.entries(byPin)
			.map(([pin, timestamps]) => {
				const info = pinToInfo[pin];
				if (!info) return null;

				const sorted = timestamps.slice().sort(); // ordena por string
				const entryTs = sorted[0];

				const entryTime = hhmmFromTimestamp(entryTs);
				const entryMinutes = parseTimeToMinutes(entryTime);
				const scheduled = parseTimeToMinutes(info.horarioEntrada);
				const diff = entryMinutes - scheduled;
				const isLate = entryMinutes > scheduled + info.tolerancia;

				return {
					pin,
					name: info.name,
					departamento: info.departamento,
					puesto: info.puesto,
					scheduledEntry: info.horarioEntrada,
					entryTime,
					diffMinutes: diff,
					isLate,
				} as DayRow;
			})
			.filter(Boolean) as DayRow[];

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

	/* ====== AQUÍ EMPIEZA TU RETURN ====== */

	return (
		<div className='min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8'>
				{/* Header con logo */}
				<div className='mb-6 lg:mb-8'>
					<div className='flex items-center gap-3 mb-3'>
						<div className='w-14 h-14 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-center overflow-hidden'>
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
								Hoy/Ayer + alertas por acumulación de retardos
							</p>
						</div>

						<div className='hidden sm:flex items-center gap-2'>
							<BadgePill>{computed.totalEmployees} empleados</BadgePill>
							<BadgePill>Mes: {computed.monthKey}</BadgePill>
						</div>
					</div>

					<div className='text-neutral-500 text-xs sm:text-sm'>
						Mostrando: <span className='text-neutral-200'>{showDateText}</span>
					</div>

					{apiError ? (
						<div className='mt-4 p-3 rounded-xl border border-red-900/60 bg-red-900/20 text-red-200 flex items-center gap-2'>
							<AlertTriangle size={18} className='text-red-300' />
							<span className='text-sm'>{apiError}</span>
						</div>
					) : null}
				</div>

				{/* Navigation Pills */}
				<div className='mb-6 lg:mb-8'>
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

				{/* Filtro Hoy/Ayer */}
				<div className='bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-4 sm:p-6 mb-6 shadow-xl'>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
						<div className='flex items-center gap-2 text-neutral-300 font-medium'>
							<Calendar className='text-red-500' size={20} />
							<span>Período:</span>
						</div>

						<div className='flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end'>
							<Segmented
								value={dayPreset}
								onChange={(v) => setDayPreset(v as any)}
								options={[
									{ value: 'today', label: 'Hoy' },
									{ value: 'yesterday', label: 'Ayer' },
								]}
							/>

							<div className='flex-1 sm:flex-none'>
								<input
									type='date'
									value={filterDay}
									onChange={(e) => setFilterDay(e.target.value)}
									className='w-full sm:w-auto px-4 py-2.5 bg-black/80 border border-neutral-700 rounded-xl text-white
                             focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all'
								/>
							</div>
						</div>
					</div>

					<div className='mt-3 flex flex-wrap gap-2'>
						<BadgePill>Mes acumulado: {computed.monthKey}</BadgePill>
						<BadgePill>
							Checadas mes:{' '}
							<span className='text-neutral-200'>
								{computed.totalChecadasMonth}
							</span>
						</BadgePill>
						<BadgePill>
							Alertas:{' '}
							<span className='text-red-300'>{computed.alertPins.length}</span>
						</BadgePill>
					</div>
				</div>

				{/* Cards resumen del día */}
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6'>
					<div className='bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-2xl border border-neutral-700 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-neutral-600 transition-all'>
						<div className='flex items-center justify-between mb-4'>
							<div className='p-3 bg-white/10 rounded-xl'>
								<Users className='text-white' size={24} />
							</div>
							<div className='text-right'>
								<p className='text-neutral-300 text-xs sm:text-sm mb-1'>
									Llegaron
								</p>
								<p className='text-3xl sm:text-4xl font-bold text-white'>
									{computed.presentes}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 text-neutral-300 text-xs sm:text-sm'>
							<BarChart3 size={14} />
							<span>Presentes del día</span>
						</div>
					</div>

					<div className='bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-2xl border border-neutral-700 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-neutral-600 transition-all'>
						<div className='flex items-center justify-between mb-4'>
							<div className='p-3 bg-emerald-600/15 rounded-xl'>
								<CheckCircle className='text-emerald-300' size={24} />
							</div>
							<div className='text-right'>
								<p className='text-neutral-300 text-xs sm:text-sm mb-1'>
									A tiempo
								</p>
								<p className='text-3xl sm:text-4xl font-bold text-white'>
									{computed.aTiempo}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 text-neutral-300 text-xs sm:text-sm'>
							<CheckCircle size={14} className='text-emerald-300' />
							<span>Puntuales</span>
						</div>
					</div>

					<div className='bg-gradient-to-br from-red-950/40 to-red-900/20 backdrop-blur-sm rounded-2xl border border-red-900/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-red-800/70 transition-all'>
						<div className='flex items-center justify-between mb-4'>
							<div className='p-3 bg-red-600/20 rounded-xl'>
								<Clock className='text-red-400' size={24} />
							</div>
							<div className='text-right'>
								<p className='text-red-300 text-xs sm:text-sm mb-1'>Retardos</p>
								<p className='text-3xl sm:text-4xl font-bold text-red-400'>
									{computed.retardos}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 text-red-300 text-xs sm:text-sm'>
							<Clock size={14} />
							<span>Llegadas tarde</span>
						</div>
					</div>
				</div>

				{/* Alertas + Tabla */}
				<div className='grid grid-cols-1 lg:grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-4 sm:gap-6 items-start'>
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
							<div className='space-y-3'>
								{computed.alertPins.slice(0, 10).map((p) => (
									<div
										key={p.pin}
										className='flex items-center justify-between gap-3 p-3 rounded-xl border border-neutral-800 bg-black/40'>
										<div className='min-w-0'>
											<div className='text-white font-medium truncate'>
												{p.name}
											</div>
											<div className='text-xs text-neutral-400 truncate'>
												{p.departamento} • {p.puesto} • PIN {p.pin}
											</div>
										</div>
										<span className='px-3 py-1 rounded-full text-xs font-semibold bg-red-600/20 border border-red-700 text-red-200'>
											{p.count} retardos
										</span>
									</div>
								))}
								{computed.alertPins.length > 10 ? (
									<div className='text-xs text-neutral-500'>
										Mostrando 10 de {computed.alertPins.length}.
									</div>
								) : null}
							</div>
						) : (
							<div className='text-neutral-400 text-sm'>
								Sin alertas en este mes 🎉
							</div>
						)}
					</div>

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
							{/* Scroll horizontal suave en pantallas chicas */}
							<div className='overflow-x-auto'>
								<table className='w-full text-sm min-w-[720px]'>
									<thead className='bg-neutral-900'>
										<tr className='text-neutral-300'>
											<th className='text-left px-3 py-2'>Empleado</th>

											{/* Oculta Depto en móvil */}
											<th className='text-left px-3 py-2 hidden sm:table-cell'>
												Depto
											</th>

											<th className='text-right px-3 py-2 whitespace-nowrap'>
												Entrada
											</th>
											<th className='text-right px-3 py-2 whitespace-nowrap'>
												Dif
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
												{/* Empleado */}
												<td className='px-3 py-2 min-w-[260px]'>
													<div className='text-white font-medium truncate'>
														{r.name}
													</div>

													<div className='text-xs text-neutral-500 truncate'>
														{r.puesto} • PIN {r.pin}
													</div>

													{/* En móvil mostramos Depto aquí */}
													<div className='text-xs text-neutral-400 truncate sm:hidden mt-0.5'>
														{r.departamento}
													</div>
												</td>

												{/* Depto (solo >= sm) */}
												<td className='px-3 py-2 text-neutral-300 hidden sm:table-cell max-w-[220px]'>
													<div className='truncate'>{r.departamento}</div>
												</td>

												{/* Entrada */}
												<td className='px-3 py-2 text-right font-mono text-white whitespace-nowrap'>
													{r.entryTime}
													<div className='text-[11px] text-neutral-500 whitespace-nowrap'>
														{r.scheduledEntry}
													</div>
												</td>

												{/* Dif */}
												<td
													className={[
														'px-3 py-2 text-right font-mono whitespace-nowrap',
														r.isLate ? 'text-red-300' : 'text-emerald-300',
													].join(' ')}>
													{r.diffMinutes >= 0 ? '+' : ''}
													{r.diffMinutes}m
												</td>

												{/* Estatus */}
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
													className='px-3 py-8 text-center text-neutral-400'>
													No hay checadas para este día.
												</td>
											</tr>
										) : null}
									</tbody>
								</table>
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
