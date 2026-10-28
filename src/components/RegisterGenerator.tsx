import { publicAsset } from '../utils/assets';
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Printer,
  FileSpreadsheet,
  Settings2,
  Calendar,
  Layers,
  Image as ImageIcon,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  FileSignature,
  UserCheck,
  Eye,
  Save,
  RotateCcw,
  Check,
  QrCode,
  Smartphone,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { BookingRecord, RegisterTemplateSettings, ResourceCategoryKey, ValidationShiftPayload } from '../types';
import { PrintableRegister } from './PrintableRegister';
import { AttendanceValidatorModal } from './AttendanceValidatorModal';
import { StudentSelfCheckInModal } from './StudentSelfCheckInModal';
import { GoogleSheetsSettingsModal } from './GoogleSheetsSettingsModal';
import { RESOURCE_CATEGORIES, categorizeResource } from '../utils/csvParser';
import { getWeeksFromRecords, formatDateItalian } from '../utils/dateUtils';

const SETTINGS_STORAGE_KEY = 'unito_register_template_settings';

const DEFAULT_TEMPLATE_SETTINGS: RegisterTemplateSettings = {
  headerTitle: 'UNIVERSITÀ DEGLI STUDI DI TORINO - Dipartimento di Scienze Veterinarie',
  facilitySubtitle: 'Struttura Didattica e Ospedaliera di Medicina Veterinaria',
  documentTitle: 'REGISTRO PRESENZE TIROCINI INTERNI',
  protocolNumber: '',
  academicYear: '2026/2027',
  logoUrl: publicAsset('logo_unito_vet.png'),
  logoHeight: 80,
  showLogo: true,
  footerNotes:
    'Nel registro cartaceo firmare in corrispondenza del proprio nominativo. Nel registro digitale attendere la conferma di registrazione e rivolgersi al tutor in caso di anomalie.',
  footerContactInfo:
    'Tel.: +390116708941 - e-mail: tirocini.dsv@unito.it - Sito web: http://www.unito.it/samev',
  showTutorSignatureBlock: true,
  tutorName: 'Dott. / Prof. Responsabile del Turno',
  showComments: true,
  showBookingCode: true,
  showMatricola: true,
  showEmail: true,
  showDateColumn: true,
  showTimeColumn: true,
  showShiftColumn: true,
  showResourceColumn: true,
  showNameColumn: true,
  showSignatureColumn: true,
  signatureBoxWidth: '180px',
  groupByDay: true,
  compactMode: false,
  registerMode: 'digitale',
  showValidationQrCode: true,
  validationEmail: 'tirocini.dsv@unito.it',
  qrCodeSize: 95,
  qrCodePosition: 'both',
  validationInstructions: 'Scansiona per appello rapido e invio presenze',
  qrCodeDensity: 'simple',
};

interface RegisterGeneratorProps {
  records: BookingRecord[];
}

