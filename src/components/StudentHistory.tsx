import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UserSearch,
  UserCheck,
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  Search,
  ArrowUpDown,
  Filter,
  Copy,
  Check,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BookingRecord } from '../types';
import { RESOURCE_CATEGORIES } from '../utils/csvParser';
import { ResourceCategoryBadge } from './ResourceCategoryBadge';
import { formatDateItalian, formatDayNameItalian, getShiftLabel, formatTimeRange } from '../utils/dateUtils';

interface StudentHistoryProps {
  records: BookingRecord[];
  onNavigateToUploader?: () => void;
}

interface StudentSummary {
  matricola: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  activeRecords: BookingRecord[];
  cancelledRecords: BookingRecord[];
  totalRecords: BookingRecord[];
  totalActiveHours: number;
  resourcesAttended: string[];
}

export const StudentHistory: React.FC<StudentHistoryProps> = ({ records, onNavigateToUploader }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMatricola, setSelectedMatricola] = useState<string>('');
  const [copiedMatricola, setCopiedMatricola] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Helper to calculate hours from duration string (e.g. "05:00:00" -> 5)
  const parseDurationHours = (durationStr: string): number => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map((p) => parseFloat(p) || 0);
    if (parts.length >= 2) {
      return parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600;
    }
    return 0;
  };

  // Group all records by student (using matricola as primary key, fallback to email)
  const studentsMap = useMemo(() => {
    const map = new Map<string, StudentSummary>();

    records.forEach((rec) => {
      // Primary identifier: matricola if present, otherwise email, otherwise normalized fullName
      const key = rec.matricola?.trim() || rec.bookedByEmail?.trim().toLowerCase() || rec.fullName.trim().toLowerCase();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          matricola: rec.matricola || 'N/D',
          fullName: rec.fullName || 'Studente',
          firstName: rec.firstName || '',
          lastName: rec.lastName || '',
          email: rec.bookedByEmail || '',
          phone: rec.phone || '',
          activeRecords: [],
          cancelledRecords: [],
          totalRecords: [],
          totalActiveHours: 0,
          resourcesAttended: [],
        });
      }

      const st = map.get(key)!;
      st.totalRecords.push(rec);

      // Keep phone / email / matricola updated if later record has it
      if (st.matricola === 'N/D' && rec.matricola) {
        st.matricola = rec.matricola;
      }
      if (!st.email && rec.bookedByEmail) {
        st.email = rec.bookedByEmail;
      }
      if (!st.phone && rec.phone) {
        st.phone = rec.phone;
      }

      if (rec.isCancelled) {
        st.cancelledRecords.push(rec);
      } else {
        st.activeRecords.push(rec);
        const hours = parseDurationHours(rec.durationStr);
        st.totalActiveHours += hours > 0 ? hours : 0;
        if (!st.resourcesAttended.includes(rec.resourceName)) {
          st.resourcesAttended.push(rec.resourceName);
        }
      }
    });

    return map;
  }, [records]);

  // List of all students sorted by surname / name
  const allStudentsList = useMemo<StudentSummary[]>(() => {
    const list: StudentSummary[] = Array.from(studentsMap.values());
    return list.sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'it', { sensitivity: 'base' })
    );
  }, [studentsMap]);

  // Filter students based on search term (matricola, name, email)
  const filteredStudentsList = useMemo(() => {
    if (!searchTerm.trim()) return allStudentsList;
    const term = searchTerm.toLowerCase().trim();
    return allStudentsList.filter((s) => {
      return (
        s.matricola.toLowerCase().includes(term) ||
        s.fullName.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.toLowerCase().includes(term)
      );
    });
  }, [allStudentsList, searchTerm]);

  // Current active student summary
  const currentStudent = useMemo<StudentSummary | null>(() => {
    if (!selectedMatricola) return null;

    // Search by key
    for (const [key, student] of studentsMap.entries()) {
      if (
        key === selectedMatricola ||
        student.matricola.toLowerCase() === selectedMatricola.toLowerCase() ||
        student.email.toLowerCase() === selectedMatricola.toLowerCase()
      ) {
        return student;
      }
    }
    return null;
  }, [selectedMatricola, studentsMap]);

  // Group and sort active bookings by resource name and booking date
  const groupedActiveRecords = useMemo(() => {
    if (!currentStudent) return [];

    let recs = [...currentStudent.activeRecords];

    if (selectedCategoryFilter !== 'all') {
      recs = recs.filter((r) => r.categoryKey === selectedCategoryFilter);
    }

    // Sort by resourceName first, then dateStr, then startTimeStr
    recs.sort((a, b) => {
      const resCompare = a.resourceName.localeCompare(b.resourceName, 'it', { sensitivity: 'base' });
      if (resCompare !== 0) return resCompare;

      const dateA = `${a.dateStr || ''} ${a.startTimeStr || ''}`;
      const dateB = `${b.dateStr || ''} ${b.startTimeStr || ''}`;
      return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });

    // Group by resourceName
    const groupsMap = new Map<string, BookingRecord[]>();
    recs.forEach((r) => {
      if (!groupsMap.has(r.resourceName)) {
        groupsMap.set(r.resourceName, []);
      }
      groupsMap.get(r.resourceName)!.push(r);
    });

    return Array.from(groupsMap.entries()).map(([resourceName, list]) => {
      const categoryKey = list[0]?.categoryKey || 'ospedale';
      const totalHours = list.reduce((sum, item) => sum + parseDurationHours(item.durationStr), 0);
      return {
        resourceName,
        categoryKey,
        records: list,
        totalShifts: list.length,
        totalHours,
      };
    });
  }, [currentStudent, selectedCategoryFilter, sortOrder]);

  // Group and sort cancelled bookings by resource name and booking date
  const groupedCancelledRecords = useMemo(() => {
    if (!currentStudent) return [];

    let recs = [...currentStudent.cancelledRecords];

    if (selectedCategoryFilter !== 'all') {
      recs = recs.filter((r) => r.categoryKey === selectedCategoryFilter);
    }

    // Sort by resourceName first, then dateStr, then startTimeStr
    recs.sort((a, b) => {
      const resCompare = a.resourceName.localeCompare(b.resourceName, 'it', { sensitivity: 'base' });
      if (resCompare !== 0) return resCompare;

      const dateA = `${a.dateStr || ''} ${a.startTimeStr || ''}`;
      const dateB = `${b.dateStr || ''} ${b.startTimeStr || ''}`;
      return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });

    // Group by resourceName
    const groupsMap = new Map<string, BookingRecord[]>();
    recs.forEach((r) => {
      if (!groupsMap.has(r.resourceName)) {
        groupsMap.set(r.resourceName, []);
      }
      groupsMap.get(r.resourceName)!.push(r);
    });

    return Array.from(groupsMap.entries()).map(([resourceName, list]) => {
      const categoryKey = list[0]?.categoryKey || 'ospedale';
      return {
        resourceName,
        categoryKey,
        records: list,
        totalShifts: list.length,
      };
    });
  }, [currentStudent, selectedCategoryFilter, sortOrder]);

  // Copy matricola helper
  const handleCopyMatricola = (text: string) => {
    if (!text || text === 'N/D') return;
    navigator.clipboard.writeText(text);
    setCopiedMatricola(true);
    setTimeout(() => setCopiedMatricola(false), 2000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!currentStudent) return;

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Turni Prenotati / Svolti
    const activeData = currentStudent.activeRecords.map((r, i) => ({
      '#': i + 1,
      'Risorsa': r.resourceName,
      'Giorno': formatDayNameItalian(r.dateStr),
      'Data Turno': formatDateItalian(r.dateStr),
      'Orario Inizio': r.startTimeStr ? r.startTimeStr.substring(0, 5) : '',
      'Orario Fine': r.endTimeStr ? r.endTimeStr.substring(0, 5) : '',
      'Durata': r.durationStr || '',
      'Fascia Turno': getShiftLabel(r.startTimeStr),
      'Codice Prenotazione': r.bookingCode,
      'Data Prenotazione': r.bookingMadeAt || '',
      'Convalida Presenza': r.validatedPresenceAt || 'Sì',
      'Matricola': r.matricola || currentStudent.matricola,
      'Studente': currentStudent.fullName,
      'Email': currentStudent.email,
      'Note': r.comments || '',
    }));

    const activeSheet = XLSX.utils.json_to_sheet(
      activeData.length > 0 ? activeData : [{ 'Info': 'Nessun turno prenotato valido presente.' }]
    );
    XLSX.utils.book_append_sheet(workbook, activeSheet, 'Turni Prenotati');

    // Sheet 2: Turni Cancellati
    const cancelledData = currentStudent.cancelledRecords.map((r, i) => ({
      '#': i + 1,
      'Risorsa': r.resourceName,
      'Giorno Previsto': formatDayNameItalian(r.dateStr),
      'Data Turno Prevista': formatDateItalian(r.dateStr),
      'Orario Inizio': r.startTimeStr ? r.startTimeStr.substring(0, 5) : '',
      'Codice Prenotazione': r.bookingCode,
      'Data Cancellazione': r.cancelledAt || '',
      'Cancellato Da': r.cancelledBy || 'Utente',
      'Motivo Cancellazione': r.cancellationReason || '',
      'Matricola': r.matricola || currentStudent.matricola,
      'Studente': currentStudent.fullName,
    }));

    const cancelledSheet = XLSX.utils.json_to_sheet(
      cancelledData.length > 0 ? cancelledData : [{ 'Info': 'Nessun turno cancellato presente.' }]
    );
    XLSX.utils.book_append_sheet(workbook, cancelledSheet, 'Turni Cancellati');

    const cleanName = currentStudent.fullName.replace(/\s+/g, '_');
    const safeMatricola = currentStudent.matricola !== 'N/D' ? currentStudent.matricola : 'ND';
    const fileName = `Storico_Tirocinio_${safeMatricola}_${cleanName}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // Print Student History
  const handlePrint = () => {
    if (!currentStudent) return;
    const cleanName = currentStudent.fullName.replace(/\s+/g, '_');
    const safeMatricola = currentStudent.matricola !== 'N/D' ? currentStudent.matricola : 'ND';
    document.title = `Storico_Tirocinio_${safeMatricola}_${cleanName}`;
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Search & Student Selection Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#3E5C4B]/10 dark:bg-[#3E5C4B]/30 text-[#3E5C4B] dark:text-[#A3C2B0] rounded-xl">
              <UserSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                Storico Turni e Presenze Studente
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Consulta il prospetto completo dei turni svolti e cancellati filtrati per matricola o nominativo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {allStudentsList.length}
            </span>{' '}
            studenti registrati nel report
          </div>
        </div>

        {/* Search input with live suggestion pills */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-6 relative">
            <label htmlFor="student-search-input" className="sr-only">
              Cerca studente per matricola, cognome o email
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400" aria-hidden="true">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="student-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digita numero di matricola (es. 123456), cognome o email..."
              className="w-full pl-9 pr-8 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#3E5C4B] transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Cancella testo di ricerca"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Selector Dropdown */}
          <div className="lg:col-span-6">
            <label htmlFor="student-quick-select" className="sr-only">
              Seleziona rapidamente uno studente dal dataset
            </label>
            <select
              id="student-quick-select"
              value={selectedMatricola}
              onChange={(e) => {
                setSelectedMatricola(e.target.value);
                const chosen = allStudentsList.find(
                  (s) => s.matricola === e.target.value || s.email === e.target.value
                );
                if (chosen) {
                  setSearchTerm(chosen.matricola !== 'N/D' ? chosen.matricola : chosen.fullName);
                }
              }}
              className="w-full py-2.5 px-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3E5C4B]"
            >
              <option value="">-- Seleziona uno studente dal dataset ({allStudentsList.length}) --</option>
              {allStudentsList.map((st) => (
                <option
                  key={`${st.matricola}_${st.email}`}
                  value={st.matricola !== 'N/D' ? st.matricola : st.email}
                >
                  {st.matricola !== 'N/D' ? `[Matr. ${st.matricola}] ` : ''}
                  {st.fullName} ({st.activeRecords.length} turni attivi
                  {st.cancelledRecords.length > 0 ? `, ${st.cancelledRecords.length} canc.` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fast student click pills */}
        {searchTerm && filteredStudentsList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-2">
              Risultati corrispondenti ({filteredStudentsList.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredStudentsList.slice(0, 12).map((st) => {
                const isSelected =
                  currentStudent?.matricola === st.matricola && currentStudent?.email === st.email;
                return (
                  <button
                    key={`${st.matricola}_${st.email}`}
                    type="button"
                    onClick={() => {
                      setSelectedMatricola(st.matricola !== 'N/D' ? st.matricola : st.email);
                      setSearchTerm(st.matricola !== 'N/D' ? st.matricola : st.fullName);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#3E5C4B] text-white font-bold shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 font-medium'
                    }`}
                  >
                    <GraduationCap className="w-3 h-3 opacity-70" />
                    <span>{st.fullName}</span>
                    {st.matricola !== 'N/D' && (
                      <span className="font-mono text-[10px] opacity-80 font-normal">
                        ({st.matricola})
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredStudentsList.length > 12 && (
                <span className="text-xs text-stone-400 self-center pl-1">
                  +{filteredStudentsList.length - 12} altri
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* When no student is selected yet */}
      {!currentStudent && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-[#3E5C4B]/10 dark:bg-[#3E5C4B]/20 text-[#3E5C4B] dark:text-[#88AD97] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <UserSearch className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Seleziona o Inserisci una Matricola
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Cerca tramite il campo di ricerca in alto o seleziona uno studente dall'elenco a tendina per visualizzare lo storico completo dei suoi turni prenotati e cancellati, ordinati per tipo di risorsa e data.
            </p>

            <div className="pt-2">
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 block mb-3">
                Studenti con più turni nel report caricato:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {allStudentsList.slice(0, 6).map((st) => (
                  <button
                    key={`${st.matricola}_${st.email}`}
                    type="button"
                    onClick={() => {
                      setSelectedMatricola(st.matricola !== 'N/D' ? st.matricola : st.email);
                      setSearchTerm(st.matricola !== 'N/D' ? st.matricola : st.fullName);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 hover:bg-[#E8EFEA] dark:hover:bg-[#1E2E25] hover:text-[#2C4437] dark:hover:text-[#A3C2B0] text-stone-700 dark:text-stone-300 rounded-xl transition-all border border-stone-200 dark:border-stone-700 cursor-pointer font-medium"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#3E5C4B]" />
                    <span>{st.fullName}</span>
                    <span className="text-[10px] font-bold bg-stone-200 dark:bg-stone-700 px-1.5 py-0.2 rounded-full">
                      {st.activeRecords.length} turni
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Student History View */}
      {currentStudent && (
        <div className="space-y-6">
          {/* Institutional Print Header (Visible only when printed) */}
          <div className="hidden print:block border-b-2 border-stone-800 pb-4 mb-4 page-break-inside-avoid">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-black uppercase tracking-tight text-black">
                  UNIVERSITÀ DEGLI STUDI DI TORINO
                </h1>
                <h2 className="text-xs font-bold text-stone-700 uppercase">
                  Dipartimento di Scienze Veterinarie
                </h2>
                <p className="text-[11px] text-stone-600">
                  Struttura Didattica Speciale di Medicina Veterinaria - Grugliasco (TO)
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-stone-400 px-3 py-1 text-xs font-bold uppercase rounded">
                  Scheda Storico Tirocinio
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Estratto il {new Date().toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
          </div>

          {/* Student Profile & Quick Actions Banner */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs relative overflow-hidden print:border-stone-300 print:p-4 print:rounded-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Profile Details */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#3E5C4B] text-white flex items-center justify-center text-xl font-bold tracking-tight shadow-md shrink-0">
                  {currentStudent.lastName?.charAt(0) || currentStudent.fullName?.charAt(0) || 'S'}
                  {currentStudent.firstName?.charAt(0) || ''}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                      {currentStudent.fullName}
                    </h2>
                    {currentStudent.matricola !== 'N/D' && (
                      <button
                        type="button"
                        onClick={() => handleCopyMatricola(currentStudent.matricola)}
                        title="Copia matricola"
                        className="inline-flex items-center gap-1 bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#2C4437] dark:text-[#A3C2B0] border border-[#C5D6CC] dark:border-[#2C4437] px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold hover:bg-[#D5E4DB] transition-all cursor-pointer"
                      >
                        <span>Matr. {currentStudent.matricola}</span>
                        {copiedMatricola ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500 dark:text-stone-400">
                    {currentStudent.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        <a
                          href={`mailto:${currentStudent.email}`}
                          className="hover:underline text-stone-700 dark:text-stone-300"
                        >
                          {currentStudent.email}
                        </a>
                      </div>
                    )}
                    {currentStudent.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{currentStudent.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-stone-400" />
                      <span>Dip. Scienze Veterinarie UniTO</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Print & Excel) */}
              <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Esporta storico in foglio Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Esporta Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#3E5C4B] hover:bg-[#324B3D] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Stampa o salva in PDF la scheda storica dello studente"
                >
                  <Printer className="w-4 h-4" />
                  <span>Stampa Scheda PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-100 dark:border-stone-800">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                    Turni Prenotati
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                  {currentStudent.activeRecords.length}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Turni confermati / svolti
                </div>
              </div>

              <div className="bg-[#E8EFEA]/80 dark:bg-[#1E2E25]/60 border border-[#C5D6CC] dark:border-[#2C4437] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2C4437] dark:text-[#A3C2B0] uppercase tracking-wider">
                    Ore Totali
                  </span>
                  <Clock className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" />
                </div>
                <div className="text-2xl font-black text-[#2C4437] dark:text-[#A3C2B0] mt-1">
                  {currentStudent.totalActiveHours.toFixed(0)}h
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                  Ore stimate di tirocinio
                </div>
              </div>

              <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                    Turni Cancellati
                  </span>
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-1">
                  {currentStudent.cancelledRecords.length}
                </div>
                <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                  Annullamenti registrati
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Risorse Diverse
                  </span>
                  <Layers className="w-4 h-4 text-stone-500" />
                </div>
                <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {currentStudent.resourcesAttended.length}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Strutture frequentate
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Sorting Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 text-xs print:hidden shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filtra Categoria:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-[#3E5C4B] text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                Tutte le Risorse
              </button>
              {Object.values(RESOURCE_CATEGORIES).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter === cat.key
                      ? 'bg-[#3E5C4B] text-white shadow-2xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  {cat.label.replace(/^\d+\)\s*/, '')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold rounded-lg transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                <span>Data: {sortOrder === 'asc' ? 'Crescente (dal più vecchio)' : 'Decrescente'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: TURNI PRENOTATI (ATTIVI / SVOLTI)                              */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-600/70">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-600" />
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white uppercase tracking-wider">
                  1. Turni Prenotati / Svolti ({currentStudent.activeRecords.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Ordinati per Risorsa e Data
              </span>
            </div>

            {groupedActiveRecords.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 text-center text-xs text-stone-500">
                Nessun turno prenotato valido per i filtri selezionati.
              </div>
            ) : (
              <div className="space-y-5">
                {groupedActiveRecords.map((group) => (
                  <div
                    key={group.resourceName}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs"
                  >
                    {/* Group Header (Resource Header) */}
                    <div className="bg-stone-50 dark:bg-stone-800/80 px-5 py-3.5 border-b border-stone-200 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#3E5C4B]/10 dark:bg-[#3E5C4B]/30 text-[#3E5C4B] dark:text-[#A3C2B0] rounded-lg">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-sm">
                            {group.resourceName}
                          </h4>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400">
                            {group.totalShifts} {group.totalShifts === 1 ? 'turno svolto' : 'turni svolti'} &bull; {group.totalHours.toFixed(0)} ore totali
                          </span>
                        </div>
                      </div>

                      <div>
                        <ResourceCategoryBadge categoryKey={group.categoryKey} />
                      </div>
                    </div>

                    {/* Table of shifts for this resource */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-stone-100/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-4">Giorno & Data</th>
                            <th className="py-2.5 px-3 text-center">Orario</th>
                            <th className="py-2.5 px-3 text-center">Turno</th>
                            <th className="py-2.5 px-3 text-center">Codice</th>
                            <th className="py-2.5 px-3 text-center">Data Prenotazione</th>
                            <th className="py-2.5 px-3 text-center">Presenza / Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                          {group.records.map((rec) => {
                            const shiftLabel = getShiftLabel(rec.startTimeStr);
                            let shiftStyle = 'bg-stone-100 text-stone-800 border-stone-200';
                            if (shiftLabel.includes('DIURNO')) {
                              shiftStyle = 'bg-amber-50 text-amber-900 border-amber-200';
                            } else if (shiftLabel.includes('POMERIDIANO')) {
                              shiftStyle = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                            } else if (shiftLabel.includes('NOTTURNO')) {
                              shiftStyle = 'bg-indigo-50 text-indigo-900 border-indigo-200';
                            }

                            return (
                              <tr
                                key={rec.id}
                                className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-bold text-stone-900 dark:text-white">
                                    {formatDayNameItalian(rec.dateStr)}
                                  </div>
                                  <div className="text-stone-500 dark:text-stone-400 text-[11px]">
                                    {formatDateItalian(rec.dateStr)}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-semibold text-stone-800 dark:text-stone-200">
                                  {formatTimeRange(rec.startTimeStr, rec.endTimeStr)}
                                  {rec.durationStr && (
                                    <span className="block text-[10px] font-normal text-stone-400">
                                      ({rec.durationStr.substring(0, 5)} h)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${shiftStyle}`}
                                  >
                                    {shiftLabel}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-stone-700 dark:text-stone-300">
                                  {rec.bookingCode ? (
                                    <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-[11px] border border-stone-200 dark:border-stone-700">
                                      {rec.bookingCode}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center text-stone-500 text-[11px]">
                                  {rec.bookingMadeAt || '-'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {rec.validatedPresenceAt ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Convalidata</span>
                                    </span>
                                  ) : rec.comments ? (
                                    <span className="text-[11px] text-stone-600 dark:text-stone-400 italic">
                                      {rec.comments}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-60" />
                                      <span>Iscritto</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: TURNI CANCELLATI (POSIZIONATI SOTTO I PRENOTATI)                */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500/70">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white uppercase tracking-wider">
                  2. Turni Cancellati ({currentStudent.cancelledRecords.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                Ordinati per Risorsa e Data
              </span>
            </div>

            {groupedCancelledRecords.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 text-center text-xs text-stone-500">
                Nessun turno cancellato per questo studente nel report.
              </div>
            ) : (
              <div className="space-y-5">
                {groupedCancelledRecords.map((group) => (
                  <div
                    key={`canc_${group.resourceName}`}
                    className="bg-white dark:bg-stone-900 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl overflow-hidden shadow-xs"
                  >
                    {/* Group Header */}
                    <div className="bg-rose-50/60 dark:bg-rose-950/20 px-5 py-3.5 border-b border-rose-200/60 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg">
                          <XCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-sm">
                            {group.resourceName}
                          </h4>
                          <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                            {group.totalShifts} {group.totalShifts === 1 ? 'annullamento registrato' : 'annullamenti registrati'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <ResourceCategoryBadge categoryKey={group.categoryKey} />
                      </div>
                    </div>

                    {/* Table of cancelled shifts */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-stone-100/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-4">Giorno Previsto</th>
                            <th className="py-2.5 px-3 text-center">Orario</th>
                            <th className="py-2.5 px-3 text-center">Codice</th>
                            <th className="py-2.5 px-3">Data Cancellazione</th>
                            <th className="py-2.5 px-3">Cancellato Da</th>
                            <th className="py-2.5 px-4">Motivo / Ragione</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                          {group.records.map((rec) => {
                            let actorBadge = 'bg-stone-100 text-stone-700 border-stone-200';
                            const cBy = (rec.cancelledBy || 'utente').toLowerCase();
                            if (cBy.includes('admin')) {
                              actorBadge = 'bg-amber-100 text-amber-900 border-amber-300';
                            } else if (cBy.includes('system')) {
                              actorBadge = 'bg-purple-100 text-purple-900 border-purple-300';
                            } else {
                              actorBadge = 'bg-rose-100 text-rose-900 border-rose-300';
                            }

                            return (
                              <tr
                                key={rec.id}
                                className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors opacity-90"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-bold text-stone-800 dark:text-stone-200">
                                    {formatDayNameItalian(rec.dateStr)}
                                  </div>
                                  <div className="text-stone-500 text-[11px]">
                                    {formatDateItalian(rec.dateStr)}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-stone-700 dark:text-stone-300">
                                  {rec.startTimeStr ? rec.startTimeStr.substring(0, 5) : '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-mono text-stone-500 text-[11px]">
                                  {rec.bookingCode || '-'}
                                </td>
                                <td className="py-3 px-3 text-stone-600 dark:text-stone-300 text-[11px]">
                                  {rec.cancelledAt || '-'}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${actorBadge}`}
                                  >
                                    {rec.cancelledBy || 'Utente'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-stone-700 dark:text-stone-300 text-xs font-medium">
                                  {rec.cancellationReason ? (
                                    <span className="italic text-stone-800 dark:text-stone-200">
                                      "{rec.cancellationReason}"
                                    </span>
                                  ) : (
                                    <span className="text-stone-400">Non specificata</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic Signature / Certification Block for Printouts */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-xs text-stone-600 dark:text-stone-400 page-break-inside-avoid">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <strong className="block text-stone-800 dark:text-stone-200 text-sm mb-1">
                  Certificazione Storico Tirocini Pratici Interni
                </strong>
                <p>
                  Documento estratto dai log ufficiali del portale di prenotazione Affluences per il Dipartimento di Scienze Veterinarie dell'Università degli Studi di Torino.
                </p>
              </div>
              <div className="w-full sm:w-64 pt-6 border-t sm:border-t-0 sm:border-l border-stone-300 dark:border-stone-700 sm:pl-6 text-center">
                <div className="border-b border-stone-400 border-dashed pb-8 mb-2">
                  <span className="text-[11px] text-stone-400">Firma e Timbro Struttura / Tutor</span>
                </div>
                <span className="text-[10px] text-stone-500 font-semibold">Responsabile Didattico Tirocini</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
