import {presenceKey,refreshCentralRecords} from '../services/googleSheetsWebhook';
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  FileSpreadsheet,
  Printer,
  Search,
  ArrowUpDown,
  Smartphone,
  ShieldCheck,
  FileSignature,
  Save,
  Check,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  BookingRecord,
  ValidationRecord,
  AttendanceStatus,
  ValidationMode,
} from '../types';
import {
  formatDateItalian,
  formatDayNameItalian,
  getShiftLabel,
  formatTimeRange,
} from '../utils/dateUtils';
import {
  getStoredValidationRecords,
  saveValidationRecords,
  sendAttendanceToGoogleSheets,
} from '../services/googleSheetsWebhook';
import { ResourceCategoryBadge } from './ResourceCategoryBadge';

interface ShiftResourceReportProps {
  records: BookingRecord[];
  onOpenGoogleSheetsSettings?: () => void;
}

interface EnrichedShiftStudent {
  id: string;
  bookingRecordId?: string;
  dateStr: string;
  resourceName: string;
  categoryKey: any;
  startTimeStr: string;
  endTimeStr: string;
  shiftLabel: string;
  studentName: string;
  matricola: string;
  email: string;
  bookingCode?: string;
  status: AttendanceStatus;
  delayMinutes: number;
  validationMode: ValidationMode;
  validatedAt?: string;
  validatedBy?: string;
  pinUsed?: string;
  note?: string;
  isManualIntegration?: boolean;
}

