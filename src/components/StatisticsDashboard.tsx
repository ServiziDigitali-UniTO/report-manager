import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BookingRecord } from '../types';
import { RESOURCE_CATEGORIES, categorizeResource } from '../utils/csvParser';
import { getWeeksFromRecords, formatDateItalian, formatTimeRange } from '../utils/dateUtils';
import { ResourceCategoryBadge } from './ResourceCategoryBadge';

interface StatisticsDashboardProps {
  records: BookingRecord[];
}

const COLORS = ['#3E5C4B', '#8C6849', '#5B7065', '#786C5A', '#C25948', '#4A6B62', '#B8860B'];

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ records }) => {
  // Extract dates and week presets
  const dates = useMemo(() => records.map((r) => r.dateStr).filter(Boolean), [records]);
  const weekPresets = useMemo(() => getWeeksFromRecords(dates), [dates]);
  const allResources = useMemo(() => Array.from(new Set(records.map((r) => r.resourceName))).sort(), [records]);

  // Filters State
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('all'); // 'all' or specific resource name

  // Table Search and Tabs inside Stats
  const [cancellationSearch, setCancellationSearch] = useState<string>('');
  const [cancellationReasonFilter, setCancellationReasonFilter] = useState<string>('all');
  const [tableTab, setTableTab] = useState<'cancellations' | 'allRecords'>('cancellations');

  // Handle Week Preset
  const handleWeekChange = (weekKey: string) => {
    setSelectedWeekKey(weekKey);
    if (weekKey === 'all') {
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      const preset = weekPresets.find((w) => w.key === weekKey);
      if (preset) {
        setCustomStartDate(preset.startDate);
        setCustomEndDate(preset.endDate);
      }
    }
  };

  // Filtered Records according to Period & Resource
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Filter by Resource
      if (selectedResource !== 'all' && r.resourceName !== selectedResource) {
        return false;
      }
      // Filter by Date Range
      if (customStartDate && r.dateStr < customStartDate) return false;
      if (customEndDate && r.dateStr > customEndDate) return false;

      return true;
    });
  }, [records, selectedResource, customStartDate, customEndDate]);

  // Statistical Metrics
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const activeRecords = filteredRecords.filter((r) => !r.isCancelled);
    const cancelledRecords = filteredRecords.filter((r) => r.isCancelled);

    const activeCount = activeRecords.length;
    const cancelledCount = cancelledRecords.length;
    const cancellationRate = total > 0 ? (cancelledCount / total) * 100 : 0;

    // By Actor
    const byActor = {
      user: cancelledRecords.filter((r) => r.cancelledBy === 'user').length,
      admin: cancelledRecords.filter((r) => r.cancelledBy === 'admin').length,
      system: cancelledRecords.filter((r) => r.cancelledBy === 'system').length,
      other: cancelledRecords.filter(
        (r) => !['user', 'admin', 'system'].includes(r.cancelledBy)
      ).length,
    };

    // By Reason
    const reasonMap = new Map<string, number>();
    cancelledRecords.forEach((r) => {
      const rawReason = r.cancellationReason || 'Nessuna ragione specificata';
      // Normalize common system text
      let reasonKey = rawReason;
      if (rawReason.toLowerCase().includes('durata della conferma scaduta')) {
        reasonKey = 'Durata della conferma scaduta (Mancata risposta)';
      } else if (rawReason.toLowerCase().includes('orari dell\'istituto sono stati modificati')) {
        reasonKey = 'Modifica orari istituto / chiusura straordinaria';
      } else if (rawReason.toLowerCase().includes('errore')) {
        reasonKey = 'Inserimento errato / Correzione amministrativa';
      }
      reasonMap.set(reasonKey, (reasonMap.get(reasonKey) || 0) + 1);
    });

    const reasonsList = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: cancelledCount > 0 ? Math.round((count / cancelledCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily Trend
    const dayMap = new Map<string, { dateStr: string; active: number; cancelled: number; total: number }>();
    filteredRecords.forEach((r) => {
      if (!dayMap.has(r.dateStr)) {
        dayMap.set(r.dateStr, { dateStr: r.dateStr, active: 0, cancelled: 0, total: 0 });
      }
      const entry = dayMap.get(r.dateStr)!;
      entry.total += 1;
      if (r.isCancelled) {
        entry.cancelled += 1;
      } else {
        entry.active += 1;
      }
    });

    const dailyData = Array.from(dayMap.values())
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .map((d) => ({
        ...d,
        formattedDate: formatDateItalian(d.dateStr),
      }));

    // By Resource
    const resMap = new Map<string, { total: number; active: number; cancelled: number }>();
    filteredRecords.forEach((r) => {
      if (!resMap.has(r.resourceName)) {
        resMap.set(r.resourceName, { total: 0, active: 0, cancelled: 0 });
      }
      const entry = resMap.get(r.resourceName)!;
      entry.total += 1;
      if (r.isCancelled) {
        entry.cancelled += 1;
      } else {
        entry.active += 1;
      }
    });

    const resourceData = Array.from(resMap.entries())
      .map(([resourceName, counts]) => ({
        resourceName,
        ...counts,
        cancellationRate: counts.total > 0 ? Math.round((counts.cancelled / counts.total) * 100) : 0,
      }))
      .sort((a, b) => b.cancelled - a.cancelled);

    return {
      total,
      activeCount,
      cancelledCount,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      byActor,
      reasonsList,
      dailyData,
      resourceData,
      cancelledRecords,
    };
  }, [filteredRecords]);

  // Filtered Cancelled Records for Table
  const displayCancelledRecords = useMemo(() => {
    return stats.cancelledRecords.filter((r) => {
      // Reason filter
      if (cancellationReasonFilter !== 'all') {
        if (cancellationReasonFilter === 'expired') {
          if (!r.cancellationReason.toLowerCase().includes('durata della conferma scaduta')) return false;
        } else if (cancellationReasonFilter === 'schedule_change') {
          if (!r.cancellationReason.toLowerCase().includes('orari dell\'istituto')) return false;
        } else if (cancellationReasonFilter === 'admin') {
          if (r.cancelledBy !== 'admin') return false;
        } else if (cancellationReasonFilter === 'user') {
          if (r.cancelledBy !== 'user') return false;
        }
      }

      // Search text
      if (cancellationSearch.trim()) {
        const q = cancellationSearch.toLowerCase().trim();
        const matchName = r.fullName.toLowerCase().includes(q);
        const matchEmail = r.bookedByEmail.toLowerCase().includes(q);
        const matchCode = r.bookingCode.toLowerCase().includes(q);
        const matchReason = r.cancellationReason.toLowerCase().includes(q);
        const matchMatricola = r.matricola.includes(q) || r.comments.toLowerCase().includes(q);
        return matchName || matchEmail || matchCode || matchReason || matchMatricola;
      }

      return true;
    });
  }, [stats.cancelledRecords, cancellationReasonFilter, cancellationSearch]);

  // Export Stats Table
  const handleExportCancellationsCsv = () => {
    const headers = [
      'Giorno',
      'Data',
      'Ora Inizio',
      'Risorsa',
      'Cognome e Nome',
      'Email',
      'Matricola',
      'Codice',
      'Data Cancellazione',
      'Cancellato Da',
      'Ragione Cancellazione',
    ];

    const rows = displayCancelledRecords.map((r) => [
      r.dateStr,
      formatDateItalian(r.dateStr),
      r.startTimeStr,
      `"${r.resourceName.replace(/"/g, '""')}"`,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.bookedByEmail.replace(/"/g, '""')}"`,
      `"${r.matricola || r.comments}"`,
      `"${r.bookingCode}"`,
      `"${r.cancelledAt}"`,
      `"${r.cancelledBy}"`,
      `"${r.cancellationReason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Report_Cancellazioni_Affluences.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header & Filter Window */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#3E5C4B] dark:text-[#A3C2B0]">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                Finestra Statistica e Analisi Prenotazioni
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Analisi approfondita dell'andamento dei tassi di iscrizione e delle motivazioni di cancellazione
            </p>
          </div>

          {/* Quick period summary */}
          <div className="flex items-center gap-2 text-xs bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-lg text-stone-700 dark:text-stone-300 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#3E5C4B]" />
            <span>
              Filtrato per:{' '}
              <strong>{selectedResource === 'all' ? 'Totale / Tutte le Risorse' : selectedResource}</strong>
            </span>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filter 1: Period Settimana */}
          <div className="space-y-1.5 bg-[#F2F4F1] dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label htmlFor="stats-week-select" className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#3E5C4B]" aria-hidden="true" />
                <span>Periodo di Riferimento</span>
              </label>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950/60 text-[#2C4437] dark:text-[#A3C2B0]">
                Sab &ndash; Ven
              </span>
            </div>
            <select
              id="stats-week-select"
              value={selectedWeekKey}
              onChange={(e) => handleWeekChange(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
            >
              <option value="all">Tutto il periodo in report</option>
              {weekPresets.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Custom Date Range */}
          <div className="space-y-1.5 bg-[#F2F4F1] dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#786C5A]" aria-hidden="true" />
              <span>Intervallo Date Personalizzato</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="stats-start-date" className="sr-only">
                  Data Inizio Personalizzata
                </label>
                <input
                  id="stats-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setSelectedWeekKey('custom');
                  }}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
                />
              </div>
              <div>
                <label htmlFor="stats-end-date" className="sr-only">
                  Data Fine Personalizzata
                </label>
                <input
                  id="stats-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setSelectedWeekKey('custom');
                  }}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
                />
              </div>
            </div>
          </div>

          {/* Filter 3: Single Resource or All */}
          <div className="space-y-1.5 bg-[#F2F4F1] dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <label htmlFor="stats-resource-select" className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#4A6B62]" aria-hidden="true" />
              <span>Risorsa / Turno Specifica</span>
            </label>
            <select
              id="stats-resource-select"
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
            >
              <option value="all">Totale (Tutte le Risorse e Turni)</option>
              {allResources.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Bookings */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              Prenotazioni Totali
            </span>
            <FileSpreadsheet className="w-4 h-4 text-[#3E5C4B]" />
          </div>
          <div className="text-3xl font-black text-stone-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Richieste ricevute nel periodo
          </p>
        </div>

        {/* Active Bookings */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-[#3E5C4B] dark:text-[#A3C2B0]">
            <span className="text-xs font-medium uppercase tracking-wider">
              Confermate / Valide
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-[#3E5C4B] dark:text-[#A3C2B0]">
            {stats.activeCount}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            {stats.total > 0 ? Math.round((stats.activeCount / stats.total) * 100) : 0}% tasso di partecipazione
          </p>
        </div>

        {/* Total Cancellations */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-medium uppercase tracking-wider">
              Cancellazioni Totali
            </span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-rose-700 dark:text-rose-400">
            {stats.cancelledCount}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-bold">
            {stats.cancellationRate}% tasso di cancellazione
          </p>
        </div>

        {/* Expired Confirmations */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-[#8C6849] dark:text-[#E0C8B3]">
            <span className="text-xs font-medium uppercase tracking-wider">
              Mancate Conferme
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-[#8C6849] dark:text-[#E0C8B3]">
            {stats.byActor.system}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Durata della conferma scaduta (Sistema)
          </p>
        </div>

        {/* Student vs Admin Cancellations */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-[#786C5A] dark:text-[#D1C7B8]">
            <span className="text-xs font-medium uppercase tracking-wider">
              Da Utente vs Admin
            </span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-white flex items-baseline gap-1">
            <span className="text-[#8C6849]">{stats.byActor.user}</span>
            <span className="text-xs font-normal text-stone-400">utenti</span>
            <span className="text-stone-300 mx-1">/</span>
            <span className="text-[#3E5C4B]">{stats.byActor.admin}</span>
            <span className="text-xs font-normal text-stone-400">admin</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Annullamenti volontari o amministrativi
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Daily Trend Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#3E5C4B]" />
              <span>Andamento Giornaliero: Valide vs Cancellate</span>
            </h3>
            <span className="text-xs text-stone-400">{stats.dailyData.length} giorni monitorati</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="active" name="Prenotazioni Valide" fill="#3E5C4B" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="cancelled" name="Prenotazioni Cancellate" fill="#C25948" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Reasons Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#8C6849]" />
            <span>Cause di Cancellazione</span>
          </h3>

          {stats.cancelledCount === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-stone-400">
              Nessuna cancellazione per i filtri attuali.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.reasonsList}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.reasonsList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Reason Breakdown List */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          Dettaglio e Frequenza delle Motivazioni di Annullamento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.reasonsList.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-start gap-3"
            >
              <div
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-stone-900 dark:text-white line-clamp-2">
                  {item.reason}
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  <span><strong>{item.count}</strong> casi</span>
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    {item.percentage}% del totale
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Focus: Cancellations Inspection Table & Raw CSV Inspector */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Table Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTableTab('cancellations')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                tableTab === 'cancellations'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              Focus Persone Cancellate ({displayCancelledRecords.length})
            </button>
            <button
              onClick={() => setTableTab('allRecords')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                tableTab === 'allRecords'
                  ? 'bg-[#3E5C4B] text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              Tutte le Prenotazioni CSV ({filteredRecords.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca studente, email, motivazione..."
                value={cancellationSearch}
                onChange={(e) => setCancellationSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-800 dark:text-stone-200"
              />
            </div>

            {tableTab === 'cancellations' && (
              <button
                onClick={handleExportCancellationsCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Scarica CSV Cancellati</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Cancellations Focus Table */}
        {tableTab === 'cancellations' && (
          <div className="overflow-x-auto">
            {displayCancelledRecords.length === 0 ? (
              <div className="p-12 text-center text-stone-500 dark:text-stone-400">
                <CheckCircle2 className="w-8 h-8 text-[#3E5C4B] mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">
                  Nessuna prenotazione cancellata trovata per i filtri o la ricerca selezionati.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-bold uppercase border-b border-stone-200 dark:border-stone-800">
                    <th className="py-3 px-4">Giorno e Ora</th>
                    <th className="py-3 px-4">Risorsa / Turno</th>
                    <th className="py-3 px-4">Cognome e Nome</th>
                    <th className="py-3 px-4">Matricola / Email</th>
                    <th className="py-3 px-4">Data/Ora Cancellazione</th>
                    <th className="py-3 px-4">Annullato Da</th>
                    <th className="py-3 px-4">Motivazione della Cancellazione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {displayCancelledRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-stone-900 dark:text-white">
                          {formatDateItalian(rec.dateStr)}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {formatTimeRange(rec.startTimeStr, rec.endTimeStr)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <ResourceCategoryBadge resourceName={rec.resourceName} />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-white uppercase">
                          {rec.fullName}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          Codice: {rec.bookingCode}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-stone-800 dark:text-stone-200">
                          {rec.matricola || rec.comments || '-'}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate max-w-[160px]">
                          {rec.bookedByEmail}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap">
                        {rec.cancelledAt || '-'}
                      </td>

                      <td className="py-3 px-4 uppercase font-bold text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            rec.cancelledBy === 'system'
                              ? 'bg-[#F9F3EE] text-[#5C422C] dark:bg-[#302318] dark:text-[#E0C8B3]'
                              : rec.cancelledBy === 'admin'
                              ? 'bg-[#E8EFEA] text-[#2C4437] dark:bg-[#1E2E25] dark:text-[#A3C2B0]'
                              : 'bg-[#F4F1EC] text-[#4A4135] dark:bg-[#2A261F] dark:text-[#D1C7B8]'
                          }`}
                        >
                          {rec.cancelledBy || 'utente'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-rose-700 dark:text-rose-300 font-medium">
                        {rec.cancellationReason || 'Nessuna spiegazione salvata'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: All Records CSV Grouped Table */}
        {tableTab === 'allRecords' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-bold uppercase border-b border-stone-200 dark:border-stone-800">
                  <th className="py-3 px-4">Stato</th>
                  <th className="py-3 px-4">Giorno / Data</th>
                  <th className="py-3 px-4">Orario</th>
                  <th className="py-3 px-4">Risorsa</th>
                  <th className="py-3 px-4">Studente / Email</th>
                  <th className="py-3 px-4">Matricola</th>
                  <th className="py-3 px-4">Codice</th>
                  <th className="py-3 px-4">Note / Cancellazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-stone-50 dark:hover:bg-stone-800/50 ${
                      rec.isCancelled ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      {rec.isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                          <XCircle className="w-3 h-3" /> Cancellato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EFEA] text-[#2C4437] dark:bg-[#1E2E25] dark:text-[#A3C2B0]">
                          <CheckCircle2 className="w-3 h-3" /> Valido
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                      {formatDateItalian(rec.dateStr)}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {formatTimeRange(rec.startTimeStr, rec.endTimeStr)}
                    </td>

                    <td className="py-3 px-4">
                      <ResourceCategoryBadge resourceName={rec.resourceName} />
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold uppercase text-stone-900 dark:text-white">
                        {rec.fullName}
                      </div>
                      <div className="text-[10px] text-stone-400">{rec.bookedByEmail}</div>
                    </td>

                    <td className="py-3 px-4 font-mono">{rec.matricola || rec.comments || '-'}</td>

                    <td className="py-3 px-4 font-mono font-semibold">{rec.bookingCode}</td>

                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                      {rec.isCancelled
                        ? `Cancellato da ${rec.cancelledBy}: ${rec.cancellationReason}`
                        : rec.comments || 'Attivo'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
