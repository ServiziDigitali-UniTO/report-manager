import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { BookingRecord } from '../types';
import { ResourceCategoryBadge } from './ResourceCategoryBadge';
import { RESOURCE_CATEGORIES } from '../utils/csvParser';
import { formatDateItalian } from '../utils/dateUtils';

interface CsvUploaderProps {
  onCsvLoaded: (csvContent: string, fileName: string) => void;
  onResetToDefault: () => void;
  fileName: string;
  isUsingSampleData: boolean;
  records: BookingRecord[];
  onNavigateToRegisters: () => void;
  onNavigateToStats: () => void;
  onNavigateToHistory?: () => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  onCsvLoaded,
  onResetToDefault,
  fileName,
  isUsingSampleData,
  records,
  onNavigateToRegisters,
  onNavigateToStats,
  onNavigateToHistory,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setErrorMessage('Il file selezionato non sembra essere un file CSV valido.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onCsvLoaded(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Compute dataset stats
  const total = records.length;
  const active = records.filter((r) => !r.isCancelled).length;
  const cancelled = total - active;

  const uniqueResources = Array.from(new Set(records.map((r) => r.resourceName))).sort();
  const dates = records.map((r) => r.dateStr).filter(Boolean).sort();
  const minDate = dates[0] ? formatDateItalian(dates[0]) : '';
  const maxDate = dates[dates.length - 1] ? formatDateItalian(dates[dates.length - 1]) : '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Overview Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#3E5C4B] dark:text-[#A3C2B0]">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                Gestione Dataset Report Affluences
              </h2>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Carica nuovi file CSV esportati dal portale Affluences per generare registri e visualizzare le statistiche
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isUsingSampleData && (
              <button
                onClick={onResetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Ripristina CSV di Esempio
              </button>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div className="mt-6">
          <label
            htmlFor="csv-file-input"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer block focus-within:ring-2 focus-within:ring-[#3E5C4B] focus-within:ring-offset-2 ${
              isDragging
                ? 'border-[#3E5C4B] bg-[#E8EFEA]/60 dark:bg-[#1E2E25]/40'
                : 'border-stone-300 dark:border-stone-700 hover:border-[#3E5C4B] dark:hover:border-[#88AD97] bg-stone-50/50 dark:bg-stone-900/50'
            }`}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="sr-only"
              id="csv-file-input"
              aria-label="Seleziona file CSV esportato da Affluences"
            />
            <div className="w-12 h-12 rounded-full bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#3E5C4B] dark:text-[#A3C2B0] mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-stone-800 dark:text-stone-200">
              Trascina qui il file CSV di Affluences o <span className="text-[#3E5C4B] dark:text-[#88AD97] underline">sfoglia dal computer</span>
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Supporta file CSV con intestazioni standard Affluences (delimitatori virgola o punto e virgola)
            </p>
          </label>

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2 border border-red-200 dark:border-red-900"
            >
              <XCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Overview Summary */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#3E5C4B]" />
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Stato del Dataset Attualmente Caricato
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
            {fileName}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
            <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Prenotazioni Totali
            </div>
            <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
              {total}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Righe lette dal report
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#E8EFEA]/70 dark:bg-[#1E2E25]/40 border border-[#C5D6CC]/80 dark:border-[#2C4437]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#2C4437] dark:text-[#A3C2B0]">
                Prenotazioni Valide / Attive
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" />
            </div>
            <div className="text-2xl font-black text-[#2C4437] dark:text-[#A3C2B0] mt-1">
              {active}
            </div>
            <div className="text-[11px] text-[#3E5C4B] dark:text-[#88AD97] mt-0.5">
              {total > 0 ? Math.round((active / total) * 100) : 0}% del totale (da inserire nei registri)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-300">
                Prenotazioni Cancellate
              </span>
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">
              {cancelled}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
              {total > 0 ? Math.round((cancelled / total) * 100) : 0}% tasso di cancellazione
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F1EC] dark:bg-[#2A261F]/40 border border-[#D8D1C7] dark:border-[#4A4135]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#4A4135] dark:text-[#D1C7B8]">
                Arco Temporale
              </span>
              <Calendar className="w-4 h-4 text-[#786C5A] dark:text-[#D1C7B8]" />
            </div>
            <div className="text-sm font-bold text-[#4A4135] dark:text-[#D1C7B8] mt-1.5 truncate">
              {minDate} - {maxDate}
            </div>
            <div className="text-[11px] text-[#786C5A] dark:text-[#D1C7B8] mt-0.5">
              {uniqueResources.length} risorse uniche identificate
            </div>
          </div>
        </div>

        {/* Resources list detected */}
        <div className="pt-2">
          <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-500" />
            <span>Risorse Rilevate nel Report ({uniqueResources.length})</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            {uniqueResources.map((resName) => {
              const resCount = records.filter((r) => r.resourceName === resName).length;
              return (
                <div
                  key={resName}
                  className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                >
                  <ResourceCategoryBadge resourceName={resName} />
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold">
                    ({resCount})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category overview */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
            Classificazione Riconosciuta secondo Struttura Didattica
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(RESOURCE_CATEGORIES).map((cat) => {
              const catRecords = records.filter((r) => r.categoryKey === cat.key);

              return (
                <div
                  key={cat.key}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {catRecords.length} prenotazioni totali
                    </div>
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Next Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onNavigateToRegisters}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3E5C4B] hover:bg-[#324B3D] text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>Vai ai Registri Firma</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToStats}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/60 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <span>Analisi Statistica</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-[#2C4437] dark:text-[#A3C2B0] text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Storico Studente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
