"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
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
  Settings,
  ArrowLeft,
  UserCog,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import React from "react";
import LogoLoader from "@/components/ui/logoLoader";

interface PersonRecord {
  PIN: string;
  NAME: string;
  Puesto: string;
  Departamento: string;
  "Razón social": string;
  Entrada: string;
  Salida: string;
  Tolerancia: string;
  "Tiempo de comida": string;
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
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  function parseLocalTimestamp(ts: string): Date {
    const clean = ts.replace("T", " ").replace("Z", "");
    const [datePart, timePart] = clean.split(" ");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm, ss] = timePart.split(":").map(Number);
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
    const [hh, mm] = timeStr.split(":").map(Number);
    return hh * 60 + mm;
  }

  function getLocalDateString(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  useEffect(() => {
    const load = async () => {
      try {
        const peopleCsv = await fetch("/data/Checador horarios.csv").then((r) =>
          r.text()
        );
        const peopleData = await parseCSV<PersonRecord>(peopleCsv);

        const map: Record<string, PersonInfo> = {};
        peopleData.forEach((p) => {
          if (p.PIN && p.NAME) {
            map[p.PIN.trim()] = {
              name: p.NAME.trim(),
              puesto: p.Puesto?.trim() || "N/A",
              departamento: p.Departamento?.trim() || "N/A",
              horarioEntrada: p.Entrada?.trim() || "09:00",
              horarioSalida: p.Salida?.trim() || "18:00",
              tolerancia: parseTolerancia(p.Tolerancia || "19 min"),
            };
          }
        });

        const logCsv = await fetch("/data/attendance_log_simple.csv").then(
          (r) => r.text()
        );
        const logData = await parseCSV<any>(logCsv);

        const logs: AttendanceLog[] = logData
          .map((r) => ({
            pin: String(r.pin || r.PIN || "").trim(),
            timestamp: r.timestamp || r.Timestamp,
          }))
          .filter((l) => l.pin && l.timestamp);

        setPinToInfo(map);
        setRawLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = React.useMemo(() => {
    if (loading) return null;

    const filteredLogs = rawLogs.filter((log) => {
      const date = getLocalDateString(parseLocalTimestamp(log.timestamp));
      return date.startsWith(selectedMonth);
    });

    const personDays: Record<string, Record<string, string[]>> = {};

    filteredLogs.forEach((log) => {
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

    const departmentStats: Record<
      string,
      { total: number; onTime: number; late: number }
    > = {};

    Object.keys(personDays).forEach((pin) => {
      const personInfo = pinToInfo[pin];
      if (!personInfo) return;

      const dept = personInfo.departamento;
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, onTime: 0, late: 0 };
      }

      Object.values(personDays[pin]).forEach((timestamps) => {
        totalDays++;
        departmentStats[dept].total++;

        const sorted = timestamps
          .map((t) => parseLocalTimestamp(t))
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
    const punctualityRate =
      totalDays > 0 ? ((onTimeDays / totalDays) * 100).toFixed(1) : "0";

    const deptChartData = Object.entries(departmentStats).map(
      ([dept, stats]) => ({
        departamento: dept.length > 15 ? dept.substring(0, 12) + "..." : dept,
        "A Tiempo": stats.onTime,
        Retardos: stats.late,
      })
    );

    const pieData = [
      { name: "A Tiempo", value: onTimeDays, color: "#ffffff" },
      { name: "Retardos", value: lateDays, color: "#ef4444" },
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
    return <LogoLoader label="Cargando dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-950 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base">
                Estadísticas generales del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="mb-6 lg:mb-8">
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
            <a
              href="/calendar"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0"
            >
              <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all">
                <Calendar className="text-red-500" size={18} />
              </div>
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white">
                Calendario
              </span>
              <ArrowRight
                className="text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all"
                size={16}
              />
            </a>

            <a
              href="/personal"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0"
            >
              <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all">
                <UserCog className="text-red-500" size={18} />
              </div>
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white">
                Personal
              </span>
              <ArrowRight
                className="text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all"
                size={16}
              />
            </a>

            <a
              href="/reportes"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0"
            >
              <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all">
                <FileText className="text-red-500" size={18} />
              </div>
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white">
                Reportes
              </span>
              <ArrowRight
                className="text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all"
                size={16}
              />
            </a>

            <a
              href="/settings"
              className="group flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 backdrop-blur-sm rounded-xl border border-neutral-800 hover:bg-neutral-800 hover:border-red-600/50 transition-all shadow-lg whitespace-nowrap snap-start flex-shrink-0"
            >
              <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center group-hover:bg-red-600/30 transition-all">
                <Settings className="text-red-500" size={18} />
              </div>
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white">
                Configuración
              </span>
              <ArrowRight
                className="text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all"
                size={16}
              />
            </a>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-4 sm:p-6 mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-neutral-300 font-medium">
              <Calendar className="text-red-500" size={20} />
              <span>Período:</span>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-black/80 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Total Employees */}
          <div className="bg-gradient-to-br from-red-950/40 to-red-900/20 backdrop-blur-sm rounded-2xl border border-red-900/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-red-800/70 transition-all">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-red-600/20 rounded-xl">
                <Users className="text-red-500" size={24} />
              </div>
              <div className="text-right">
                <p className="text-red-300 text-xs sm:text-sm mb-1">
                  Total Empleados
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-red-300 text-xs sm:text-sm">
              <Users size={14} />
              <span>Registrados</span>
            </div>
          </div>

          {/* Active Employees */}
          <div className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-2xl border border-neutral-700 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-neutral-600 transition-all">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div className="text-right">
                <p className="text-neutral-300 text-xs sm:text-sm mb-1">
                  Activos
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {stats?.uniquePeople || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-300 text-xs sm:text-sm">
              <TrendingUp size={14} />
              <span>Este mes</span>
            </div>
          </div>

          {/* Punctuality Rate */}
          <div className="bg-gradient-to-br from-neutral-900/80 to-neutral-800/50 backdrop-blur-sm rounded-2xl border border-neutral-700 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-neutral-600 transition-all">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div className="text-right">
                <p className="text-neutral-300 text-xs sm:text-sm mb-1">
                  Puntualidad
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {stats?.punctualityRate}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-300 text-xs sm:text-sm">
              <BarChart3 size={14} />
              <span>Tasa general</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-gradient-to-br from-red-950/40 to-red-900/20 backdrop-blur-sm rounded-2xl border border-red-900/50 p-5 sm:p-6 shadow-xl hover:shadow-2xl hover:border-red-800/70 transition-all">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-red-600/20 rounded-xl">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div className="text-right">
                <p className="text-red-300 text-xs sm:text-sm mb-1">Alertas</p>
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {stats?.multipleEntries || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-red-300 text-xs sm:text-sm">
              <AlertTriangle size={14} />
              <span>Múltiples registros</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-5 sm:p-6 shadow-lg hover:shadow-xl hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-neutral-400" size={20} />
              <p className="text-neutral-200 font-medium text-sm sm:text-base">
                Total Registros
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {stats?.totalDays || 0}
            </p>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Días registrados
            </p>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-5 sm:p-6 shadow-lg hover:shadow-xl hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-white" size={20} />
              <p className="text-neutral-200 font-medium text-sm sm:text-base">
                A Tiempo
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {stats?.onTimeDays || 0}
            </p>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Puntuales
            </p>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-red-900/50 p-5 sm:p-6 shadow-lg hover:shadow-xl hover:border-red-800/70 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-red-500" size={20} />
              <p className="text-neutral-200 font-medium text-sm sm:text-base">
                Retardos
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-red-500">
              {stats?.lateDays || 0}
            </p>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Llegadas tarde
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Bar Chart */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Building2 className="text-red-500" size={24} />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Por Departamento
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.deptChartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis
                  dataKey="departamento"
                  stroke="#a3a3a3"
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#a3a3a3" tick={{ fill: "#a3a3a3" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ color: "#a3a3a3" }} />
                <Bar dataKey="A Tiempo" fill="#ffffff" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Retardos" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <PieChart className="text-red-500" size={24} />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Distribución General
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={stats?.pieData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
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
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "12px",
                    color: "#fff",
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
