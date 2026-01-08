'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
	Calendar,
	Clock,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Users,
	Building2,
	Briefcase,
	Filter,
	ArrowLeft,
} from 'lucide-react';

interface AttendanceRecord {
	date: string;
	pin: string;
	name: string;
}

interface PersonRecord {
	PIN: string;
	NAME: string;
	Puesto: string;
	Departamento: string;
	'Razón social': string;
	Entrada: string;
	Salida: string;
	Tolerancia: string;
	'Tiempo de comida': string;
}

interface DayAttendance {
	date: string;
	name: string;
	puesto: string;
	entry?: string;
	exit?: string;
	isLate: boolean;
	wtf: boolean;
	scheduledEntry?: string;
	scheduledExit?: string;
}

interface PersonInfo {
	name: string;
	puesto: string;
	departamento: string;
	razonSocial: string;
	horarioEntrada: string;
	horarioSalida: string;
	tolerancia: number;
	tiempoComida: string;
}

export default function CalendarPage() {
	// =========================
	// STATE (primero todo)
	// =========================
	const [records, setRecords] = useState<AttendanceRecord[]>([]);
	const [rawLogs, setRawLogs] = useState<any[]>([]);
	const [pinToInfo, setPinToInfo] = useState<Record<string, PersonInfo>>({});

	const [people, setPeople] = useState<string[]>([]);
	const [selectedPerson, setSelectedPerson] = useState<string>('');

	const [processedByDay, setProcessedByDay] = useState<DayAttendance[]>([]);
	const [viewMode] = useState<'calendar' | 'list'>('list');

	const [selectedDepartamento, setSelectedDepartamento] =
		useState<string>('Todos');
	const [selectedHorario, setSelectedHorario] = useState<string>('Todos');

	const [viewType, setViewType] = useState<'individual' | 'department'>(
		'department'
	);

	// ✅ filtro mes arriba (para poder usarlo en effects)
	const [filterMonth, setFilterMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}`;
	});

	// Loading / Error powers
	const [isLoadingCsv, setIsLoadingCsv] = useState(true);
	const [isLoadingLogs, setIsLoadingLogs] = useState(true);
	const [apiError, setApiError] = useState<string | null>(null);

	// =========================
	// HELPERS
	// =========================
	function parseLocalTimestamp(ts: string): Date {
		// soporta "2026-01-07T16:44:45Z" o "2026-01-07 16:44:45"
		const clean = ts.replace('T', ' ').replace('Z', '');
		const [datePart, timePart] = clean.split(' ');
		if (!datePart || !timePart) return new Date(ts);

		const [y, m, d] = datePart.split('-').map(Number);
		const [hh, mm, ss] = timePart.split(':').map(Number);
		return new Date(y, m - 1, d, hh, mm, ss || 0);
	}

	function parseCSV<T>(csvText: string): Promise<T[]> {
		return new Promise((resolve, reject) => {
			Papa.parse<T>(csvText, {
				header: true,
				skipEmptyLines: true,
				complete: (r) => resolve(r.data),
				error: reject,
			});
		});
	}

	function getLocalDateString(date: Date) {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function parseTimeToMinutes(timeStr: string): number {
		const [hh, mm] = timeStr.split(':').map(Number);
		return hh * 60 + mm;
	}

	function parseTolerancia(tolStr: string): number {
		const match = tolStr.match(/(\d+)/);
		return match ? parseInt(match[1]) : 19;
	}

	function processDayRecords(
		timestamps: string[],
		personInfo: PersonInfo
	): DayAttendance {
		const ENTRY_TIME = parseTimeToMinutes(personInfo.horarioEntrada);
		const TOLERANCE = personInfo.tolerancia;

		const sorted = timestamps
			.map((t) => parseLocalTimestamp(t))
			.sort((a, b) => a.getTime() - b.getTime());

		const entry = sorted[0];
		const entryMinutes = entry.getHours() * 60 + entry.getMinutes();
		const isLate = entryMinutes > ENTRY_TIME + TOLERANCE;

		let exit: Date | undefined;
		let wtf = false;

		if (sorted.length >= 2) {
			const diff = (sorted[1].getTime() - entry.getTime()) / 60000;
			if (diff > 60) exit = sorted[1];
		}

		if (sorted.length > 2) wtf = true;

		return {
			date: getLocalDateString(entry),
			name: personInfo.name,
			puesto: personInfo.puesto,
			entry: entry.toLocaleTimeString('es-MX', { hour12: false }),
			exit: exit?.toLocaleTimeString('es-MX', { hour12: false }),
			isLate,
			wtf,
			scheduledEntry: personInfo.horarioEntrada,
			scheduledExit: personInfo.horarioSalida,
		};
	}

	// =========================
	// EFFECT 1: Cargar CSV 1 vez
	// =========================
	useEffect(() => {
		let alive = true;

		const loadPeopleCsv = async () => {
			try {
				setIsLoadingCsv(true);
				setApiError(null);

				const peopleCsv = await fetch('/data/Checador horarios.csv').then((r) =>
					r.text()
				);
				const peopleData = await parseCSV<PersonRecord>(peopleCsv);

				const map: Record<string, PersonInfo> = {};
				peopleData.forEach((p) => {
					if (p.PIN && p.NAME) {
						map[p.PIN.trim()] = {
							name: p.NAME.trim(),
							puesto: p.Puesto?.trim() || 'N/A',
							departamento: p.Departamento?.trim() || 'N/A',
							razonSocial: p['Razón social']?.trim() || 'N/A',
							horarioEntrada: p.Entrada?.trim() || '09:00',
							horarioSalida: p.Salida?.trim() || '18:00',
							tolerancia: parseTolerancia(p.Tolerancia || '19 min'),
							tiempoComida: p['Tiempo de comida']?.trim() || 'N/A',
						};
					}
				});

				if (!alive) return;
				setPinToInfo(map);
			} catch (e: any) {
				console.error(e);
				if (!alive) return;
				setApiError(e?.message || 'Error cargando CSV de empleados');
			} finally {
				if (!alive) return;
				setIsLoadingCsv(false);
			}
		};

		loadPeopleCsv();
		return () => {
			alive = false;
		};
	}, []);

	// =========================
	// EFFECT 2: Cargar logs por MES (refetch)
	// =========================
	useEffect(() => {
		let alive = true;

		const loadLogsByMonth = async () => {
			try {
				setIsLoadingLogs(true);
				setApiError(null);

				const res = await fetch(`/api/attendanceLog?month=${filterMonth}`);
				const api = await res.json();

				if (!res.ok) {
					console.error('attendanceLog API error:', api);
					throw new Error(api?.error || 'Error cargando attendanceLog');
				}

				// Normalizamos para usar pin y timestamp
				const logData = (api.checadas || []).map((x: any) => ({
					pin: String(x.pin),
					timestamp: x.timestamp_utc,
				}));

				if (!alive) return;
				setRawLogs(logData);
			} catch (e: any) {
				console.error(e);
				if (!alive) return;
				setApiError(e?.message || 'Error cargando logs');
				setRawLogs([]);
			} finally {
				if (!alive) return;
				setIsLoadingLogs(false);
			}
		};

		loadLogsByMonth();
		return () => {
			alive = false;
		};
	}, [filterMonth]);

	// =========================
	// EFFECT 3: Normalizar records (cuando ya tengo pinToInfo + rawLogs)
	// =========================
	useEffect(() => {
		const normalized: AttendanceRecord[] = rawLogs
			.map((r: any) => {
				const pin = String(r.pin || '').trim();
				const ts = r.timestamp;
				if (!pin || !ts) return null;

				return {
					pin,
					name: pinToInfo[pin]?.name ?? 'Desconocido',
					date: getLocalDateString(parseLocalTimestamp(ts)),
				};
			})
			.filter(Boolean) as AttendanceRecord[];

		setRecords(normalized);

		// lista de personas
		const unique = [
			...new Set(
				normalized.map((r) => r.name).filter((n) => n !== 'Desconocido')
			),
		];
		setPeople(unique);

		// No resetees si ya hay seleccionado
		setSelectedPerson((prev) => prev || unique[0] || '');
	}, [rawLogs, pinToInfo]);

	// =========================
	// Filtrados (memo)
	// =========================
	const departamentos = useMemo(() => {
		return [
			'Todos',
			...new Set(Object.values(pinToInfo).map((p) => p.departamento)),
		];
	}, [pinToInfo]);

	const horarios = useMemo(() => {
		return [
			'Todos',
			...new Set(
				Object.values(pinToInfo).map(
					(p) => `${p.horarioEntrada} - ${p.horarioSalida}`
				)
			),
		];
	}, [pinToInfo]);

	const filteredPeople = useMemo(() => {
		return people.filter((personName) => {
			const personPin = Object.keys(pinToInfo).find(
				(pin) => pinToInfo[pin].name === personName
			);
			if (!personPin) return false;

			const info = pinToInfo[personPin];
			const matchDept =
				selectedDepartamento === 'Todos' ||
				info.departamento === selectedDepartamento;
			const matchSchedule =
				selectedHorario === 'Todos' ||
				`${info.horarioEntrada} - ${info.horarioSalida}` === selectedHorario;

			return matchDept && matchSchedule;
		});
	}, [people, pinToInfo, selectedDepartamento, selectedHorario]);

	// Si estás en vista individual y el seleccionado ya no existe, ajusta
	useEffect(() => {
		if (viewType !== 'individual') return;
		if (!selectedPerson) return;
		if (filteredPeople.includes(selectedPerson)) return;

		setSelectedPerson(filteredPeople[0] || '');
	}, [viewType, filteredPeople, selectedPerson]);

	// =========================
	// EFFECT 4: Procesar por día
	// =========================
	useEffect(() => {
		if (!rawLogs.length || !Object.keys(pinToInfo).length) {
			setProcessedByDay([]);
			return;
		}

		if (viewType === 'individual' && selectedPerson) {
			const personPin = Object.keys(pinToInfo).find(
				(pin) => pinToInfo[pin].name === selectedPerson
			);
			const personInfo = personPin ? pinToInfo[personPin] : undefined;
			if (!personInfo) return;

			const grouped: Record<string, string[]> = {};

			rawLogs.forEach((r) => {
				const pin = String(r.pin || r.PIN || '').trim();
				const ts = r.timestamp || r.Timestamp;
				if (!pin || !ts) return;
				if (pinToInfo[pin]?.name !== selectedPerson) return;

				const date = getLocalDateString(parseLocalTimestamp(ts));
				if (!grouped[date]) grouped[date] = [];
				grouped[date].push(ts);
			});

			const rows = Object.values(grouped).map((timestamps) =>
				processDayRecords(timestamps, personInfo)
			);

			rows.sort((a, b) => b.date.localeCompare(a.date));
			setProcessedByDay(rows);
			return;
		}

		// Department view
		const allRecords: DayAttendance[] = [];

		Object.keys(pinToInfo).forEach((pin) => {
			const personInfo = pinToInfo[pin];

			const matchDept =
				selectedDepartamento === 'Todos' ||
				personInfo.departamento === selectedDepartamento;

			const matchSchedule =
				selectedHorario === 'Todos' ||
				`${personInfo.horarioEntrada} - ${personInfo.horarioSalida}` ===
					selectedHorario;

			if (!matchDept || !matchSchedule) return;

			const grouped: Record<string, string[]> = {};

			rawLogs.forEach((r) => {
				const logPin = String(r.pin || r.PIN || '').trim();
				const ts = r.timestamp || r.Timestamp;
				if (!logPin || !ts) return;
				if (logPin !== pin) return;

				const date = getLocalDateString(parseLocalTimestamp(ts));
				if (!grouped[date]) grouped[date] = [];
				grouped[date].push(ts);
			});

			Object.values(grouped).forEach((timestamps) => {
				allRecords.push(processDayRecords(timestamps, personInfo));
			});
		});

		allRecords.sort((a, b) => {
			const dateCompare = b.date.localeCompare(a.date);
			if (dateCompare !== 0) return dateCompare;
			return a.name.localeCompare(b.name);
		});

		setProcessedByDay(allRecords);
	}, [
		selectedPerson,
		rawLogs,
		pinToInfo,
		viewType,
		selectedDepartamento,
		selectedHorario,
	]);

	// =========================
	// Filtrar por mes (frontend)
	// =========================
	const filteredByMonth = useMemo(() => {
		return processedByDay.filter((d) => d.date.startsWith(filterMonth));
	}, [processedByDay, filterMonth]);

	const stats = useMemo(() => {
		return {
			total: filteredByMonth.length,
			onTime: filteredByMonth.filter((d) => !d.isLate).length,
			late: filteredByMonth.filter((d) => d.isLate).length,
			alerts: filteredByMonth.filter((d) => d.wtf).length,
		};
	}, [filteredByMonth]);

	const currentPersonInfo =
		viewType === 'individual'
			? Object.values(pinToInfo).find((p) => p.name === selectedPerson)
			: undefined;

	const isLoading = isLoadingCsv || isLoadingLogs;

	// =========================
	// UI
	// =========================
	return (
		<div className='min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black'>
			{/* Header con botón de regreso */}
			<div className='sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 py-4'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => window.history.back()}
							className='p-2 hover:bg-neutral-800 rounded-lg transition-all group'
							aria-label='Regresar'>
							<ArrowLeft
								className='text-neutral-400 group-hover:text-white transition-colors'
								size={24}
							/>
						</button>
						<div className='flex-1'>
							<h1 className='text-2xl sm:text-3xl font-bold text-white'>
								Mariana Distribuciones
							</h1>
							<p className='text-sm text-neutral-400 mt-0.5'>
								Monitoreo y control de entradas y salidas
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6'>
				{/* Estado de carga / error */}
				{(isLoading || apiError) && (
					<div className='bg-neutral-900 rounded-xl border border-neutral-800 p-4'>
						{isLoading && (
							<div className='text-neutral-300 flex items-center gap-2 text-sm'>
								<Clock size={18} className='text-red-500 animate-pulse' />
								Cargando datos {isLoadingCsv ? '(CSV)' : ''}{' '}
								{isLoadingLogs ? '(Logs)' : ''}...
							</div>
						)}
						{apiError && (
							<div className='text-red-400 flex items-center gap-2 mt-2 text-sm'>
								<AlertTriangle size={18} className='text-red-500' />
								{apiError}
							</div>
						)}
					</div>
				)}

				{/* View Type Toggle */}
				<div className='bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-6'>
					<div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4'>
						<div className='flex items-center gap-2 text-neutral-300 font-medium'>
							<Filter className='text-red-500' size={20} />
							<span className='text-sm sm:text-base'>Tipo de Vista:</span>
						</div>
						<div className='flex gap-2'>
							<button
								onClick={() => setViewType('department')}
								className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${
									viewType === 'department'
										? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
										: 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
								}`}>
								<Building2 size={18} />
								<span>Departamento</span>
							</button>
							<button
								onClick={() => setViewType('individual')}
								className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${
									viewType === 'individual'
										? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
										: 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
								}`}>
								<Users size={18} />
								<span>Individual</span>
							</button>
						</div>
					</div>

					{/* Filters Grid */}
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
						{/* Department Filter */}
						<div>
							<label className='block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2'>
								<Building2 size={16} className='text-red-500' />
								Departamento
							</label>
							<select
								value={selectedDepartamento}
								onChange={(e) => {
									setSelectedDepartamento(e.target.value);
									// Auto-reset persona cuando cambia departamento
									if (viewType === 'individual' && filteredPeople.length > 0) {
										setSelectedPerson(filteredPeople[0]);
									}
								}}
								className='w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all'>
								{departamentos.map((d) => (
									<option key={d} value={d}>
										{d}
									</option>
								))}
							</select>
						</div>

						{/* Schedule Filter */}
						<div>
							<label className='block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2'>
								<Clock size={16} className='text-red-500' />
								Horario
							</label>
							<select
								value={selectedHorario}
								onChange={(e) => {
									setSelectedHorario(e.target.value);
									// Auto-reset persona cuando cambia horario
									if (viewType === 'individual' && filteredPeople.length > 0) {
										setSelectedPerson(filteredPeople[0]);
									}
								}}
								className='w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all'>
								{horarios.map((h) => (
									<option key={h} value={h}>
										{h}
									</option>
								))}
							</select>
						</div>

						{/* Person Selector - Only visible in individual view */}
						{viewType === 'individual' && (
							<div>
								<label className='block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2'>
									<Users size={16} className='text-red-500' />
									Empleado
								</label>
								<select
									value={selectedPerson}
									onChange={(e) => setSelectedPerson(e.target.value)}
									className='w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all'>
									{filteredPeople.map((p) => (
										<option key={p} value={p}>
											{p}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Month Filter */}
						<div>
							<label className='block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2'>
								<Calendar size={16} className='text-red-500' />
								Mes
							</label>
							<input
								type='month'
								value={filterMonth}
								onChange={(e) => setFilterMonth(e.target.value)}
								className='w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all'
							/>
						</div>
					</div>
				</div>

				{/* Employee Info Card - Only for individual view */}
				{viewType === 'individual' && currentPersonInfo && (
					<div className='bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-xl border border-neutral-800 p-4 sm:p-6'>
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
							<div>
								<p className='text-neutral-400 text-xs mb-1'>Empleado</p>
								<p className='text-white font-semibold text-sm'>
									{currentPersonInfo.name}
								</p>
							</div>
							<div>
								<p className='text-neutral-400 text-xs mb-1 flex items-center gap-1'>
									<Briefcase size={14} className='text-red-500' />
									Puesto
								</p>
								<p className='text-white font-medium text-sm'>
									{currentPersonInfo.puesto}
								</p>
							</div>
							<div>
								<p className='text-neutral-400 text-xs mb-1 flex items-center gap-1'>
									<Building2 size={14} className='text-red-500' />
									Departamento
								</p>
								<p className='text-white font-medium text-sm'>
									{currentPersonInfo.departamento}
								</p>
							</div>
							<div>
								<p className='text-neutral-400 text-xs mb-1 flex items-center gap-1'>
									<Clock size={14} className='text-red-500' />
									Horario
								</p>
								<p className='text-white font-medium text-sm'>
									{currentPersonInfo.horarioEntrada} -{' '}
									{currentPersonInfo.horarioSalida}
								</p>
							</div>
							<div>
								<p className='text-neutral-400 text-xs mb-1'>
									Tolerancia / Comida
								</p>
								<p className='text-white font-medium text-sm'>
									{currentPersonInfo.tolerancia} min /{' '}
									{currentPersonInfo.tiempoComida}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Stats Cards */}
				<div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
					<div className='bg-neutral-900 rounded-xl border border-neutral-800 p-3 sm:p-5 hover:border-neutral-700 transition-all'>
						<div className='flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0'>
							<div className='text-center sm:text-left'>
								<p className='text-neutral-400 text-xs mb-1 hidden sm:block'>
									Total Registros
								</p>
								<p className='text-xl sm:text-3xl font-bold text-white'>
									{stats.total}
								</p>
							</div>
							<div className='p-2 sm:p-3 bg-neutral-800 rounded-lg'>
								<Calendar className='text-neutral-400' size={18} />
							</div>
						</div>
					</div>

					<div className='bg-neutral-900 rounded-xl border border-emerald-900/50 p-3 sm:p-5 hover:border-emerald-700/50 transition-all'>
						<div className='flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0'>
							<div className='text-center sm:text-left'>
								<p className='text-neutral-400 text-xs mb-1 hidden sm:block'>
									A Tiempo
								</p>
								<p className='text-xl sm:text-3xl font-bold text-emerald-400'>
									{stats.onTime}
								</p>
							</div>
							<div className='p-2 sm:p-3 bg-emerald-900/20 rounded-lg'>
								<CheckCircle className='text-emerald-400' size={18} />
							</div>
						</div>
					</div>

					<div className='bg-neutral-900 rounded-xl border border-yellow-900/50 p-3 sm:p-5 hover:border-yellow-700/50 transition-all'>
						<div className='flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0'>
							<div className='text-center sm:text-left'>
								<p className='text-neutral-400 text-xs mb-1 hidden sm:block'>
									Retardos
								</p>
								<p className='text-xl sm:text-3xl font-bold text-yellow-400'>
									{stats.late}
								</p>
							</div>
							<div className='p-2 sm:p-3 bg-yellow-900/20 rounded-lg'>
								<Clock className='text-yellow-400' size={18} />
							</div>
						</div>
					</div>

					<div className='bg-neutral-900 rounded-xl border border-red-900/50 p-3 sm:p-5 hover:border-red-700/50 transition-all'>
						<div className='flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0'>
							<div className='text-center sm:text-left'>
								<p className='text-neutral-400 text-xs mb-1 hidden sm:block'>
									Alertas
								</p>
								<p className='text-xl sm:text-3xl font-bold text-red-400'>
									{stats.alerts}
								</p>
							</div>
							<div className='p-2 sm:p-3 bg-red-900/20 rounded-lg'>
								<AlertTriangle className='text-red-400' size={18} />
							</div>
						</div>
					</div>
				</div>

				{/* List View */}
				{viewMode === 'list' && (
					<div className='bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl'>
						{/* Table Header - Desktop */}
						<div className='hidden lg:block'>
							<div
								className={`grid ${
									viewType === 'department' ? 'grid-cols-9' : 'grid-cols-7'
								} px-6 py-4 bg-black text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800`}>
								<span>Fecha</span>
								{viewType === 'department' && (
									<>
										<span>Nombre</span>
										<span>Puesto</span>
									</>
								)}
								<span>Entrada Real</span>
								<span>Entrada Prog.</span>
								<span>Salida Real</span>
								<span>Salida Prog.</span>
								<span>Estado</span>
								<span className='text-center'>Alertas</span>
							</div>
						</div>

						{/* Table Body */}
						<div className='max-h-[600px] overflow-y-auto'>
							{filteredByMonth.length === 0 && (
								<div className='text-center text-neutral-400 py-12'>
									<XCircle className='mx-auto mb-3 opacity-50' size={48} />
									<p className='text-lg'>
										{isLoadingLogs
											? 'Cargando registros...'
											: 'Sin registros para este mes'}
									</p>
								</div>
							)}

							{filteredByMonth.map((d, idx) => (
								<div key={`${d.date}-${d.name}-${idx}`}>
									{/* Desktop View */}
									<div
										className={`hidden lg:grid ${
											viewType === 'department' ? 'grid-cols-9' : 'grid-cols-7'
										} px-6 py-4 text-sm border-b border-neutral-800 transition-colors ${
											d.isLate
												? 'bg-yellow-900/10 hover:bg-yellow-900/20 border-l-4 border-l-yellow-500'
												: 'hover:bg-neutral-800/50'
										}`}>
										<span className='font-medium text-neutral-200'>
											{new Date(d.date + 'T12:00:00').toLocaleDateString(
												'es-MX',
												{
													day: '2-digit',
													month: 'short',
												}
											)}
										</span>

										{viewType === 'department' && (
											<>
												<span className='font-semibold text-white'>
													{d.name}
												</span>
												<span className='text-neutral-400 text-xs'>
													{d.puesto}
												</span>
											</>
										)}

										<span
											className={`font-mono font-semibold ${
												d.isLate ? 'text-yellow-400' : 'text-emerald-400'
											}`}>
											{d.entry ?? '—'}
										</span>
										<span className='font-mono text-neutral-400'>
											{d.scheduledEntry ?? '—'}
										</span>
										<span className='font-mono text-blue-400'>
											{d.exit ?? '—'}
										</span>
										<span className='font-mono text-neutral-400'>
											{d.scheduledExit ?? '—'}
										</span>

										<div className='flex items-center gap-2'>
											{d.isLate ? (
												<>
													<Clock className='text-yellow-400' size={16} />
													<span className='text-yellow-400 font-semibold'>
														Retardo
													</span>
												</>
											) : (
												<>
													<CheckCircle className='text-emerald-400' size={16} />
													<span className='text-emerald-400 font-semibold'>
														A tiempo
													</span>
												</>
											)}
										</div>

										<div className='flex justify-center'>
											{d.wtf && (
												<div className='flex items-center gap-1 px-3 py-1 bg-red-900/30 border border-red-700 rounded-full'>
													<AlertTriangle className='text-red-400' size={14} />
													<span className='text-red-400 text-xs font-bold'>
														Múltiples
													</span>
												</div>
											)}
										</div>
									</div>

									{/* Mobile View */}
									<div
										className={`lg:hidden border-b border-neutral-800 p-4 transition-colors ${
											d.isLate
												? 'bg-yellow-900/10 hover:bg-yellow-900/20 border-l-4 border-l-yellow-500'
												: 'hover:bg-neutral-800/50'
										}`}>
										<div className='flex justify-between items-start mb-3'>
											<div>
												<p className='font-semibold text-white text-base'>
													{viewType === 'department'
														? d.name
														: new Date(d.date + 'T12:00:00').toLocaleDateString(
																'es-MX',
																{
																	day: '2-digit',
																	month: 'short',
																	year: 'numeric',
																}
														  )}
												</p>
												{viewType === 'department' && (
													<p className='text-neutral-400 text-xs mt-0.5'>
														{d.puesto}
													</p>
												)}
											</div>
											<div className='flex items-center gap-2'>
												{d.isLate ? (
													<span className='px-2 py-1 bg-yellow-900/30 border border-yellow-600 rounded-full text-yellow-400 text-xs font-semibold flex items-center gap-1'>
														<Clock size={12} />
														Retardo
													</span>
												) : (
													<span className='px-2 py-1 bg-emerald-900/30 border border-emerald-700 rounded-full text-emerald-400 text-xs font-semibold flex items-center gap-1'>
														<CheckCircle size={12} />A tiempo
													</span>
												)}
											</div>
										</div>

										<div className='grid grid-cols-2 gap-3 text-sm'>
											<div>
												<p className='text-neutral-400 text-xs mb-1'>Entrada</p>
												<p
													className={`font-mono font-semibold ${
														d.isLate ? 'text-yellow-400' : 'text-emerald-400'
													}`}>
													{d.entry ?? '—'}
												</p>
												<p className='font-mono text-neutral-500 text-xs'>
													({d.scheduledEntry ?? '—'})
												</p>
											</div>
											<div>
												<p className='text-neutral-400 text-xs mb-1'>Salida</p>
												<p className='font-mono text-blue-400'>
													{d.exit ?? '—'}
												</p>
												<p className='font-mono text-neutral-500 text-xs'>
													({d.scheduledExit ?? '—'})
												</p>
											</div>
										</div>

										{d.wtf && (
											<div className='mt-3 flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg'>
												<AlertTriangle className='text-red-400' size={14} />
												<span className='text-red-400 text-xs font-bold'>
													Múltiples registros detectados
												</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