export const RegisterGenerator: React.FC<RegisterGeneratorProps> = ({ records }) => {
  // Extract all unique dates and weeks
  const dates = useMemo(() => records.map((r) => r.dateStr).filter(Boolean), [records]);
  const weekPresets = useMemo(() => getWeeksFromRecords(dates), [dates]);

  // Extract all unique resources
  const allResources = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.resourceName))).sort();
  }, [records]);

  // Period State (Defaults to 'all' to show the full multi-month report range)
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Resource Selection State (defaults to empty array - deselect all - by default)
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Sync selectedResources whenever allResources changes (e.g. new CSV uploaded)
  React.useEffect(() => {
    if (allResources.length > 0) {
      setSelectedResources((prev) => {
        // Keep valid prev selections
        return prev.filter((r) => allResources.includes(r));
      });
    }
  }, [allResources]);

  // Register Customization Settings
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [activeValidationPayload, setActiveValidationPayload] = useState<ValidationShiftPayload | null>(null);
  const [activeStudentCheckInPayload, setActiveStudentCheckInPayload] = useState<ValidationShiftPayload | null>(null);
  const [templateSettings, setTemplateSettings] = useState<RegisterTemplateSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoUrl === publicAsset('logo_unito_vet.svg')) {
          parsed.logoUrl = publicAsset('logo_unito_vet.png');
        }
        return { ...DEFAULT_TEMPLATE_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('Error loading template settings from localStorage:', e);
    }
    return DEFAULT_TEMPLATE_SETTINGS;
  });

  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState<boolean>(false);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(templateSettings));
      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save template settings:', e);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Sei sicuro di voler ripristinare le impostazioni predefinite del registro?')) {
      setTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
      try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to remove template settings:', e);
      }
      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    }
  };

  // Handle Week Preset Selection
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

  // Toggle single resource selection
  const toggleResource = (resName: string) => {
    setSelectedResources((prev) => {
      if (prev.includes(resName)) {
        return prev.filter((r) => r !== resName);
      } else {
        return [...prev, resName];
      }
    });
  };

  // Preset unification helpers
  const selectCategoryResources = (catKey: string) => {
    const matching = allResources.filter((r) => categorizeResource(r) === catKey);
    if (matching.length > 0) {
      setSelectedResources(matching);
    }
  };

  const selectAllResources = () => {
    setSelectedResources([...allResources]);
  };

  const deselectAllResources = () => {
    setSelectedResources([]);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setTemplateSettings((prev) => ({ ...prev, logoUrl: result, showLogo: true }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter Active Records for the Register (ONLY active/valid non-cancelled bookings by default)
  const filteredActiveRecords = useMemo(() => {
    return records.filter((r) => {
      // Must NOT be cancelled
      if (r.isCancelled) return false;

      // Filter by selected resources
      if (!selectedResources.includes(r.resourceName)) return false;

      // Filter by Date Range
      if (customStartDate && r.dateStr < customStartDate) return false;
      if (customEndDate && r.dateStr > customEndDate) return false;

      return true;
    });
  }, [records, selectedResources, customStartDate, customEndDate]);

  // Labels for Register Header
  const periodLabel = useMemo(() => {
    if (customStartDate && customEndDate) {
      return `Periodo dal ${formatDateItalian(customStartDate)} al ${formatDateItalian(customEndDate)}`;
    }
    if (customStartDate) {
      return `Dal ${formatDateItalian(customStartDate)}`;
    }
    return 'Tutto il periodo in report';
  }, [customStartDate, customEndDate]);

  const selectedResourcesLabel = useMemo(() => {
    if (selectedResources.length === 0) return 'Nessuna risorsa selezionata';
    if (selectedResources.length === 1) return selectedResources[0];
    return selectedResources.join(' + ');
  }, [selectedResources]);

  // Compute standard PDF / file download name:
  // Format: Registro_Risorsa (senza la parola tirocinio)_inizio periodo di riferimento
  // Example: Registro_Piccoli Animali - 17_08_2026
  const computedRegisterFileName = useMemo(() => {
    const cleanSingleResource = (name: string): string => {
      return name
        .replace(/^[a-z]\)\s*/i, '')
        .replace(/\btirocini[oi]?\b/gi, '')
        .replace(/^[\s\-_–—:]+|[\s\-_–—:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    let resourcePart = 'Tutte le Risorse';
    if (selectedResources.length === 1) {
      const cleaned = cleanSingleResource(selectedResources[0]);
      resourcePart = cleaned || selectedResources[0];
    } else if (selectedResources.length > 1) {
      if (allResources.length > 0 && selectedResources.length === allResources.length) {
        resourcePart = 'Tutte le Risorse';
      } else {
        const cleanedList = selectedResources
          .map((r) => cleanSingleResource(r))
          .filter(Boolean);
        resourcePart = cleanedList.length > 0 ? cleanedList.join(' + ') : 'Risorse Selezionate';
      }
    }

    // Determine starting date (inizio periodo di riferimento)
    let effectiveStartDate = customStartDate;
    if (!effectiveStartDate && filteredActiveRecords.length > 0) {
      const sortedDates = [...filteredActiveRecords].map((r) => r.dateStr).filter(Boolean).sort();
      if (sortedDates.length > 0) {
        effectiveStartDate = sortedDates[0];
      }
    }

    let datePart = '';
    if (effectiveStartDate) {
      const parts = effectiveStartDate.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        datePart = `${day}_${month}_${year}`;
      } else {
        datePart = effectiveStartDate.replace(/-/g, '_');
      }
    }

    // Clean characters not permitted in file systems
    const safeResource = resourcePart.replace(/[/\\:*?"<>|]/g, '_').trim();

    if (datePart) {
      return `Registro_${safeResource} - ${datePart}`;
    }
    return `Registro_${safeResource}`;
  }, [selectedResources, allResources, customStartDate, filteredActiveRecords]);

  // Keep document.title synchronized with the computed register file name
  useEffect(() => {
    if (computedRegisterFileName) {
      document.title = computedRegisterFileName;
    }
  }, [computedRegisterFileName]);

  // Print Action
  const handlePrint = () => {
    if(templateSettings.registerMode==='digitale'){
      const qrs=document.querySelectorAll('#printable-register-document [data-qr-state]');
      if(!qrs.length||Array.from(qrs).some(q=>q.getAttribute('data-qr-state')!=='ready')){
        window.alert('I QR non sono ancora pronti. Configurare il collegamento e la credenziale della segreteria, quindi attendere il caricamento di tutti i turni.');return;
      }
    }
    if(computedRegisterFileName)document.title=computedRegisterFileName;
    window.print();
  };

  // Export Active Trainees List to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredActiveRecords.length === 0) return;

    const data = filteredActiveRecords.map((r, i) => ({
      'N.': i + 1,
      'Giorno': r.dateStr,
      'Data Formattata': formatDateItalian(r.dateStr),
      'Orario Inizio': r.startTimeStr,
      'Orario Fine': r.endTimeStr,
      'Risorsa / Turno': r.resourceName,
      'Cognome': r.lastName,
      'Nome': r.firstName,
      'Email': r.bookedByEmail,
      'Matricola': r.matricola || r.comments || '',
      'Codice Prenotazione': r.bookingCode,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths
    const colWidths = [
      { wch: 5 },  // N.
      { wch: 12 }, // Giorno
      { wch: 22 }, // Data Formattata
      { wch: 14 }, // Orario Inizio
      { wch: 14 }, // Orario Fine
      { wch: 35 }, // Risorsa / Turno
      { wch: 20 }, // Cognome
      { wch: 20 }, // Nome
      { wch: 30 }, // Email
      { wch: 15 }, // Matricola
      { wch: 20 }, // Codice Prenotazione
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro Presenze');

    const fileName = `${computedRegisterFileName}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:p-0 print:m-0 print:max-w-none">
      {/* Controls Bar - Hidden during printing */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6 space-y-6 print:hidden">
        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#3E5C4B] dark:text-[#A3C2B0]">
                <FileSignature className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                Creazione Registro Settimanale
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Scegli tra registro cartaceo con firma manuale o registro digitale con QR Code e PIN giornaliero.
            </p>
          </div>

          {/* Mode Switcher & Cloud Config & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Switcher Tab */}
            <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex items-center border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setTemplateSettings({ ...templateSettings, registerMode: 'cartaceo' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  templateSettings.registerMode === 'cartaceo'
                    ? 'bg-white dark:bg-stone-900 text-[#2C4437] dark:text-[#A3C2B0] shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="Genera registro tradizionale A4 ottimizzato per firma manuale del tirocinante"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>1. Cartaceo (Firma a Mano)</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateSettings({ ...templateSettings, registerMode: 'digitale' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  templateSettings.registerMode === 'digitale'
                    ? 'bg-[#2C4437] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="Genera registro digitale con QR Code per appello tutor, QR studente e PIN giornaliero"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>2. Digitale (QR Code & PIN)</span>
              </button>
            </div>

            {/* Google Sheets Config Button */}
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
              title="Configura il Webhook di Google Apps Script per sincronizzare i dati sul Foglio Google"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Foglio Google</span>
            </button>

            {/* Actions - Graphically isolated and compact card */}
            <div className="bg-stone-50/90 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-xl p-1.5 flex items-center gap-1.5 shadow-2xs">
              <button
                onClick={handleExportExcel}
                disabled={filteredActiveRecords.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all disabled:opacity-50 cursor-pointer"
                title="Esporta il registro corrente in un file Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={filteredActiveRecords.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#3E5C4B] hover:bg-[#324B3D] rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Stampa / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Grid: 1) Periodo, 2) Risorse / Unificazione */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section 1: Period Selection */}
          <div className="lg:col-span-5 space-y-4 bg-[#F2F4F1] dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#3E5C4B]" />
                <span>1) Periodo di Riferimento</span>
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950/60 text-[#2C4437] dark:text-[#A3C2B0] border border-emerald-200/70 dark:border-emerald-800/60">
                Sabato &ndash; Venerdì
              </span>
            </div>

            {/* Presets Week Dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="week-presets-select" className="text-[11px] font-medium text-stone-700 dark:text-stone-300">
                  Seleziona Settimana Predefinita (Sab &ndash; Ven)
                </label>
              </div>
              <select
                id="week-presets-select"
                value={selectedWeekKey}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-2 text-xs font-medium text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
              >
                <option value="all">Tutto il periodo disponibile nel CSV</option>
                {weekPresets.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-stone-600 dark:text-stone-400">
                Allineato all'estrazione report del venerdì dopo le 15:00 (consente modifiche entro l'orario).
              </p>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="custom-start-date" className="text-[11px] font-medium text-stone-600 dark:text-stone-300 block mb-1">
                  Data Inizio
                </label>
                <input
                  id="custom-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setSelectedWeekKey('custom');
                  }}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
                />
              </div>

              <div>
                <label htmlFor="custom-end-date" className="text-[11px] font-medium text-stone-600 dark:text-stone-300 block mb-1">
                  Data Fine
                </label>
                <input
                  id="custom-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setSelectedWeekKey('custom');
                  }}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
                />
              </div>
            </div>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between pt-1">
              <span>Filtro applicato:</span>
              <span className="font-semibold text-[#3E5C4B] dark:text-[#A3C2B0]">
                {periodLabel}
              </span>
            </div>
          </div>

          {/* Section 2: Shift / Resource Selection & Unification */}
          <div className="lg:col-span-7 space-y-4 bg-[#F2F4F1] dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#3E5C4B]" />
                <span>2) Selezione Risorsa e Unificazione Turni</span>
              </label>

              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {selectedResources.length} risorse selezionate
              </span>
            </div>

            {/* Top Bar: Left "Unifica veloci" container & Right stacked "Tutte le Risorse / Deseleziona tutto" buttons */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-3 pb-2 border-b border-stone-200 dark:border-stone-700">
              {/* Left Container: Unifica Veloci */}
              <div className="flex-1 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-700/80 rounded-xl p-2.5 flex flex-col justify-center gap-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-400">
                  Unifica veloci:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectCategoryResources('ospedale')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#E8EFEA] text-[#2C4437] dark:bg-[#1E2E25] dark:text-[#A3C2B0] font-semibold border border-[#C5D6CC]/60 hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    1) Ospedale (a + b + c)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCategoryResources('azienda_zootecnica')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EAF1EF] text-[#2D453E] dark:bg-[#1C2C28] dark:text-[#A8C7BE] font-semibold border border-[#C1D6D0]/60 hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    2) Azienda Zootecnica
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCategoryResources('skill_lab')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F4F1EC] text-[#4A4135] dark:bg-[#2A261F] dark:text-[#D1C7B8] font-semibold border border-[#D8D1C7]/60 hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    3) Skill Lab (tutti)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCategoryResources('buiatri')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F9F3EE] text-[#5C422C] dark:bg-[#302318] dark:text-[#E0C8B3] font-semibold border border-[#E3D4C6]/60 hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    4) Buiatri (tutti)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectCategoryResources('izs')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EDF1EE] text-[#394B41] dark:bg-[#232F28] dark:text-[#B4C6BC] font-semibold border border-[#C2D1C8]/60 hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    5) Tirocinio IZS
                  </button>
                </div>
              </div>

              {/* Right Stacked Column: Tutte le Risorse & Deseleziona tutto */}
              <div className="flex flex-col justify-center gap-1.5 min-w-[150px]">
                <button
                  type="button"
                  onClick={selectAllResources}
                  className="w-full text-xs py-1.5 px-3 rounded-lg bg-[#3E5C4B] hover:bg-[#324B3D] text-white font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Tutte le Risorse</span>
                </button>

                <button
                  type="button"
                  onClick={deselectAllResources}
                  className="w-full text-xs py-1.5 px-3 rounded-lg bg-rose-100 dark:bg-rose-950/70 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Deseleziona tutto</span>
                </button>
              </div>
            </div>

            {/* Categorized Resource Group Lists */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(['ospedale', 'azienda_zootecnica', 'skill_lab', 'buiatri', 'izs'] as ResourceCategoryKey[]).map((catKey) => {
                const catInfo = RESOURCE_CATEGORIES[catKey];
                if (!catInfo) return null;

                const catResources = allResources.length > 0
                  ? allResources.filter((r) => categorizeResource(r) === catKey)
                  : catInfo.defaultResources;

                if (catResources.length === 0) return null;

                const allCatSelected = catResources.length > 0 && catResources.every((r) => selectedResources.includes(r));

                return (
                  <div
                    key={catKey}
                    className="bg-white/90 dark:bg-stone-900/90 rounded-xl p-3 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: catInfo.color }}
                        />
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {catInfo.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => selectCategoryResources(catKey)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-[#3E5C4B] hover:bg-[#E8EFEA] dark:hover:bg-[#1E2E25] dark:hover:text-[#A3C2B0] transition-colors cursor-pointer"
                      >
                        {allCatSelected ? 'Selezionato' : 'Seleziona gruppo'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {catResources.map((resName, idx) => {
                        const isSelected = selectedResources.includes(resName);
                        
                        // Format display label with a), b), c)... except for IZS
                        let displayLabel = resName;
                        if (catKey !== 'izs' && !/^[a-z]\)/i.test(resName)) {
                          const letter = String.fromCharCode(97 + idx);
                          displayLabel = `${letter}) ${resName}`;
                        }

                        return (
                          <button
                            key={resName}
                            type="button"
                            onClick={() => toggleResource(resName)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-stone-50 dark:bg-stone-800/90 border-[#3E5C4B] font-semibold text-stone-900 dark:text-white shadow-2xs'
                                : 'bg-stone-50/40 dark:bg-stone-800/20 border-stone-200/70 dark:border-stone-800/60 text-stone-600 dark:text-stone-400 opacity-75 hover:opacity-100'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97] flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" />
                            )}
                            <span className="truncate flex-1">{displayLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Customization Toggle Button - Isolated after Section 2 */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 mr-4" />
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition-all shadow-2xs cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" />
            <span>Personalizza Registro & Logo</span>
            {showSettingsPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 ml-4" />
        </div>

        {/* Customization Settings Drawer */}
        {showSettingsPanel && (
          <div className="bg-[#F2F4F1] dark:bg-stone-800/80 p-5 rounded-xl border border-stone-200 dark:border-stone-700 space-y-4 transition-all shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-700">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#3E5C4B]" />
                <span>Personalizzazione Intestazione, Piè di Pagina e Logo</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white bg-stone-200/60 dark:bg-stone-700/60 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-all cursor-pointer"
                  title="Ripristina impostazioni predefinite"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ripristina</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#3E5C4B] hover:bg-[#324B3D] rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Salva le preferenze nel browser"
                >
                  {settingsSaveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Preferenze Salvate!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salva Preferenze</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsPanel(false)}
                  className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 font-semibold px-2 py-1 rounded-md cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Field 1: Header Title */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Intestazione Ente / Università
                </label>
                <input
                  type="text"
                  value={templateSettings.headerTitle}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, headerTitle: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Field 2: Facility Subtitle */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Sotto-Intestazione Struttura
                </label>
                <input
                  type="text"
                  value={templateSettings.facilitySubtitle}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, facilitySubtitle: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Field 3: Document Title */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Titolo Personalizzato del Registro
                </label>
                <input
                  type="text"
                  value={templateSettings.documentTitle}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, documentTitle: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Field 4: Protocol & Year */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Anno Accademico
                </label>
                <input
                  type="text"
                  value={templateSettings.academicYear}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, academicYear: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>



              {/* Logo Settings Section */}
              <div className="space-y-3 bg-white dark:bg-stone-900/90 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Logo dell'Ente / Dipartimento
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateSettings.showLogo}
                      onChange={(e) =>
                        setTemplateSettings({ ...templateSettings, showLogo: e.target.checked })
                      }
                      className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                    />
                    <span>Mostra Logo nel Registro</span>
                  </label>
                </div>

                {templateSettings.showLogo && (
                  <>
                    {/* Logo Preview Thumbnail */}
                    <div className="flex items-center gap-3 p-2 bg-stone-50 dark:bg-stone-800/80 rounded-lg border border-stone-200 dark:border-stone-700">
                      <div className="bg-white p-1 rounded border border-stone-200 dark:border-stone-700 flex items-center justify-center min-w-[80px] h-[50px]">
                        <img
                          src={templateSettings.logoUrl || publicAsset('logo_unito_vet.png')}
                          alt="Anteprima Logo"
                          className="max-h-[44px] max-w-[120px] object-contain"
                        />
                      </div>
                      <div className="text-xs text-stone-600 dark:text-stone-300 flex-1">
                        <span className="font-bold block">
                          {templateSettings.logoUrl === publicAsset('logo_unito_vet.png') || !templateSettings.logoUrl
                            ? 'Logo Ufficiale UniTO / DSV'
                            : 'Logo Personalizzato Caricato'}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Altezza: {templateSettings.logoHeight || 80}px
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-stone-500 font-medium">Regola Dimensione Logo:</span>
                        <span className="text-[11px] font-bold text-[#3E5C4B] dark:text-[#88AD97]">
                          {templateSettings.logoHeight || 80} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="160"
                        step="5"
                        value={templateSettings.logoHeight || 80}
                        onChange={(e) =>
                          setTemplateSettings({
                            ...templateSettings,
                            logoHeight: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-[#3E5C4B] cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-file-input"
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer transition-colors shadow-2xs"
                      >
                        <ImageIcon className="w-4 h-4 text-[#3E5C4B]" />
                        <span>Sostituisci Logo</span>
                      </label>

                      {templateSettings.logoUrl !== publicAsset('logo_unito_vet.png') && (
                        <button
                          type="button"
                          onClick={() =>
                            setTemplateSettings({ ...templateSettings, logoUrl: publicAsset('logo_unito_vet.png') })
                          }
                          className="px-2.5 py-1.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Ripristina Logo Ufficiale UniTO"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Ripristina Logo Ufficiale</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Notes */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Note
                </label>
                <textarea
                  rows={2}
                  value={templateSettings.footerNotes}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, footerNotes: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* Footer Contact Info */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Contatti e Piè di Pagina
                </label>
                <textarea
                  rows={2}
                  value={templateSettings.footerContactInfo ?? ''}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, footerContactInfo: e.target.value })
                  }
                  placeholder="Tel., e-mail, sito web..."
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>

              {/* Tutor Name */}
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Nome Tutor / Responsabile per la Firma
                </label>
                <input
                  type="text"
                  value={templateSettings.tutorName}
                  onChange={(e) =>
                    setTemplateSettings({ ...templateSettings, tutorName: e.target.value })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5"
                />
              </div>

              {/* QR Code Attendance Validation Section */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3 bg-[#EAF2ED] dark:bg-[#1C2C24] p-4 rounded-xl border border-[#BBD0C3] dark:border-[#2D4537] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#C5D9CD] dark:border-[#2D4537] pb-2.5">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2C4437] dark:text-[#A3C2B0]">
                      Convalida Presenze con QR Code (Appello Digitale Docente)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#2C4437] dark:text-[#A3C2B0] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={templateSettings.showValidationQrCode !== false}
                        onChange={(e) =>
                          setTemplateSettings({ ...templateSettings, showValidationQrCode: e.target.checked })
                        }
                        className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                      />
                      <span>Abilita QR Code nei Registri</span>
                    </label>
                  </div>
                </div>

                {templateSettings.showValidationQrCode !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 text-xs">
                    {/* Field: Destination Email */}
                    <div className="lg:col-span-2">
                      <label className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                        Email Istituzionale di Ricezione Convalide
                      </label>
                      <input
                        type="email"
                        value={templateSettings.validationEmail || 'tirocini.dsv@unito.it'}
                        onChange={(e) =>
                          setTemplateSettings({ ...templateSettings, validationEmail: e.target.value })
                        }
                        placeholder="tirocini.dsv@unito.it"
                        className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                      />
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 block">
                        Indirizzo email predefinito della Segreteria Tirocini a cui il docente invia l'appello con un tap.
                      </span>
                    </div>

                    {/* Field: QR Position */}
                    <div>
                      <label className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                        Posizionamento nel Documento
                      </label>
                      <select
                        value={templateSettings.qrCodePosition || 'both'}
                        onChange={(e) =>
                          setTemplateSettings({
                            ...templateSettings,
                            qrCodePosition: e.target.value as 'both' | 'groups' | 'footer',
                          })
                        }
                        className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <option value="both">Sia nei turni che nel piè di pagina</option>
                        <option value="groups">Solo nei gruppi giornalieri/turno</option>
                        <option value="footer">Solo nel piè di pagina riassuntivo</option>
                      </select>
                    </div>

                    {/* Field: QR Density / Texture Complexity */}
                    <div>
                      <label className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                        Trama QR Code (Complessità)
                      </label>
                      <select
                        value={templateSettings.qrCodeDensity || 'simple'}
                        onChange={(e) =>
                          setTemplateSettings({
                            ...templateSettings,
                            qrCodeDensity: e.target.value as 'simple' | 'detailed',
                          })
                        }
                        className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2C4437] dark:text-[#A3C2B0]"
                      >
                        <option value="simple">Semplificata (Pixel Grandi - Lettura Immediata)</option>
                        <option value="detailed">Dettagliata (Trama Fitta)</option>
                      </select>
                    </div>

                    {/* Field: QR Size Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-stone-800 dark:text-stone-200">
                          Dimensione QR Code:
                        </label>
                        <span className="font-bold text-[#3E5C4B] dark:text-[#88AD97]">
                          {templateSettings.qrCodeSize || 95} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="65"
                        max="140"
                        step="5"
                        value={templateSettings.qrCodeSize || 95}
                        onChange={(e) =>
                          setTemplateSettings({
                            ...templateSettings,
                            qrCodeSize: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-[#3E5C4B] cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg mt-1.5"
                      />
                    </div>

                    {/* Field: Validation Instructions */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                        Istruzioni / Dicitura per il Docente (sotto il QR)
                      </label>
                      <input
                        type="text"
                        value={templateSettings.validationInstructions ?? ''}
                        onChange={(e) =>
                          setTemplateSettings({
                            ...templateSettings,
                            validationInstructions: e.target.value,
                          })
                        }
                        placeholder="Scansiona per appello rapido e invio presenze"
                        className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    <p className="text-xs text-stone-600">Per aprire l’appello usare il pulsante del QR sul turno desiderato. Gli invii effettuati da questa versione sono registrazioni reali sul Foglio configurato.</p>

                  </div>
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-700">
              <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                Gestione Colonne del Registro (Seleziona quali colonne mostrare):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.groupByDay}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, groupByDay: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Raggruppa per Giorno</span>
                </label>

                {!templateSettings.groupByDay && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                    <input
                      type="checkbox"
                      checked={templateSettings.showDateColumn !== false}
                      onChange={(e) =>
                        setTemplateSettings({ ...templateSettings, showDateColumn: e.target.checked })
                      }
                      className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                    />
                    <span>Colonna Giorno e Data</span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showTimeColumn !== false}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showTimeColumn: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Orario</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showShiftColumn !== false}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showShiftColumn: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Turno</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showResourceColumn !== false}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showResourceColumn: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Risorsa</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showNameColumn !== false}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showNameColumn: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Cognome e Nome</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showMatricola}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showMatricola: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Matricola</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showBookingCode}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showBookingCode: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Codice Prenotazione (CODICE)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showSignatureColumn !== false}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showSignatureColumn: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Colonna Firma del Tirocinante</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={templateSettings.showEmail}
                    onChange={(e) =>
                      setTemplateSettings({ ...templateSettings, showEmail: e.target.checked })
                    }
                    className="rounded text-[#3E5C4B] focus:ring-[#3E5C4B]"
                  />
                  <span>Mostra Email sotto il Nome</span>
                </label>
              </div>
            </div>

            {/* Customization Panel Bottom Action Bar */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium text-center sm:text-left">
                  Le personalizzazioni vengono applicate in tempo reale e salvate in locale nel browser.
                </span>
                {settingsSaveSuccess && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    <span>Preferenze salvate!</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-700/70 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Ripristina le impostazioni iniziali del registro"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ripristina Predefiniti</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-[#3E5C4B] hover:bg-[#324B3D] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Salva le preferenze per le sessioni future"
                >
                  {settingsSaveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Preferenze Salvate!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salva Preferenze</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Counter Summary */}
        <div className="flex items-center justify-between bg-[#E8EFEA]/80 dark:bg-[#1E2E25]/50 p-3 px-4 rounded-xl border border-[#C5D6CC] dark:border-[#2C4437] text-xs text-[#2C4437] dark:text-[#A3C2B0] font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" />
            <span>
              <strong>{filteredActiveRecords.length}</strong> tirocinanti idonei iscritti da far firmare
            </span>
          </div>
          <span className="hidden sm:inline opacity-80">
            I tirocinanti cancellati sono stati automaticamente esclusi dal registro
          </span>
        </div>
      </div>

      {/* Printable Document Sheet Preview Header Toolbar */}
      <div className="bg-white dark:bg-stone-900 p-4 px-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#E8EFEA] dark:bg-[#1E2E25] text-[#3E5C4B] dark:text-[#A3C2B0] flex-shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Anteprima del Registro Pronto per la Stampa
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#2C4437] dark:bg-[#1E2E25] dark:text-[#A3C2B0] border border-[#C5D6CC]/60">
                Formato A4
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              <span>{filteredActiveRecords.length} iscritti</span>
              <span>&bull;</span>
              <span>{periodLabel}</span>
              <span>&bull;</span>
              <span className="font-mono text-[11px] text-[#2C4437] dark:text-[#A3C2B0] bg-stone-100 dark:bg-stone-800/80 px-1.5 py-0.5 rounded">
                {computedRegisterFileName}.pdf
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredActiveRecords.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 transition-all disabled:opacity-50 cursor-pointer"
            title="Esporta il registro in un foglio Microsoft Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Esporta Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={filteredActiveRecords.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-extrabold text-white bg-[#3E5C4B] hover:bg-[#324B3D] rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Apri la finestra di dialogo per stampare o salvare in PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Stampa / Salva PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Document Sheet Container */}
      <div className="bg-stone-200/70 dark:bg-stone-950 p-4 md:p-8 rounded-2xl shadow-inner border border-stone-300 dark:border-stone-800 overflow-x-auto print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:overflow-visible print:block print:w-full">
        <div className="max-w-[210mm] mx-auto bg-white shadow-xl rounded-xs print:shadow-none print:max-w-none print:m-0 print:p-0 print:w-full">
          <PrintableRegister
            records={filteredActiveRecords}
            settings={templateSettings}
            periodLabel={periodLabel}
            selectedResourcesLabel={selectedResourcesLabel}
            onOpenValidator={(payload) => setActiveValidationPayload(payload)}
            onOpenStudentCheckIn={(payload) => setActiveStudentCheckInPayload(payload)}
          />
        </div>
      </div>

      {/* Attendance Validator Modal (Tutor Roll Call) */}
      {activeValidationPayload && (
        <AttendanceValidatorModal
          payload={activeValidationPayload}
          isOpen={!!activeValidationPayload}
          onClose={() => setActiveValidationPayload(null)}
          defaultTutorName={templateSettings.tutorName}
        />
      )}

      {/* Student Self-Check-In Modal (QR Code & PIN) */}
      {activeStudentCheckInPayload && (
        <StudentSelfCheckInModal
          payload={activeStudentCheckInPayload}
          isOpen={!!activeStudentCheckInPayload}
          onClose={() => setActiveStudentCheckInPayload(null)}
        />
      )}

      {/* Google Sheets Webhook Configuration Modal */}
      <GoogleSheetsSettingsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />
    </div>
  );
};
