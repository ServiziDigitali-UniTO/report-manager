import { publicAsset } from './utils/assets';
import React, { useState, useMemo, useEffect } from 'react';
import { DEFAULT_AFFLUENCES_CSV } from './data/defaultCsv';
import { parseAffluencesCsv } from './utils/csvParser';
import { Header } from './components/Header';
import { RegisterGenerator } from './components/RegisterGenerator';
import { StatisticsDashboard } from './components/StatisticsDashboard';
import { CsvUploader } from './components/CsvUploader';
import { StudentHistory } from './components/StudentHistory';
import { ShiftResourceReport } from './components/ShiftResourceReport';
import { AccessibilityModal } from './components/AccessibilityModal';
import { AttendanceValidatorModal } from './components/AttendanceValidatorModal';
import { StudentSelfCheckInModal } from './components/StudentSelfCheckInModal';
import { GoogleSheetsSettingsModal } from './components/GoogleSheetsSettingsModal';
import { formatDateItalian } from './utils/dateUtils';
import { resolveShift } from './services/shifts';
import { ValidationShiftPayload } from './types';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'registers' | 'statistics' | 'uploader' | 'studentHistory' | 'shiftReport'>('registers');
  const [csvContent, setCsvContent] = useState<string>(DEFAULT_AFFLUENCES_CSV);
  const [fileName, setFileName] = useState<string>('Report_Affluences_Sample.csv');
  const [isUsingSampleData, setIsUsingSampleData] = useState<boolean>(true);
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [validatorPayload, setValidatorPayload] = useState<ValidationShiftPayload | null>(null);
  const [studentCheckInPayload, setStudentCheckInPayload] = useState<ValidationShiftPayload | null>(null);

  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      return (
        hash.startsWith('#valida-studente') ||
        hash.startsWith('#studente') ||
        hash.startsWith('#appello') ||
        hash.startsWith('#valida') ||
        hash.startsWith('#tutor') ||
        hash.startsWith('#sessione-conclusa')
      );
    }
    return false;
  });
  const [routeError,setRouteError]=useState('');
  const [routeLoading,setRouteLoading]=useState(false);
  const [sessionEnded, setSessionEnded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.startsWith('#sessione-conclusa');
    }
    return false;
  });

  // QR links carry a server-issued capability, never an editable roster.
  useEffect(()=>{
    let version=0;
    const route=async()=>{
      const request=++version,hash=window.location.hash;
      if(hash.startsWith('#sessione-conclusa')){setIsStandaloneMode(true);setSessionEnded(true);return;}
      const student=hash.startsWith('#valida-studente')||hash.startsWith('#studente');
      const tutor=!student&&(hash.startsWith('#appello')||hash.startsWith('#valida')||hash.startsWith('#tutor'));
      if(!student&&!tutor){setIsStandaloneMode(false);return;}
      setIsStandaloneMode(true);setSessionEnded(false);setStudentCheckInPayload(null);setValidatorPayload(null);setRouteError('');setRouteLoading(true);
      try{
        const params=new URLSearchParams(hash.split('?')[1]||'');
        const shift=params.get('shift'),token=params.get('token');
        if(!shift||!token)throw new Error('Questo QR appartiene alla versione precedente. Richiedere un registro con QR aggiornati.');
        const payload=await resolveShift(shift,token);
        if(payload.role!==(student?'student':'tutor'))throw new Error('Il QR non corrisponde al tipo di accesso richiesto.');
        if(request!==version)return;
        if(student)setStudentCheckInPayload(payload);else setValidatorPayload(payload);
      }catch(e:any){if(request===version)setRouteError(e.message);}
      finally{if(request===version)setRouteLoading(false);}
    };
    void route();window.addEventListener('hashchange',route);return()=>{version++;window.removeEventListener('hashchange',route);};
  },[]);

  // Handle closing standalone view -> session ended
  const handleStandaloneClose = () => {
    setSessionEnded(true);
    setStudentCheckInPayload(null);
    setValidatorPayload(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + '#sessione-conclusa');
    }
  };

  // Parse records from current CSV content (Hook must run unconditionally)
  const records = useMemo(() => {
    return parseAffluencesCsv(csvContent);
  }, [csvContent]);

  // Dataset metadata (Hooks must run unconditionally)
  const totalRecordsCount = records.length;
  const uniqueResources = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.resourceName))).sort();
  }, [records]);

  const dateRangeStr = useMemo(() => {
    const dates = records.map((r) => r.dateStr).filter(Boolean).sort();
    if (dates.length === 0) return '';
    const minD = formatDateItalian(dates[0]);
    const maxD = formatDateItalian(dates[dates.length - 1]);
    return `${minD} - ${maxD}`;
  }, [records]);

  const handleCsvLoaded = (newCsvText: string, newFileName: string) => {
    setCsvContent(newCsvText);
    setFileName(newFileName);
    setIsUsingSampleData(false);
    setStatusAnnouncement(`File CSV "${newFileName}" caricato con successo.`);
  };

  const handleResetToDefault = () => {
    setCsvContent(DEFAULT_AFFLUENCES_CSV);
    setFileName('Report_Affluences_Sample.csv');
    setIsUsingSampleData(true);
    setStatusAnnouncement('Dataset di esempio predefinito ripristinato.');
  };

  // Retrieve custom logo uploaded in settings if available
  const customLogoUrl = useMemo(() => {
    try {
      const saved = localStorage.getItem('unito_register_template_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoUrl && parsed.logoUrl !== publicAsset('logo_unito_vet.svg')) {
          return parsed.logoUrl;
        }
      }
    } catch {
      // ignore
    }
    return publicAsset('logo_unito_vet.png');
  }, []);

  // Standalone Mobile Screen (e.g. Scanned via QR Code on Smartphone)
  if (isStandaloneMode) {
    if(!sessionEnded && (routeLoading||routeError||(!studentCheckInPayload&&!validatorPayload))){
      return <main className="min-h-screen flex items-center justify-center bg-stone-50 p-6"><div role="status" className="max-w-lg bg-white border rounded-2xl p-6"><h1 className="font-bold mb-3">Report Manager — Presenze</h1><p>{routeError||'Caricamento del turno dal Foglio Google…'}</p>{routeError&&<button className="border rounded p-2 mt-4" onClick={()=>location.reload()}>Riprova</button>}</div></main>;
    }
    if (sessionEnded || (!studentCheckInPayload && !validatorPayload)) {
      return (
        <div className="min-h-screen bg-[#F7F9F8] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <img
                src={customLogoUrl}
                alt="UniTO Dipartimento Scienze Veterinarie"
                className="h-16 max-w-[240px] object-contain"
              />
            </div>

            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                DSV UniTO &bull; Tirocini Pratici
              </span>
              <h1 className="text-xl font-black text-stone-900 dark:text-white">
                Sessione Conclusa
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                La sessione è chiusa. La registrazione è confermata soltanto se hai ricevuto una ricevuta o un messaggio di esito positivo prima della chiusura.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400">
              Puoi ora chiudere in sicurezza questa scheda del browser.
            </div>

            <button
              type="button"
              onClick={() => {
                window.close();
                window.location.href = 'about:blank';
              }}
              className="w-full py-3.5 px-4 bg-[#2C4437] hover:bg-[#203228] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              Chiudi Scheda Browser
            </button>
          </div>
        </div>
      );
    }

    if (studentCheckInPayload) {
      return (
        <StudentSelfCheckInModal
          payload={studentCheckInPayload}
          isOpen={true}
          isStandalone={true}
          onClose={handleStandaloneClose}
        />
      );
    }

    if (validatorPayload) {
      return (
        <AttendanceValidatorModal
          payload={validatorPayload}
          isOpen={true}
          isStandalone={true}
          defaultTutorName=""
          onClose={handleStandaloneClose}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-stone-950 text-stone-800 dark:text-stone-100 flex flex-col font-sans transition-colors print:bg-white print:text-black print:min-h-0 print:block">
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility (EN 301 549 9.2.4.1 / WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#2C4437] focus:text-white focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-xs uppercase tracking-wider transition-all"
      >
        Salta al contenuto principale
      </a>

      {/* Screen Reader Live Region for status notifications (EN 301 549 9.4.1.3 / WCAG 4.1.3) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalRecordsCount={totalRecordsCount}
        uniqueResourcesCount={uniqueResources.length}
        dateRangeStr={dateRangeStr}
        fileName={fileName}
        isUsingSampleData={isUsingSampleData}
        onUploadClick={() => setActiveTab('uploader')}
        onOpenAccessibility={() => setIsAccessibilityModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pb-16 outline-none print:p-0 print:pb-0 print:m-0"
      >
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3E5C4B]/50 rounded-xl"
        >
          {activeTab === 'registers' && <RegisterGenerator records={records} />}

          {activeTab === 'statistics' && <StatisticsDashboard records={records} />}

          {activeTab === 'uploader' && (
            <CsvUploader
              onCsvLoaded={handleCsvLoaded}
              onResetToDefault={handleResetToDefault}
              fileName={fileName}
              isUsingSampleData={isUsingSampleData}
              records={records}
              onNavigateToRegisters={() => setActiveTab('registers')}
              onNavigateToStats={() => setActiveTab('statistics')}
              onNavigateToHistory={() => setActiveTab('studentHistory')}
            />
          )}

          {activeTab === 'studentHistory' && (
            <StudentHistory
              records={records}
              onNavigateToUploader={() => setActiveTab('uploader')}
            />
          )}

          {activeTab === 'shiftReport' && (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <ShiftResourceReport
                records={records}
                onOpenGoogleSheetsSettings={() => setIsGoogleSheetsModalOpen(true)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer with Accessibility Info (Art. 12 c. 2 D.Lgs. 82/2022) */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-4 px-6 text-xs font-medium text-stone-600 dark:text-stone-400 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            Tel.: +390116708941 - e-mail:{' '}
            <a
              href="mailto:tirocini.dsv@unito.it"
              className="hover:underline text-stone-800 dark:text-stone-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] rounded"
            >
              tirocini.dsv@unito.it
            </a>{' '}
            - Sito web:{' '}
            <a
              href="http://www.unito.it/samev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-stone-800 dark:text-stone-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] rounded"
            >
              http://www.unito.it/samev
            </a>
          </p>

          <button
            type="button"
            onClick={() => setIsAccessibilityModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#2C4437] dark:text-[#A3C2B0] hover:text-[#1E2E25] dark:hover:text-white font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] rounded px-1.5 py-0.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dichiarazione di Accessibilità (D.Lgs. 82/2022)</span>
          </button>
        </div>
      </footer>

      {/* Accessibility Information Modal */}
      <AccessibilityModal
        isOpen={isAccessibilityModalOpen}
        onClose={() => setIsAccessibilityModalOpen(false)}
      />

      {/* Desktop Attendance Validator Modal */}
      {validatorPayload && (
        <AttendanceValidatorModal
          payload={validatorPayload}
          isOpen={!!validatorPayload}
          onClose={() => {
            setValidatorPayload(null);
            if (window.location.hash.startsWith('#appello') || window.location.hash.startsWith('#valida') || window.location.hash.startsWith('#tutor')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      )}

      {/* URL-triggered Student Self-Check-in Modal (e.g. from student mobile QR code scan) */}
      {studentCheckInPayload && (
        <StudentSelfCheckInModal
          payload={studentCheckInPayload}
          isOpen={!!studentCheckInPayload}
          onClose={() => {
            setStudentCheckInPayload(null);
            if (window.location.hash.startsWith('#valida-studente') || window.location.hash.startsWith('#studente')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      )}

      {/* Google Sheets Webhook Configuration Modal */}
      <GoogleSheetsSettingsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />
    </div>
  );
}
