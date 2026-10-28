import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  UserPlus,
  Send,
  FileSpreadsheet,
  Check,
  X,
  MessageSquare,
  Lock,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  Share2,
  Copy,
} from 'lucide-react';
import {
  ValidationShiftPayload,
  StudentAttendanceItem,
  AttendanceStatus,
  ValidationRecord,
} from '../types';
import { formatDateItalian, formatDayNameItalian } from '../utils/dateUtils';
import { rpc } from '../services/bridge';
import {
  sendAttendanceToGoogleSheets,
  getGoogleSheetsWebhookConfig,
} from '../services/googleSheetsWebhook';

interface AttendanceValidatorModalProps {
  payload: ValidationShiftPayload;
  isOpen: boolean;
  onClose: () => void;
  defaultTutorName?: string;
  isStandalone?: boolean;
}

export const AttendanceValidatorModal: React.FC<AttendanceValidatorModalProps> = ({
  payload,
  isOpen,
  onClose,
  defaultTutorName = '',
  isStandalone = false,
}) => {


  const [dailyPin,setDailyPin]=useState(payload.serverPin||'Da sbloccare');
  const [tutorPassword,setTutorPassword]=useState('');
  const [unlockError,setUnlockError]=useState('');
  const unlock=async()=>{try{const r=await rpc('getShift',{}, {shiftId:payload.shiftId,token:payload.token,tutorPassword});setDailyPin(r.payload.serverPin);setUnlockError('Accesso tutor verificato.');}catch(e:any){setUnlockError(e.message);}};
  // Attendance state initialized from shift payload
  const [attendance, setAttendance] = useState<StudentAttendanceItem[]>(() => {
    return payload.students.map((st, idx) => ({
      id: st.id || `st-${idx}`,
      name: st.name,
      matricola: st.matricola || '-',
      bookingCode: st.bookingCode || '',
      email: st.email || '',
      status: 'present',
      delayMinutes: 0,
      note: '',
      isManualIntegration: false,
    }));
  });

  const [tutorName, setTutorName] = useState<string>(defaultTutorName);
  const [tutorNotes, setTutorNotes] = useState<string>('');


  // Modal to add student outside roster
  const [isAddLatecomerOpen, setIsAddLatecomerOpen] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentMatricola, setNewStudentMatricola] = useState<string>('');
  const [newStudentDelay, setNewStudentDelay] = useState<number>(0);
  const [newStudentNote, setNewStudentNote] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    count: number;
    message?: string;
  } | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Status counters
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: newStatus,
            delayMinutes: newStatus === 'late' ? item.delayMinutes || 15 : 0,
          };
        }
        return item;
      })
    );
  };

  const handleDelayChange = (id: string, minutes: number) => {
    setAttendance((prev) =>
      prev.map((item) => (item.id === id ? { ...item, delayMinutes: Math.max(0, minutes) } : item))
    );
  };

  const handleNoteChange = (id: string, note: string) => {
    setAttendance((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  };

  const handleMarkAllPresent = () => {
    setAttendance((prev) =>
      prev.map((item) => ({ ...item, status: 'present', delayMinutes: 0 }))
    );
  };

  // Add student out of list
  const handleAddLatecomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const isLate = newStudentDelay > 0;
    const newItem: StudentAttendanceItem = {
      id: `latecomer-${Date.now()}`,
      name: newStudentName.trim().toUpperCase(),
      matricola: newStudentMatricola.trim() || '-',
      status: isLate ? 'late' : 'present',
      delayMinutes: newStudentDelay,
      note: newStudentNote.trim() || (isLate ? 'Ingresso posticipato' : 'Integrazione in orario'),
      isManualIntegration: true,
    };

    setAttendance((prev) => [...prev, newItem]);
    setNewStudentName('');
    setNewStudentMatricola('');
    setNewStudentDelay(0);
    setNewStudentNote('');
    setIsAddLatecomerOpen(false);
  };

  // Remove student
  const handleRemoveStudent = (id: string) => {
    setAttendance((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit attendance to Google Sheets Webhook and local database
  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);

    const now = new Date();
    const timestampStr = `${now.toLocaleDateString('it-IT')} ore ${now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;


    const recordsToSend: ValidationRecord[] = attendance.map((st) => ({
      id: `val_${Date.now()}_${st.id}`,
      date: payload.date,
      resource: payload.resource,
      timeSlot: payload.timeSlot || 'Turno',
      studentName: st.name.toUpperCase(),
      matricola: st.matricola || '-',
      bookingCode: st.bookingCode || '',
      email: st.email || '',
      status: st.status,
      delayMinutes: st.delayMinutes || 0,
      validationMode: 'TUTOR_QR',
      validatedAt: timestampStr,
      validatedBy: tutorName.trim() || 'Tutor di Turno',

      note: [st.note, st.isManualIntegration ? 'Fuori elenco' : '']
        .filter(Boolean)
        .join(' - '),

      isManualIntegration: st.isManualIntegration,
    }));

    try {
      const result = await sendAttendanceToGoogleSheets(recordsToSend, {
        tutorName: tutorName.trim() || 'Tutor di Turno',
        tutorNotes: tutorNotes.trim(),
        resource: payload.resource,
        date: payload.date,
        timeSlot: payload.timeSlot,
      }, {...payload,tutorPassword});

      setSubmitResult({
        success: result.success,
        count: result.count,
        message: result.error,
      });
    } catch (err: any) {
      console.error('Error submitting attendance:', err);
      setSubmitResult({
        success: false,
        count: recordsToSend.length,
        message: err.message || 'Errore durante la trasmissione dei dati.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = () => {
    const lines = [
      `APPEL TIROCINIO DSV UNITO - ${payload.resource}`,
      `Data: ${formatDateItalian(payload.date)} (${payload.timeSlot || 'Turno'})`,
      `Tutor: ${tutorName || 'Non specificato'} | PIN: ${dailyPin}`,
      `Presenti: ${presentCount} | In Ritardo: ${lateCount} | Assenti: ${absentCount}`,
      `-----------------------------------------`,
      ...attendance.map(
        (st, i) =>
          `${i + 1}. [${st.status.toUpperCase()}] ${st.name} (Matr: ${st.matricola})${
            st.delayMinutes ? ` +${st.delayMinutes}m` : ''
          }${st.note ? ` - ${st.note}` : ''}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  useEffect(()=>{setSubmitResult(null);},[attendance,tutorName,tutorNotes]);
  if(!isOpen)return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={
        isStandalone
          ? 'min-h-screen bg-[#F7F9F8] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans'
          : 'fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans'
      }
    >
      <div
        className={
          isStandalone
            ? 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full shadow-xl overflow-hidden flex flex-col my-auto'
            : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]'
        }
      >
        {/* Top Header */}
        <div className="bg-[#2C4437] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                DSV UniTO &bull; Appello Tutor Digitale
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                Convalida Presenze
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Chiudi sessione"
            title="Chiudi sessione"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Details & Daily PIN Banner */}
        <div className="bg-stone-50 dark:bg-stone-850 p-4 border-b border-stone-200 dark:border-stone-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#3E5C4B] dark:text-[#A3C2B0]" />
              <h3 className="font-extrabold text-stone-900 dark:text-white text-sm sm:text-base">
                {payload.resource}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1 font-semibold text-stone-800 dark:text-stone-200">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                {formatDayNameItalian(payload.date)} {formatDateItalian(payload.date)}
              </span>
              {payload.timeSlot && (
                <span className="flex items-center gap-1 font-mono font-medium">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {payload.timeSlot}
                </span>
              )}
            </div>
          </div>

          {/* Daily PIN Display */}
          <div className="bg-white dark:bg-stone-800 border-2 border-[#3E5C4B]/40 dark:border-emerald-500/40 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xs">
            <div className="p-1.5 bg-[#E8EFEA] dark:bg-emerald-950/60 rounded-lg text-[#2C4437] dark:text-emerald-300">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block tracking-wider">
                PIN Giornaliero del Turno
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg font-black text-[#2C4437] dark:text-emerald-300 tracking-wider">
                  {dailyPin}
                </span>
                <span className="text-[10px] text-stone-400">
                  (mostra agli studenti per auto-convalida)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b space-y-2 text-xs">
          <label className="block font-bold">Codice riservato ai tutor (fornito dalla segreteria)</label>
          <input type="password" autoComplete="off" value={tutorPassword} onChange={e=>setTutorPassword(e.target.value)} className="border rounded p-2 w-full" />
          <button type="button" onClick={unlock} className="border rounded p-2">Verifica accesso e mostra PIN studenti</button>
          <p role="status">{unlockError}</p>
        </div>
        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Submission Success Alert */}
          {submitResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                submitResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {submitResult.success
                    ? `Presenze salvate e trasmesse con successo (${submitResult.count} studenti)!`
                    : `Registrazione non confermata.`}
                </span>
              </div>
              <p className="leading-relaxed text-[11px] opacity-90">
                {submitResult.message ||
                  'I dati dell\'appello sono stati registrati e trasmessi con successo al sistema centrale.'}
              </p>
            </div>
          )}

          {/* Quick Metrics Bar & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 dark:bg-stone-850 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{presentCount} Presenti</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{lateCount} In Ritardo</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold">
                <XCircle className="w-3.5 h-3.5" />
                <span>{absentCount} Assenti</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer text-xs"
              >
                Segna tutti Presenti
              </button>
              <button
                type="button"
                onClick={() => setIsAddLatecomerOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3E5C4B] hover:bg-[#324B3D] text-white font-bold rounded-xl transition-colors cursor-pointer text-xs shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Aggiungi Fuori Elenco</span>
              </button>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-100/70 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Tirocinante</th>
                    <th className="py-2.5 px-3 text-center">Matricola</th>
                    <th className="py-2.5 px-4 text-center">Stato Presenza</th>
                    <th className="py-2.5 px-3 text-center">Ritardo / Minuti</th>
                    <th className="py-2.5 px-3">Note / Integrazione</th>
                    <th className="py-2.5 px-2 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {attendance.map((st) => (
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
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-white uppercase">
                          {st.name}
                        </div>
                        {st.isManualIntegration && (
                          <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold bg-[#E8EFEA] text-[#2C4437] rounded mt-0.5 border border-[#C5D6CC]">
                            Fuori Elenco
                          </span>
                        )}
                      </td>

                      {/* Matricola */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-stone-700 dark:text-stone-300">
                        {st.matricola}
                      </td>

                      {/* Status Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              st.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'late')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              st.status === 'late'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            Ritardo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'absent')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              st.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            Assente
                          </button>
                        </div>
                      </td>

                      {/* Delay Minutes (supports 0 for on-time additions, or positive) */}
                      <td className="py-3 px-3 text-center">
                        {st.status === 'late' ? (
                          <div className="inline-flex items-center gap-1 font-mono">
                            <span className="text-stone-400">+</span>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              step={5}
                              value={st.delayMinutes || 15}
                              onChange={(e) =>
                                handleDelayChange(st.id, parseInt(e.target.value) || 0)
                              }
                              className="w-14 px-1.5 py-0.5 text-center bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 rounded text-xs font-bold"
                            />
                            <span className="text-[10px] text-stone-400">min</span>
                          </div>
                        ) : st.isManualIntegration && st.delayMinutes === 0 ? (
                          <span className="text-[10px] font-bold text-emerald-600">0 min (In orario)</span>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Notes input */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={st.note || ''}
                          onChange={(e) => handleNoteChange(st.id, e.target.value)}
                          placeholder="Annotazione facoltativa..."
                          className="w-full px-2 py-1 bg-transparent hover:bg-white dark:hover:bg-stone-800 focus:bg-white dark:focus:bg-stone-800 border border-transparent focus:border-stone-300 dark:focus:border-stone-700 rounded text-xs transition-colors"
                        />
                      </td>

                      {/* Remove button (especially for manual additions) */}
                      <td className="py-3 px-2 text-center">
                        {st.isManualIntegration && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(st.id)}
                            title="Rimuovi tirocinante"
                            className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Optional Tutor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div>
              <label
                htmlFor="tutor-name-input"
                className="block text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-1"
              >
                Nominativo del Tutor / Docente di Turno
              </label>
              <input
                id="tutor-name-input"
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="Es. Prof. Mario Rossi / Dott.ssa Laura Bianchi"
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label
                htmlFor="tutor-notes-input"
                className="block text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-1"
              >
                Note Generali del Turno
              </label>
              <input
                id="tutor-notes-input"
                type="text"
                value={tutorNotes}
                onChange={(e) => setTutorNotes(e.target.value)}
                placeholder="Es. Attività di chirurgia eseguita regolarmente..."
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-50 dark:bg-stone-850 p-4 border-t border-stone-200 dark:border-stone-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia Riepilogo</span>
                </>
              )}
            </button>

          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              {submitResult?.success ? 'Chiudi e Termina Sessione' : 'Annulla / Chiudi'}
            </button>

            {/* Direct submission button */}
            <button
              type="button"
              onClick={handleSubmitAttendance}
              disabled={isSubmitting || !!submitResult?.success || !tutorPassword || !tutorName.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2C4437] hover:bg-[#203228] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Salva e Invia Presenze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-modal: Aggiungi Studente Fuori Elenco */}
        {isAddLatecomerOpen && (
          <div className="fixed inset-0 z-60 bg-stone-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#3E5C4B]" />
                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-white">
                    Aggiungi Tirocinante Fuori Elenco
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddLatecomerOpen(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddLatecomer} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
                    Cognome e Nome *
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Es. BIANCHI GIULIA"
                    required
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
                      Matricola
                    </label>
                    <input
                      type="text"
                      value={newStudentMatricola}
                      onChange={(e) => setNewStudentMatricola(e.target.value)}
                      placeholder="Es. 954321"
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
                      Minuti di Ritardo (0 se puntuale)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={5}
                      value={newStudentDelay}
                      onChange={(e) => setNewStudentDelay(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px] mb-1">
                    Motivazione / Nota
                  </label>
                  <input
                    type="text"
                    value={newStudentNote}
                    onChange={(e) => setNewStudentNote(e.target.value)}
                    placeholder="Es. Recupero turno concordato con tutor"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddLatecomerOpen(false)}
                    className="px-3 py-1.5 text-stone-500 font-bold"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2C4437] text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Aggiungi al Registro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
