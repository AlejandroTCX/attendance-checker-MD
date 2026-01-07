'use client';
import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Building2,
  Calendar,
  BarChart3,
  PieChart,
  ArrowRight,
  FileText,
  Settings
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import React from 'react';

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

interface PersonInfo {
  name: string;
  puesto: string;
  departamento: string;
  horarioEntrada: string;
  horarioSalida: string;
  tolerancia: number;
}

interface AttendanceLog {
  pin: string;
  timestamp: string;
}

export default function Dashboard() {
  const [pinToInfo, setPinToInfo] = useState<Record<string, PersonInfo>>({});
  const [rawLogs, setRawLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  function parseTolerancia(tolStr: string): number {
    const match = tolStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 19;
  }

  function parseTimeToMinutes(timeStr: string): number {
    const [hh, mm] = timeStr.split(':').map(Number);
    return hh * 60 + mm;
  }

  function getLocalDateString(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  useEffect(() => {
    const load = async () => {
      try {
        const peopleCsv = await fetch('/data/Checador horarios.csv').then(r => r.text());
        const peopleData = await parseCSV<PersonRecord>(peopleCsv);

        const map: Record<string, PersonInfo> = {};
        peopleData.forEach(p => {
          if (p.PIN && p.NAME) {
            map[p.PIN.trim()] = {
              name: p.NAME.trim(),
              puesto: p.Puesto?.trim() || 'N/A',
              departamento: p.Departamento?.trim() || 'N/A',
              horarioEntrada: p.Entrada?.trim() || '09:00',
              horarioSalida: p.Salida?.trim() || '18:00',
              tolerancia: parseTolerancia(p.Tolerancia || '19 min'),
            };
          }
        });

        const logCsv = await fetch('/data/attendance_log_simple.csv').then(r => r.text());
        const logData = await parseCSV<any>(logCsv);

        const logs: AttendanceLog[] = logData.map(r => ({
          pin: String(r.pin || r.PIN || '').trim(),
          timestamp: r.timestamp || r.Timestamp,
        })).filter(l => l.pin && l.timestamp);

        setPinToInfo(map);
        setRawLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    load();
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (loading) return null;

    const filteredLogs = rawLogs.filter(log => {
      const date = getLocalDateString(parseLocalTimestamp(log.timestamp));
      return date.startsWith(selectedMonth);
    });

    // Group by person and date
    const personDays: Record<string, Record<string, string[]>> = {};
    
    filteredLogs.forEach(log => {
      const personInfo = pinToInfo[log.pin];
      if (!personInfo) return;

      const date = getLocalDateString(parseLocalTimestamp(log.timestamp));
      
      if (!personDays[log.pin]) personDays[log.pin] = {};
      if (!personDays[log.pin][date]) personDays[log.pin][date] = [];
      personDays[log.pin][date].push(log.timestamp);
    });

    let totalDays = 0;
    let onTimeDays = 0;
    let lateDays = 0;
    let multipleEntries = 0;

    const departmentStats: Record<string, { total: number; onTime: number; late: number }> = {};

    Object.keys(personDays).forEach(pin => {
      const personInfo = pinToInfo[pin];
      if (!personInfo) return;

      const dept = personInfo.departamento;
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, onTime: 0, late: 0 };
      }

      Object.values(personDays[pin]).forEach(timestamps => {
        totalDays++;
        departmentStats[dept].total++;

        const sorted = timestamps
          .map(t => parseLocalTimestamp(t))
          .sort((a, b) => a.getTime() - b.getTime());

        const entry = sorted[0];
        const entryMinutes = entry.getHours() * 60 + entry.getMinutes();
        const scheduledEntry = parseTimeToMinutes(personInfo.horarioEntrada);
        const isLate = entryMinutes > scheduledEntry + personInfo.tolerancia;

        if (isLate) {
          lateDays++;
          departmentStats[dept].late++;
        } else {
          onTimeDays++;
          departmentStats[dept].onTime++;
        }

        if (sorted.length > 2) {
          multipleEntries++;
        }
      });
    });

    const uniquePeople = new Set(Object.keys(personDays)).size;
    const punctualityRate = totalDays > 0 ? ((onTimeDays / totalDays) * 100).toFixed(1) : '0';

    // Department data for charts
    const deptChartData = Object.entries(departmentStats).map(([dept, stats]) => ({
      departamento: dept,
      'A Tiempo': stats.onTime,
      'Retardos': stats.late,
    }));

    const pieData = [
      { name: 'A Tiempo', value: onTimeDays, color: '#34d399' },
      { name: 'Retardos', value: lateDays, color: '#fbbf24' },
    ];

    return {
      totalDays,
      onTimeDays,
      lateDays,
      multipleEntries,
      uniquePeople,
      punctualityRate,
      deptChartData,
      pieData,
      totalEmployees: Object.keys(pinToInfo).length,
    };
  }, [rawLogs, pinToInfo, selectedMonth, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Dashboard de Asistencia
          </h1>
          <p className="text-slate-400">Estadísticas generales del sistema</p>
        </div>

        {/* Navigation Carousel */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <a 
            href="/calendar"
            className="group flex items-center gap-3 px-5 py-3 bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center group-hover:bg-red-500/20 transition-all duration-300">
              <Calendar className="text-red-400" size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              Calendario
            </span>
            <ArrowRight className="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300" size={14} strokeWidth={2} />
          </a>

          <a 
            href="/reports"
            className="group flex items-center gap-3 px-5 py-3 bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-all duration-300">
              <FileText className="text-blue-400" size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              Reportes
            </span>
            <ArrowRight className="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300" size={14} strokeWidth={2} />
          </a>

          <a 
            href="/settings"
            className="group flex items-center gap-3 px-5 py-3 bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:bg-purple-500/20 transition-all duration-300">
              <Settings className="text-purple-400" size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              Configuración
            </span>
            <ArrowRight className="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300" size={14} strokeWidth={2} />
          </a>

          <a 
            href="/analytics"
            className="group flex items-center gap-3 px-5 py-3 bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 cursor-pointer whitespace-nowrap"
          >
            <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:bg-emerald-500/20 transition-all duration-300">
              <BarChart3 className="text-emerald-400" size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              Analíticas
            </span>
            <ArrowRight className="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300" size={14} strokeWidth={2} />
          </a>
        </div>

        {/* Month Selector */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="text-slate-400" size={20} />
            <label className="text-slate-300 font-medium">Período:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Employees */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 backdrop-blur-sm rounded-2xl border border-blue-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-700/20 rounded-lg">
                <Users className="text-blue-400" size={28} />
              </div>
              <div className="text-right">
                <p className="text-blue-300 text-sm mb-1">Total Empleados</p>
                <p className="text-4xl font-bold text-white">{stats?.totalEmployees || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-300 text-sm">
              <Users size={14} />
              <span>Registrados en el sistema</span>
            </div>
          </div>

          {/* Active Employees */}
          <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 backdrop-blur-sm rounded-2xl border border-emerald-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-700/20 rounded-lg">
                <CheckCircle className="text-emerald-400" size={28} />
              </div>
              <div className="text-right">
                <p className="text-emerald-300 text-sm mb-1">Empleados Activos</p>
                <p className="text-4xl font-bold text-white">{stats?.uniquePeople || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-300 text-sm">
              <TrendingUp size={14} />
              <span>Con registros este mes</span>
            </div>
          </div>

          {/* Punctuality Rate */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 backdrop-blur-sm rounded-2xl border border-purple-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-700/20 rounded-lg">
                <TrendingUp className="text-purple-400" size={28} />
              </div>
              <div className="text-right">
                <p className="text-purple-300 text-sm mb-1">Puntualidad</p>
                <p className="text-4xl font-bold text-white">{stats?.punctualityRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-300 text-sm">
              <BarChart3 size={14} />
              <span>Tasa de puntualidad</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 backdrop-blur-sm rounded-2xl border border-red-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-700/20 rounded-lg">
                <AlertTriangle className="text-red-400" size={28} />
              </div>
              <div className="text-right">
                <p className="text-red-300 text-sm mb-1">Alertas</p>
                <p className="text-4xl font-bold text-white">{stats?.multipleEntries || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-red-300 text-sm">
              <AlertTriangle size={14} />
              <span>Registros múltiples</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-slate-400" size={20} />
              <p className="text-slate-300 font-medium">Total de Registros</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.totalDays || 0}</p>
            <p className="text-slate-400 text-sm mt-1">Días registrados este mes</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-emerald-700/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-emerald-400" size={20} />
              <p className="text-slate-300 font-medium">A Tiempo</p>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{stats?.onTimeDays || 0}</p>
            <p className="text-slate-400 text-sm mt-1">Registros puntuales</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-yellow-700/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-yellow-400" size={20} />
              <p className="text-slate-300 font-medium">Retardos</p>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats?.lateDays || 0}</p>
            <p className="text-slate-400 text-sm mt-1">Llegadas tarde</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - By Department */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="text-slate-400" size={24} />
              <h2 className="text-xl font-bold text-white">Asistencia por Departamento</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.deptChartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="departamento" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="A Tiempo" fill="#34d399" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Retardos" fill="#fbbf24" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Overall Distribution */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="text-slate-400" size={24} />
              <h2 className="text-xl font-bold text-white">Distribución General</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={stats?.pieData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}