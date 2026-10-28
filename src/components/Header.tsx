import React from 'react';
import {
  FileSignature,
  BarChart3,
  Upload,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap,
  Building2,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'registers' | 'statistics' | 'uploader' | 'studentHistory' | 'shiftReport';
  setActiveTab: (tab: 'registers' | 'statistics' | 'uploader' | 'studentHistory' | 'shiftReport') => void;
  totalRecordsCount: number;
  uniqueResourcesCount: number;
  dateRangeStr: string;
  fileName: string;
  isUsingSampleData: boolean;
  onUploadClick: () => void;
  onOpenAccessibility?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalRecordsCount,
  uniqueResourcesCount,
  dateRangeStr,
  fileName,
  isUsingSampleData,
  onUploadClick,
  onOpenAccessibility,
}) => {
  return (
    <header className="bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-30 shadow-xs print:hidden">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-[#3E5C4B] p-2.5 rounded-xl text-white shadow-xs" aria-hidden="true">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#3E5C4B] dark:text-[#88AD97]">
                  Report Manager
                </h1>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                Medicina Veterinaria &bull; Registri presenze e analisi affluenze
              </p>
            </div>
          </div>

          {/* Dataset metadata badge & upload trigger - Graphically isolated card moved to the right */}
          <div className="md:ml-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-stone-50/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 rounded-xl p-2.5 sm:px-3.5 sm:py-2.5 shadow-xs">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                  Report prenotazioni Affluences CSV
                </span>
                {isUsingSampleData && (
                  <span className="text-[10px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                    Sample
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-1" title="File in uso">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#3E5C4B] dark:text-[#A3C2B0]" aria-hidden="true" />
                  <span className="font-medium text-stone-700 dark:text-stone-300 truncate max-w-[140px]">
                    {fileName}
                  </span>
                </div>
                <span className="text-stone-300 dark:text-stone-600" aria-hidden="true">•</span>
                <div className="flex items-center gap-1" title="Prenotazioni totali">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
                  <span className="font-bold text-stone-900 dark:text-white">{totalRecordsCount}</span>
                  <span>righe</span>
                </div>
                {dateRangeStr && (
                  <>
                    <span className="text-stone-300 dark:text-stone-600 hidden lg:inline" aria-hidden="true">•</span>
                    <div className="hidden lg:flex items-center gap-1" title="Periodo coperto">
                      <Calendar className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" aria-hidden="true" />
                      <span>{dateRangeStr}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-stone-200 dark:bg-stone-700" aria-hidden="true" />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onUploadClick}
                aria-label="Carica nuovo report CSV di Affluences"
                className="w-full sm:w-auto bg-[#3E5C4B] hover:bg-[#344d3f] text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CARICA</span>
              </button>

              {onOpenAccessibility && (
                <button
                  onClick={onOpenAccessibility}
                  aria-label="Informazioni sull'Accessibilità (D.Lgs. 82/2022)"
                  title="Informazioni sull'Accessibilità (D.Lgs. 82/2022)"
                  className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-700/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-stone-600 dark:text-stone-300" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Navigazione principale tra i moduli di Report Manager">
          <div
            role="tablist"
            aria-label="Moduli dell'applicazione"
            className="flex space-x-1 border-t border-stone-200 dark:border-stone-800 pt-2 overflow-x-auto no-scrollbar"
          >
            <button
              id="tab-registers"
              role="tab"
              aria-selected={activeTab === 'registers'}
              aria-controls="tabpanel-registers"
              onClick={() => setActiveTab('registers')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 ${
                activeTab === 'registers'
                  ? 'bg-[#F2F4F1] dark:bg-stone-800 text-[#3E5C4B] dark:text-[#88AD97] border-[#3E5C4B] shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-transparent'
              }`}
            >
              <FileSignature className="w-4 h-4" aria-hidden="true" />
              <span>1) Generatore Registri Firme</span>
            </button>

            <button
              id="tab-statistics"
              role="tab"
              aria-selected={activeTab === 'statistics'}
              aria-controls="tabpanel-statistics"
              onClick={() => setActiveTab('statistics')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 ${
                activeTab === 'statistics'
                  ? 'bg-[#F2F4F1] dark:bg-stone-800 text-[#3E5C4B] dark:text-[#88AD97] border-[#3E5C4B] shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
              <span>2) Analisi Statistica</span>
            </button>

            <button
              id="tab-uploader"
              role="tab"
              aria-selected={activeTab === 'uploader'}
              aria-controls="tabpanel-uploader"
              onClick={() => setActiveTab('uploader')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 ${
                activeTab === 'uploader'
                  ? 'bg-[#F2F4F1] dark:bg-stone-800 text-[#3E5C4B] dark:text-[#88AD97] border-[#3E5C4B] shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-transparent'
              }`}
            >
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>3) Gestione Dataset ({uniqueResourcesCount} risorse)</span>
            </button>

            <button
              id="tab-studentHistory"
              role="tab"
              aria-selected={activeTab === 'studentHistory'}
              aria-controls="tabpanel-studentHistory"
              onClick={() => setActiveTab('studentHistory')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 ${
                activeTab === 'studentHistory'
                  ? 'bg-[#F2F4F1] dark:bg-stone-800 text-[#3E5C4B] dark:text-[#88AD97] border-[#3E5C4B] shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-transparent'
              }`}
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              <span>4) Storico Studente</span>
            </button>

            <button
              id="tab-shiftReport"
              role="tab"
              aria-selected={activeTab === 'shiftReport'}
              aria-controls="tabpanel-shiftReport"
              onClick={() => setActiveTab('shiftReport')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B] focus-visible:ring-offset-2 ${
                activeTab === 'shiftReport'
                  ? 'bg-[#F2F4F1] dark:bg-stone-800 text-[#3E5C4B] dark:text-[#88AD97] border-[#3E5C4B] shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-transparent'
              }`}
            >
              <Building2 className="w-4 h-4" aria-hidden="true" />
              <span>5) Presenze Turni & Risorse</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