export const ShiftResourceReport: React.FC<ShiftResourceReportProps> = ({
  records,
  onOpenGoogleSheetsSettings,
}) => {
  // Local validation records cache
  const [storedValidations, setStoredValidations] = useState<ValidationRecord[]>(() =>
    getStoredValidationRecords()
  );

  // Refresh stored validations when component mounts
  useEffect(() => {
    const refresh=()=>setStoredValidations(getStoredValidationRecords());
    refresh();window.addEventListener('rm-presences-changed',refresh);return()=>window.removeEventListener('rm-presences-changed',refresh);
  }, []);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchStudentTerm, setSearchStudentTerm] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Extract all unique dates from records
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    records.forEach((r) => {
      if (r.dateStr) dates.add(r.dateStr);
    });
    storedValidations.forEach((v) => {
      if (v.date) dates.add(v.date);
    });
    return Array.from(dates).sort();
  }, [records, storedValidations]);

  // Extract all unique resources
  const uniqueResources = useMemo(() => {
    const res = new Set<string>();
    records.forEach((r) => {
      if (r.resourceName) res.add(r.resourceName);
    });
    storedValidations.forEach((v) => {
      if (v.resource) res.add(v.resource);
    });
    return Array.from(res).sort();
  }, [records, storedValidations]);

  // Combine CSV bookings and stored digital validations
  const allShiftStudents = useMemo<EnrichedShiftStudent[]>(() => {
    const list: EnrichedShiftStudent[] = [];
    const matchedValidationKeys = new Set<string>();

    // 1. Process active records from CSV
    records
      .filter((r) => !r.isCancelled)
      .forEach((r) => {
        const valKey=presenceKey({date:r.dateStr,resource:r.resourceName,timeSlot:`${r.startTimeStr.slice(0,5)} - ${r.endTimeStr.slice(0,5)}`,matricola:r.matricola,studentName:r.fullName});
        const stored = storedValidations.find(
          (v) =>
            presenceKey(v) === valKey
        );

        if (stored) {
          matchedValidationKeys.add(valKey);
          list.push({
            id: `enr_${r.id}`,
            bookingRecordId: r.id,
            dateStr: r.dateStr,
            resourceName: r.resourceName,
            categoryKey: r.categoryKey,
            startTimeStr: r.startTimeStr,
            endTimeStr: r.endTimeStr,
            shiftLabel: getShiftLabel(r.startTimeStr),
            studentName: stored.studentName || r.fullName,
            matricola: stored.matricola !== '-' ? stored.matricola : r.matricola || '-',
            email: r.bookedByEmail,
            bookingCode: r.bookingCode,
            status: stored.status,
            delayMinutes: stored.delayMinutes || 0,
            validationMode: stored.validationMode || 'TUTOR_QR',
            validatedAt: stored.validatedAt,
            validatedBy: stored.validatedBy,
            pinUsed: stored.pinUsed,
            note: stored.note || r.comments,
            isManualIntegration: stored.isManualIntegration,
          });
        } else {
          // No digital validation recorded yet: default to CARTACEA (or verified if marked in CSV)
          const isPresenceFromCsv = !!r.validatedPresenceAt;
          list.push({
            id: `enr_${r.id}`,
            bookingRecordId: r.id,
            dateStr: r.dateStr,
            resourceName: r.resourceName,
            categoryKey: r.categoryKey,
            startTimeStr: r.startTimeStr,
            endTimeStr: r.endTimeStr,
            shiftLabel: getShiftLabel(r.startTimeStr),
            studentName: r.fullName,
            matricola: r.matricola || '-',
            email: r.bookedByEmail,
            bookingCode: r.bookingCode,
            status: isPresenceFromCsv ? 'present' : 'present', // Default to enrolled present
            delayMinutes: 0,
            validationMode: 'CARTACEA',
            validatedAt: r.validatedPresenceAt || undefined,
            validatedBy: 'Firma Cartacea',
            note: r.comments,
            isManualIntegration: false,
          });
        }
      });

    // 2. Add any manual out-of-list or QR students recorded in storedValidations that were not in CSV
    storedValidations.forEach((v) => {
      const valKey=presenceKey(v);
      if (!matchedValidationKeys.has(valKey)) {
        list.push({
          id: `val_${v.id}`,
          dateStr: v.date,
          resourceName: v.resource,
          categoryKey: 'ospedale',
          startTimeStr: v.timeSlot.includes(':') ? v.timeSlot.split('-')[0].trim() : '08:00:00',
          endTimeStr: v.timeSlot.includes('-') ? v.timeSlot.split('-')[1]?.trim() || '' : '14:00:00',
          shiftLabel: getShiftLabel(v.timeSlot),
          studentName: v.studentName,
          matricola: v.matricola || '-',
          email: v.email || '',
          bookingCode: v.bookingCode || '',
          status: v.status,
          delayMinutes: v.delayMinutes || 0,
          validationMode: v.validationMode,
          validatedAt: v.validatedAt,
          validatedBy: v.validatedBy,
          pinUsed: v.pinUsed,
          note: v.note,
          isManualIntegration: v.isManualIntegration || false,
        });
      }
    });

    return list;
  }, [records, storedValidations]);

  // Filtered List
  const filteredStudents = useMemo(() => {
    return allShiftStudents.filter((item) => {
      // Date filter
      if (selectedDate !== 'all' && item.dateStr !== selectedDate) {
        return false;
      }
      // Resource filter
      if (selectedResource !== 'all' && item.resourceName !== selectedResource) {
        return false;
      }
      // Shift Type filter
      if (selectedShiftType !== 'all') {
        if (selectedShiftType === 'diurno' && !item.shiftLabel.includes('DIURNO')) return false;
        if (selectedShiftType === 'pomeridiano' && !item.shiftLabel.includes('POMERIDIANO'))
          return false;
        if (selectedShiftType === 'notturno' && !item.shiftLabel.includes('NOTTURNO')) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && (!item.validatedAt || item.status !== statusFilter)) {
        return false;
      }
      // Text search
      if (searchStudentTerm.trim()) {
        const term = searchStudentTerm.toLowerCase().trim();
        const matchesName = item.studentName.toLowerCase().includes(term);
        const matchesMatr = item.matricola.toLowerCase().includes(term);
        const matchesResource = item.resourceName.toLowerCase().includes(term);
        if (!matchesName && !matchesMatr && !matchesResource) return false;
      }
      return true;
    });
  }, [allShiftStudents, selectedDate, selectedResource, selectedShiftType, statusFilter, searchStudentTerm]);

  // Group filtered students by Resource, then by Date and TimeSlot
  const groupedShifts = useMemo(() => {
    const map = new Map<string, { resource: string; date: string; time: string; students: EnrichedShiftStudent[] }>();

    filteredStudents.forEach((st) => {
      const groupKey = `${st.resourceName}__${st.dateStr}__${st.startTimeStr}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          resource: st.resourceName,
          date: st.dateStr,
          time: formatTimeRange(st.startTimeStr, st.endTimeStr),
          students: [],
        });
      }
      map.get(groupKey)!.students.push(st);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.resource !== b.resource) return a.resource.localeCompare(b.resource);
      return a.time.localeCompare(b.time);
    });
  }, [filteredStudents]);

  // Counters
  const totalCount = filteredStudents.length;
  const presentCount = filteredStudents.filter((s) => !!s.validatedAt && s.status === 'present').length;
  const lateCount = filteredStudents.filter((s) => !!s.validatedAt && s.status === 'late').length;
  const absentCount = filteredStudents.filter((s) => !!s.validatedAt && s.status === 'absent').length;

  // In-place status update handler
  const handleUpdateStudentStatus = async (
    item: EnrichedShiftStudent,
    newStatus: AttendanceStatus,
    newDelay: number = 0
  ) => {
    const updatedRecord: ValidationRecord = {
      id: `val_${Date.now()}_${item.matricola || item.studentName}`,
      date: item.dateStr,
      resource: item.resourceName,
      timeSlot: `${item.startTimeStr.substring(0, 5)} - ${item.endTimeStr.substring(0, 5)}`,
      studentName: item.studentName,
      matricola: item.matricola,
      bookingCode: item.bookingCode,
      email: item.email,
      status: newStatus,
      delayMinutes: newStatus === 'late' ? (newDelay > 0 ? newDelay : 15) : 0,
      validationMode: 'MANUALE',
      validatedAt: new Date().toLocaleString('it-IT'),
      validatedBy: 'Modifica Manuale Report Manager',
      note: item.note,
      isManualIntegration: item.isManualIntegration,
    };

    const result=await sendAttendanceToGoogleSheets([updatedRecord]);
    setSaveSuccessMsg(result.success?`Rettifica di ${item.studentName} confermata sul Foglio.`:(result.error||'Rettifica non confermata.'));
    setStoredValidations(getStoredValidationRecords());

  };

  // Export to Excel
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const dataRows = filteredStudents.map((st, i) => ({
      '#': i + 1,
      'Data Turno': formatDateItalian(st.dateStr),
      'Giorno': formatDayNameItalian(st.dateStr),
      'Reparto / Risorsa': st.resourceName,
      'Fascia Turno': st.shiftLabel,
      'Orario': formatTimeRange(st.startTimeStr, st.endTimeStr),
      'Cognome e Nome': st.studentName,
      'Matricola': st.matricola,
      'Codice Prenotazione': st.bookingCode || '-',
      'Stato Presenza': !st.validatedAt ? 'DA VERIFICARE' : st.status === 'present' ? 'PRESENTE' : st.status === 'late' ? 'RITARDO' : 'ASSENTE',
      'Minuti Ritardo': st.delayMinutes || 0,
      'Metodo Validazione': st.validationMode,
      'Data e Ora Convalida': st.validatedAt || 'Non convalidata',
      'Validato Da': st.validatedBy || 'Docente/Tutor',
      'PIN Utilizzato': st.pinUsed || '-',
      'Note': st.note || (st.isManualIntegration ? 'Integrazione manuale' : ''),
    }));

    const sheet = XLSX.utils.json_to_sheet(
      dataRows.length > 0 ? dataRows : [{ 'Info': 'Nessun record per i filtri selezionati.' }]
    );
    XLSX.utils.book_append_sheet(workbook, sheet, 'Presenti e Assenti per Turno');

    const dateTag = selectedDate !== 'all' ? selectedDate : 'Completo';
    const resTag = selectedResource !== 'all' ? selectedResource.substring(0, 15).replace(/\s+/g, '_') : 'TuttiReparti';
    XLSX.writeFile(workbook, `Report_Presenze_Turni_${resTag}_${dateTag}.xlsx`);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="p-3 border rounded bg-white text-xs print:hidden space-y-2">
        <p>Le righe CARTACEA provengono dalle prenotazioni e non attestano una presenza digitale. Per consultare gli invii dagli altri dispositivi aggiornare dal Foglio.</p>
        <button className="border rounded p-2" onClick={async()=>{try{const records=await refreshCentralRecords();setStoredValidations(records);setSaveSuccessMsg('Presenze aggiornate dal Foglio.');}catch(e:any){setSaveSuccessMsg(e.message);}}}>Aggiorna dal Foglio Google</button>
      </div>
      {/* Top Filter and Search Control Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#3E5C4B]/10 dark:bg-[#3E5C4B]/30 text-[#3E5C4B] dark:text-[#A3C2B0] rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
                Elenco Presenti e Assenti per Risorsa e Turno
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Verifica chi era presente a ciascun turno con i tre metodi di convalida (Firma Cartacea, Appello Tutor con QR, Auto-convalida Studente con PIN).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Esporta Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#3E5C4B] hover:bg-[#324B3D] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Report Turni</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Date Filter */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
              Data Turno
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium focus:ring-2 focus:ring-[#3E5C4B]"
            >
              <option value="all">Tutte le Date ({uniqueDates.length} giorni)</option>
              {uniqueDates.map((d) => (
                <option key={d} value={d}>
                  {formatDayNameItalian(d)} {formatDateItalian(d)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Resource Filter */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
              Reparto / Risorsa
            </label>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium focus:ring-2 focus:ring-[#3E5C4B]"
            >
              <option value="all">Tutti i Reparti ({uniqueResources.length})</option>
              {uniqueResources.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Shift Type Filter */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
              Fascia Oraria
            </label>
            <select
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium focus:ring-2 focus:ring-[#3E5C4B]"
            >
              <option value="all">Tutti i turni</option>
              <option value="diurno">Mattina / Diurno (08:00 - 14:00)</option>
              <option value="pomeridiano">Pomeridiano (14:00 - 20:00)</option>
              <option value="notturno">Notturno / Reperibilità</option>
            </select>
          </div>

          {/* 4. Presence Status Filter */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
              Stato Presenza
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium focus:ring-2 focus:ring-[#3E5C4B]"
            >
              <option value="all">Tutti gli stati</option>
              <option value="present">Solo Presenti</option>
              <option value="late">Solo In Ritardo</option>
              <option value="absent">Solo Assenti</option>
            </select>
          </div>
        </div>

        {/* Quick Search Student by name or matricola */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchStudentTerm}
            onChange={(e) => setSearchStudentTerm(e.target.value)}
            placeholder="Filtra rapidamente per cognome, matricola o parola chiave reparto..."
            className="w-full pl-9 pr-8 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3E5C4B]"
          />
          {searchStudentTerm && (
            <button
              type="button"
              onClick={() => setSearchStudentTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
            Tirocinanti Iscritti
          </span>
          <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
            {totalCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {groupedShifts.length} turni analizzati
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
              Presenti
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
            {presentCount}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            {totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : 0}% di presenze regolari
          </div>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
              In Ritardo
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
            {lateCount}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            Ingressi posticipati registrati
          </div>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider block">
              Assenti
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-1">
            {absentCount}
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
            Mancata presentazione
          </div>
        </div>
      </div>

      {/* Main Shift Cards & Roster Tables */}
      {groupedShifts.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center shadow-xs">
          <Building2 className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
            Nessun turno trovato per i filtri selezionati
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Prova a modificare la data o il reparto selezionato per visualizzare l'elenco dei presenti e assenti.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedShifts.map((group, groupIdx) => {
            const shiftPresent = group.students.filter((s) => !!s.validatedAt && s.status === 'present').length;
            const shiftLate = group.students.filter((s) => !!s.validatedAt && s.status === 'late').length;
            const shiftAbsent = group.students.filter((s) => !!s.validatedAt && s.status === 'absent').length;

            return (
              <div
                key={`${group.resource}__${group.date}__${groupIdx}`}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs page-break-inside-avoid"
              >
                {/* Shift Group Header */}
                <div className="bg-stone-50 dark:bg-stone-850 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-stone-900 dark:text-white text-sm sm:text-base">
                        {group.resource}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-[#E8EFEA] text-[#2C4437] rounded border border-[#C5D6CC]">
                        {group.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="font-semibold text-stone-800 dark:text-stone-300">
                        {formatDayNameItalian(group.date)} {formatDateItalian(group.date)}
                      </span>
                      <span>&bull;</span>
                      <span>{group.students.length} iscritti</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                      {shiftPresent} Presenti
                    </span>
                    {shiftLate > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                        {shiftLate} Ritardo
                      </span>
                    )}
                    {shiftAbsent > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                        {shiftAbsent} Assenti
                      </span>
                    )}
                  </div>
                </div>

                {/* Table of students */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Tirocinante</th>
                        <th className="py-2.5 px-3 text-center">Matricola</th>
                        <th className="py-2.5 px-3 text-center">Stato Presenza</th>
                        <th className="py-2.5 px-3 text-center">Ritardo</th>
                        <th className="py-2.5 px-3 text-center">Metodo Convalida</th>
                        <th className="py-2.5 px-3">Data/Ora & Validatore</th>
                        <th className="py-2.5 px-3 text-center print:hidden">Aggiorna Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {group.students.map((st) => {
                        let methodBadge = (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                            <FileSignature className="w-3 h-3 text-stone-500" />
                            <span>Firma Cartacea</span>
                          </span>
                        );

                        if (st.validationMode === 'TUTOR_QR') {
                          methodBadge = (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2C4437] bg-[#E8EFEA] px-2 py-0.5 rounded border border-[#C5D6CC]">
                              <ShieldCheck className="w-3 h-3 text-[#3E5C4B]" />
                              <span>Appello Tutor (QR)</span>
                            </span>
                          );
                        } else if (st.validationMode === 'STUDENTE_QR') {
                          methodBadge = (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Smartphone className="w-3 h-3 text-emerald-600" />
                              <span>Studente (QR + PIN)</span>
                            </span>
                          );
                        } else if (st.validationMode === 'MANUALE') {
                          methodBadge = (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              <span>Manuale</span>
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={st.id}
                            className={`transition-colors ${
                              st.status === 'present'
                                ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                                : st.status === 'late'
                                ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60'
                                : 'bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60'
                            }`}
                          >
                            {/* Student Name */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-stone-900 dark:text-white uppercase">
                                {st.studentName}
                              </div>
                              {st.isManualIntegration && (
                                <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5">
                                  Integrazione Fuori Elenco
                                </span>
                              )}
                              {st.email && (
                                <div className="text-[10px] text-stone-400 truncate max-w-[180px]">
                                  {st.email}
                                </div>
                              )}
                            </td>

                            {/* Matricola */}
                            <td className="py-3 px-3 text-center font-mono font-semibold text-stone-700 dark:text-stone-300">
                              {st.matricola}
                            </td>

                            {/* Presence Status Badge */}
                            <td className="py-3 px-3 text-center">
                              {!st.validatedAt ? (<span className="text-xs text-stone-500">Da verificare</span>) : st.status === 'present' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Presente</span>
                                </span>
                              ) : st.status === 'late' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>In Ritardo</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Assente</span>
                                </span>
                              )}
                            </td>

                            {/* Delay Minutes */}
                            <td className="py-3 px-3 text-center font-mono">
                              {st.status === 'late' ? (
                                <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  +{st.delayMinutes || 15} min
                                </span>
                              ) : st.isManualIntegration && st.delayMinutes === 0 ? (
                                <span className="text-[10px] font-bold text-emerald-700">0 min</span>
                              ) : (
                                <span className="text-stone-400">-</span>
                              )}
                            </td>

                            {/* Validation Mode */}
                            <td className="py-3 px-3 text-center">{methodBadge}</td>

                            {/* Timestamp / Validator info */}
                            <td className="py-3 px-3 text-[11px] text-stone-600 dark:text-stone-400">
                              <div>{st.validatedAt || 'Turno da registro'}</div>
                              {st.validatedBy && (
                                <div className="text-[10px] text-stone-400 italic">
                                  Da: {st.validatedBy}
                                </div>
                              )}
                            </td>

                            {/* Quick Action to toggle presence directly from Report Manager */}
                            <td className="py-3 px-3 text-center print:hidden">
                              <div className="inline-flex items-center gap-1">
                                {(!st.validatedAt || st.status !== 'present') && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStudentStatus(st, 'present')}
                                    title="Segna Presente"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {st.status !== 'late' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStudentStatus(st, 'late', 15)}
                                    title="Segna In Ritardo (+15 min)"
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                                {st.status !== 'absent' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStudentStatus(st, 'absent')}
                                    title="Segna Assente"
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
