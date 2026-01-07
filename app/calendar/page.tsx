'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, List, Clock, AlertTriangle, CheckCircle, XCircle, Users, Building2, Briefcase, Filter } from 'lucide-react';

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
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [pinToInfo, setPinToInfo] = useState<Record<string, PersonInfo>>({});
  const [people, setPeople] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [processedByDay, setProcessedByDay] = useState<DayAttendance[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('Todos');
  const [selectedHorario, setSelectedHorario] = useState<string>('Todos');
  const [viewType, setViewType] = useState<'individual' | 'department'>('department');

  function parseLocalTimestamp(ts: string): Date {
    const clean = ts.replace('T', ' ').replace('Z', '');
    const [datePart, timePart] = clean.split(' ');
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

  function processDayRecords(timestamps: string[], personInfo: PersonInfo): DayAttendance {
    const ENTRY_TIME = parseTimeToMinutes(personInfo.horarioEntrada);
    const TOLERANCE = personInfo.tolerancia;

    const sorted = timestamps
      .map(t => parseLocalTimestamp(t))
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

  useEffect(() => {
    const load = async () => {
      const peopleCsv = await fetch('/data/Checador horarios.csv').then(r => r.text());
      const peopleData = await parseCSV<PersonRecord>(peopleCsv);

      const map: Record<string, PersonInfo> = {};
      peopleData.forEach(p => {
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

      const logCsv = await fetch('/data/attendance_log_simple.csv').then(r => r.text());
      const logData = await parseCSV<any>(logCsv);

      const normalized: AttendanceRecord[] = logData.map(r => {
        const pin = String(r.pin || r.PIN || '').trim();
        const ts = r.timestamp || r.Timestamp;
        if (!pin || !ts) return null;
        return {
          pin,
          name: map[pin]?.name ?? 'Desconocido',
          date: getLocalDateString(new Date(ts)),
        };
      }).filter(Boolean) as AttendanceRecord[];

      setPinToInfo(map);
      setRawLogs(logData);
      setRecords(normalized);

      const unique = [...new Set(normalized.map(r => r.name).filter(n => n !== 'Desconocido'))];
      setPeople(unique);
      setSelectedPerson(unique[0] || '');
    };

    load();
  }, []);

  useEffect(() => {
    if (viewType === 'individual' && selectedPerson) {
      // Individual person view
      const personPin = Object.keys(pinToInfo).find(
        pin => pinToInfo[pin].name === selectedPerson
      );
      const personInfo = personPin ? pinToInfo[personPin] : undefined;

      if (!personInfo) return;

      const grouped: Record<string, string[]> = {};

      rawLogs.forEach(r => {
        const pin = String(r.pin || r.PIN || '').trim();
        const ts = r.timestamp || r.Timestamp;
        if (!pin || !ts) return;
        if (pinToInfo[pin]?.name !== selectedPerson) return;

        const date = getLocalDateString(parseLocalTimestamp(ts));

        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(ts);
      });

      setProcessedByDay(
        Object.values(grouped).map(timestamps => processDayRecords(timestamps, personInfo))
      );
    } else {
      // Department view - all people in selected department and schedule
      const allRecords: DayAttendance[] = [];

      Object.keys(pinToInfo).forEach(pin => {
        const personInfo = pinToInfo[pin];
        
        // Apply filters
        const matchDept = selectedDepartamento === 'Todos' || personInfo.departamento === selectedDepartamento;
        const matchSchedule = selectedHorario === 'Todos' || `${personInfo.horarioEntrada} - ${personInfo.horarioSalida}` === selectedHorario;
        
        if (!matchDept || !matchSchedule) return;

        // Group timestamps for this person
        const grouped: Record<string, string[]> = {};

        rawLogs.forEach(r => {
          const logPin = String(r.pin || r.PIN || '').trim();
          const ts = r.timestamp || r.Timestamp;
          if (!logPin || !ts) return;
          if (logPin !== pin) return;

          const date = getLocalDateString(parseLocalTimestamp(ts));

          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(ts);
        });

        // Process records for this person
        Object.values(grouped).forEach(timestamps => {
          allRecords.push(processDayRecords(timestamps, personInfo));
        });
      });

      // Sort by date and name
      allRecords.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.name.localeCompare(b.name);
      });

      setProcessedByDay(allRecords);
    }
  }, [selectedPerson, rawLogs, pinToInfo, viewType, selectedDepartamento, selectedHorario]);

  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredByMonth = processedByDay.filter(d =>
    d.date.startsWith(filterMonth)
  );

  const stats = {
    total: filteredByMonth.length,
    onTime: filteredByMonth.filter(d => !d.isLate).length,
    late: filteredByMonth.filter(d => d.isLate).length,
    alerts: filteredByMonth.filter(d => d.wtf).length,
  };

  // Get unique departments and schedules
  const departamentos = ['Todos', ...new Set(Object.values(pinToInfo).map(p => p.departamento))];
  const horarios = ['Todos', ...new Set(Object.values(pinToInfo).map(p => `${p.horarioEntrada} - ${p.horarioSalida}`))];

  // Filter people by department and schedule
  const filteredPeople = people.filter(personName => {
    const personPin = Object.keys(pinToInfo).find(pin => pinToInfo[pin].name === personName);
    if (!personPin) return false;
    
    const info = pinToInfo[personPin];
    const matchDept = selectedDepartamento === 'Todos' || info.departamento === selectedDepartamento;
    const matchSchedule = selectedHorario === 'Todos' || `${info.horarioEntrada} - ${info.horarioSalida}` === selectedHorario;
    
    return matchDept && matchSchedule;
  });

  const currentPersonInfo = viewType === 'individual' 
    ? Object.values(pinToInfo).find(p => p.name === selectedPerson)
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Mariana Distribuciones
          </h1>
          <p className="text-slate-400">Monitoreo y control de entradas y salidas</p>
        </div>

        {/* View Type Toggle */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="text-slate-400" size={20} />
            <span className="text-slate-300 font-medium">Tipo de Vista:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewType('department')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewType === 'department'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Building2 size={18} />
                Por Departamento
              </button>
              <button
                onClick={() => setViewType('individual')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewType === 'individual'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Users size={18} />
                Individual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Building2 size={16} />
                Departamento
              </label>
              <select
                value={selectedDepartamento}
                onChange={e => setSelectedDepartamento(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              >
                {departamentos.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Schedule Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Clock size={16} />
                Horario
              </label>
              <select
                value={selectedHorario}
                onChange={e => setSelectedHorario(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              >
                {horarios.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>

            {/* Person Selector - Only visible in individual view */}
            {viewType === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Empleado
                </label>
                <select
                  value={selectedPerson}
                  onChange={e => setSelectedPerson(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  {filteredPeople.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Mes
              </label>
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Employee Info Card - Only for individual view */}
        {viewType === 'individual' && currentPersonInfo && (
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">Empleado</p>
                <p className="text-white font-semibold">{currentPersonInfo.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                  <Briefcase size={14} />
                  Puesto
                </p>
                <p className="text-white font-medium">{currentPersonInfo.puesto}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                  <Building2 size={14} />
                  Departamento
                </p>
                <p className="text-white font-medium">{currentPersonInfo.departamento}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                  <Clock size={14} />
                  Horario
                </p>
                <p className="text-white font-medium">{currentPersonInfo.horarioEntrada} - {currentPersonInfo.horarioSalida}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Tolerancia / Comida</p>
                <p className="text-white font-medium">{currentPersonInfo.tolerancia} min / {currentPersonInfo.tiempoComida}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Registros</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <Calendar className="text-slate-300" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-emerald-700/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">A Tiempo</p>
                <p className="text-3xl font-bold text-emerald-400">{stats.onTime}</p>
              </div>
              <div className="p-3 bg-emerald-700/20 rounded-lg">
                <CheckCircle className="text-emerald-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-yellow-700/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Retardos</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.late}</p>
              </div>
              <div className="p-3 bg-yellow-700/20 rounded-lg">
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-red-700/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Alertas</p>
                <p className="text-3xl font-bold text-red-400">{stats.alerts}</p>
              </div>
              <div className="p-3 bg-red-700/20 rounded-lg">
                <AlertTriangle className="text-red-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className={`grid ${viewType === 'department' ? 'grid-cols-9' : 'grid-cols-7'} px-6 py-4 bg-slate-900/80 text-sm font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700`}>
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
              <span className="text-center">Alertas</span>
            </div>

            {/* Table Body */}
            <div className="max-h-[500px] overflow-y-auto">
              {filteredByMonth.length === 0 && (
                <div className="text-center text-slate-400 py-12">
                  <XCircle className="mx-auto mb-3 opacity-50" size={48} />
                  <p className="text-lg">Sin registros para este mes</p>
                </div>
              )}

              {filteredByMonth.map((d, idx) => {
                return (
                  <div
                    key={`${d.date}-${d.name}-${idx}`}
                    className={`grid ${viewType === 'department' ? 'grid-cols-9' : 'grid-cols-7'} px-6 py-4 text-white text-sm border-b border-slate-800 hover:bg-slate-700/30 transition-colors`}
                  >
                    {/* Fecha */}
                    <span className="font-medium text-slate-200">
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>

                    {/* Nombre y Puesto - Solo en vista de departamento */}
                    {viewType === 'department' && (
                      <>
                        <span className="font-semibold text-white">
                          {d.name}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {d.puesto}
                        </span>
                      </>
                    )}

                    {/* Entrada Real */}
                    <span className="font-mono text-emerald-400">
                      {d.entry ?? '—'}
                    </span>

                    {/* Entrada Programada */}
                    <span className="font-mono text-slate-400">
                      {d.scheduledEntry ?? '—'}
                    </span>

                    {/* Salida Real */}
                    <span className="font-mono text-blue-400">
                      {d.exit ?? '—'}
                    </span>

                    {/* Salida Programada */}
                    <span className="font-mono text-slate-400">
                      {d.scheduledExit ?? '—'}
                    </span>

                    {/* Estado */}
                    <div className="flex items-center gap-2">
                      {d.isLate ? (
                        <>
                          <Clock className="text-yellow-400" size={16} />
                          <span className="text-yellow-400 font-semibold">Retardo</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="text-emerald-400" size={16} />
                          <span className="text-emerald-400 font-semibold">A tiempo</span>
                        </>
                      )}
                    </div>

                    {/* WTF Alert */}
                    <div className="flex justify-center">
                      {d.wtf && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-red-900/30 border border-red-700 rounded-full">
                          <AlertTriangle className="text-red-400" size={14} />
                          <span className="text-red-400 text-xs font-bold">Múltiples</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}