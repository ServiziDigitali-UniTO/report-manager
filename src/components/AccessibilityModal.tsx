import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Eye, Keyboard, Lock, X, Mail, Phone, ExternalLink } from 'lucide-react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key and trap initial focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-modal-title"
      aria-describedby="accessibility-modal-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-[#F2F4F1] dark:bg-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3E5C4B] text-white">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="accessibility-modal-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-100"
              >
                Informazioni sull'Accessibilità
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                In attuazione del D.Lgs. 27 maggio 2022, n. 82 e Linee Guida AgID
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Chiudi finestra informazioni sull'accessibilità"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Content */}
        <div id="accessibility-modal-desc" className="p-6 space-y-6 overflow-y-auto text-sm text-stone-700 dark:text-stone-300">
          {/* Section 1: Stato di conformità */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
              <span>Stato di Conformità e Standard Tecnici</span>
            </h3>
            <p className="leading-relaxed">
              L'applicazione web <strong>Report Manager</strong> è progettata e realizzata
              in conformità con il <strong>Decreto Legislativo 27 maggio 2022, n. 82</strong> (che recepisce la Direttiva UE 2019/882 – European Accessibility Act)
              e con le <strong>Linee Guida AgID sull'accessibilità dei servizi</strong> (versione 1.0 del 04.03.2026).
            </p>
            <p className="leading-relaxed">
              L'applicazione adotta come riferimento tecnico lo standard armonizzato europeo{' '}
              <strong>UNI CEI EN 301 549 v3.2.1</strong> e soddisfa i requisiti di conformità del{' '}
              <strong>Livello AA</strong> delle <strong>Web Content Accessibility Guidelines (WCAG 2.1)</strong> del W3C, fondate sui quattro pilastri:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600 dark:text-stone-400">
              <li><strong>Percepibile:</strong> layout ad alto contrasto, testi ridimensionabili, descrizioni alternative per elementi non testuali.</li>
              <li><strong>Operabile:</strong> navigazione integrale tramite tastiera, skip-link verso il contenuto principale, controlli temporali assenti o non bloccanti.</li>
              <li><strong>Comprensibile:</strong> etichettatura chiara di tutti i campi modulo, messaggi di errore contestuali, linguaggio coerente.</li>
              <li><strong>Robusto:</strong> markup semantico conforme agli standard HTML5 e ARIA per la piena interoperabilità con screen reader e tecnologie assistive.</li>
            </ul>
          </section>

          {/* Section 2: Privacy e Assenza di Tracciamento */}
          <section className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
            <h3 className="text-sm font-bold text-[#2C4437] dark:text-[#A3C2B0] flex items-center gap-2">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>Dichiarazione sul Non-Tracciamento delle Tecnologie Assistive</span>
            </h3>
            <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
              In ottemperanza all'articolo 12, comma 2 del D.Lgs. 82/2022 e a quanto prescritto dal paragrafo 5.1 (pag. 29-30) delle Linee Guida AgID:
            </p>
            <p className="text-xs font-medium leading-relaxed text-emerald-950 dark:text-emerald-100 bg-white/70 dark:bg-stone-900/60 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
              Il fornitore dichiara formalmente di <strong>non ricorrere ad alcuna tecnica web di tracciamento</strong> (inclusi cookie analitici/profilanti e browser fingerprinting) né da parte propria né di terze parti, dalle quali sia possibile desumere configurazioni, impostazioni d'uso o eventuali condizioni di disabilità dell'utente.
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Tutti i file CSV caricati sono elaborati esclusivamente nella memoria volatile locale del browser e non vengono mai salvati o trasmessi su server remoti.
            </p>
          </section>

          {/* Section 3: Navigazione da Tastiera & Scorciatoie */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
              <span>Interazione da Tastiera e Tecnologie Assistive</span>
            </h3>
            <p className="text-xs leading-relaxed">
              Tutti i pulsanti, menu a tendina, caselle di selezione e caricamento file sono interamente azionabili con la tastiera standard:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <span className="font-semibold block text-stone-800 dark:text-stone-200">Tasto Tab / Shift+Tab</span>
                <span className="text-stone-600 dark:text-stone-400">Sposta il focus in avanti o indietro tra gli elementi interattivi.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <span className="font-semibold block text-stone-800 dark:text-stone-200">Spazio / Invio</span>
                <span className="text-stone-600 dark:text-stone-400">Attiva schede, pulsanti di stampa, download Excel e sfoglia file CSV.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Meccanismo di Feedback e Contatti (Allegato pag. 59) */}
          <section className="space-y-2 border-t border-stone-200 dark:border-stone-800 pt-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Meccanismo di Feedback e Formati Alternativi
            </h3>
            <p className="text-xs leading-relaxed">
              Qualora riscontraste difficoltà nell'accesso a specifiche informazioni o qualora abbiate necessità di ricevere i registri o i report in formati alternativi equivalenti e accessibili, è possibile contattare direttamente la struttura responsabile:
            </p>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold">
                <span>Università degli Studi di Torino</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
                <a
                  href="mailto:tirocini.dsv@unito.it"
                  className="text-[#3E5C4B] dark:text-[#A3C2B0] underline hover:text-[#2C4437] font-medium"
                >
                  tirocini.dsv@unito.it
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
                <span>Tel.: +39 011 6708941</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-[#3E5C4B] dark:text-[#88AD97]" aria-hidden="true" />
                <a
                  href="http://www.unito.it/samev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3E5C4B] dark:text-[#A3C2B0] underline hover:text-[#2C4437] font-medium"
                >
                  http://www.unito.it/samev
                </a>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Data dell'ultima verifica di conformità dell'accessibilità: 22 Settembre 2026.
            </p>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3E5C4B] hover:bg-[#344d3f] text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5C4B]"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
