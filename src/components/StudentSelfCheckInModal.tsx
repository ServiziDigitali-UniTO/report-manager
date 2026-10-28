import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  GraduationCap,
  Calendar,
  Clock,
  Building2,
  Lock,
  ArrowRight,
  Sparkles,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { ValidationShiftPayload, ValidationRecord } from '../types';
import { formatDateItalian, formatDayNameItalian } from '../utils/dateUtils';

import { sendAttendanceToGoogleSheets } from '../services/googleSheetsWebhook';

interface StudentSelfCheckInModalProps {
  payload: ValidationShiftPayload;
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export const StudentSelfCheckInModal: React.FC<StudentSelfCheckInModalProps> = ({
  payload,
  isOpen,
  onClose,
  isStandalone = false,
}) => {


  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    payload.students[0]?.id || 'custom'
  );
  const [customName, setCustomName] = useState<string>('');
  const [customMatricola, setCustomMatricola] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [validatedRecord, setValidatedRecord] = useState<ValidationRecord | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  const selectedStudent = useMemo(() => {
    if (selectedStudentId === 'custom') return null;
    return payload.students.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, payload.students]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    // Validate PIN
    const cleanPin = enteredPin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setPinError('Inserisci il PIN di sei cifre comunicato dal tutor.');
      return;
    }

    // Determine student name and matricola
    let name = '';
    let matricola = '';
    let bookingCode = '';
    let email = '';
    let isManual = false;

    if (selectedStudentId === 'custom') {
      if (!customName.trim()) {
        setPinError('Inserisci il tuo Nome e Cognome.');
        return;
      }
      if (!customMatricola.trim()) {
        setPinError('Inserisci il tuo numero di Matricola.');
        return;
      }
      name = customName.trim().toUpperCase();
      matricola = customMatricola.trim();
      setPinError('Per essere aggiunto fuori elenco rivolgiti al tutor.'); return;
    } else if (selectedStudent) {
      name = selectedStudent.name.toUpperCase();
      matricola = selectedStudent.matricola || '-';
      bookingCode = selectedStudent.bookingCode || '';
      email = selectedStudent.email || '';
    } else {
      setPinError('Seleziona il tuo nominativo dall\'elenco.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const timestampStr = `${now.toLocaleDateString('it-IT')} ore ${now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newRecord: ValidationRecord = {
      id: `val_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: payload.date,
      resource: payload.resource,
      timeSlot: payload.timeSlot || 'Turno',
      studentName: name,
      matricola,
      bookingCode,
      email,
      status: 'present',
      delayMinutes: 0,
      validationMode: 'STUDENTE_QR',
      validatedAt: timestampStr,
      validatedBy: 'Auto-convalida studente',
      pinUsed: cleanPin,
      note: isManual ? 'Integrazione studente fuori elenco' : 'Presenza registrata via QR Code Studente',

      isManualIntegration: isManual,
    };

    try {
      const result=await sendAttendanceToGoogleSheets([newRecord],{resource:payload.resource,date:payload.date,timeSlot:payload.timeSlot},{...payload,pin:cleanPin});
      if(!result.success||!result.records?.[0]){setPinError(result.error||'Registrazione non confermata. Riprovare.');return;}
      setValidatedRecord(result.records[0]);setIsSuccess(true);
    } catch (err:any) {
      setPinError(err.message||'Conferma non ricevuta. Riprovare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!validatedRecord) return;
    const text = `RICEVUTA CONVALIDA PRESENZA TIROCINIO DSV UNITO\nNominativo: ${validatedRecord.studentName}\nMatricola: ${validatedRecord.matricola}\nReparto: ${validatedRecord.resource}\nData: ${validatedRecord.date} (${validatedRecord.timeSlot})\nCodice ricevuta: ${validatedRecord.securityHash}\nRegistrata il: ${validatedRecord.validatedAt}`;
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  if(!isOpen)return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={
        isStandalone
          ? 'min-h-screen bg-[#F7F9F8] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans'
          : 'fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans'
      }
    >
      <div
        className={
          isStandalone
            ? 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full shadow-xl overflow-hidden my-auto'
            : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200'
        }
      >
        {/* Top Header */}
        <div className="bg-[#2C4437] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                DSV UniTO &bull; Tirocini Pratici
              </span>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Auto-Convalida Presenza Studente
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shift Summary Card */}
        <div className="bg-stone-50 dark:bg-stone-800/60 p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-start gap-3 text-xs text-stone-700 dark:text-stone-300">
            <Building2 className="w-4 h-4 text-[#3E5C4B] dark:text-[#A3C2B0] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-stone-900 dark:text-white text-sm block truncate">
                {payload.resource}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
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
          </div>
        </div>

        {/* Body Content */}
        {!isSuccess ? (
          <form onSubmit={handleValidate} className="p-6 space-y-5">
            {/* Step 1: Identify Student */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                1. Seleziona il tuo nominativo
              </label>

              {payload.students.length > 0 ? (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#3E5C4B] focus:outline-none"
                >
                  {payload.students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.matricola && st.matricola !== '-' ? `(Matr. ${st.matricola})` : ''}
                    </option>
                  ))}
                  
                </select>
              ) : (
                <div className="text-xs text-stone-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 rounded-xl">
                  Nessun tirocinante pre-iscritto in elenco per questo turno. Inserisci i tuoi dati qui sotto:
                </div>
              )}

              {/* Custom inputs if out of list */}
              {selectedStudentId === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                      Cognome e Nome *
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Es. ROSSI MARCO"
                      required
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                      Numero Matricola *
                    </label>
                    <input
                      type="text"
                      value={customMatricola}
                      onChange={(e) => setCustomMatricola(e.target.value)}
                      placeholder="Es. 987654"
                      required
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Enter PIN */}
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pin-input"
                  className="block text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider"
                >
                  2. Inserisci il PIN del turno del Tutor
                </label>
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#3E5C4B]" /> 6 cifre
                </span>
              </div>

              <div className="relative">
                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="6 cifre"
                  className="w-full py-3 px-4 text-center tracking-[0.4em] font-mono text-xl font-black bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[#3E5C4B] focus:outline-none"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Il PIN di sicurezza è esposto sul registro stampato in reparto o comunicato dal Tutor all'inizio del turno.
              </p>

              {pinError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || enteredPin.length !== 6}
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  enteredPin.length === 6 && !isSubmitting
                    ? 'bg-[#2C4437] hover:bg-[#203228] text-white active:scale-98'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Convalida la mia Presenza</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success Receipt Card */
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Presenza Convalidata con Successo
              </span>
              <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">
                Ricevuta di registrazione
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                La tua presenza è stata registrata nel sistema centrale di tirocinio del DSV UniTO.
              </p>
            </div>

            {/* Official Receipt Box */}
            {validatedRecord && (
              <div className="bg-[#F7F9F8] dark:bg-stone-800/80 border border-[#D5E2DA] dark:border-stone-700 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500">Studente:</span>
                  <span className="font-extrabold text-stone-900 dark:text-white">
                    {validatedRecord.studentName}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500">Matricola:</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-white">
                    {validatedRecord.matricola}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500">Reparto:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                    {validatedRecord.resource}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500">Data e Turno:</span>
                  <span className="font-medium text-stone-700 dark:text-stone-300">
                    {formatDateItalian(validatedRecord.date)} ({validatedRecord.timeSlot})
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-stone-500">Codice ricevuta:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                    {validatedRecord.securityHash}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopyReceipt}
                className="flex-1 py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedReceipt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copia Effettuata!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia Ricevuta</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-[#2C4437] hover:bg-[#203228] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Chiudi e Termina
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
