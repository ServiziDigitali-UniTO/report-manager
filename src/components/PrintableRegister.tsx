import { publicAsset } from '../utils/assets';
import React from 'react';
import { BookingRecord, RegisterTemplateSettings, ValidationShiftPayload } from '../types';
import { formatDateItalian, formatDayNameItalian, getShiftLabel } from '../utils/dateUtils';
import { ServerPin } from './ServerPin';
import { AttendanceQrCode } from './AttendanceQrCode';
import { Lock, QrCode, FileSignature, CheckCircle2, Smartphone } from 'lucide-react';

export const DEFAULT_UNITO_LOGO = publicAsset('logo_unito_vet.png');

interface PrintableRegisterProps {
  records: BookingRecord[];
  settings: RegisterTemplateSettings;
  periodLabel: string;
  selectedResourcesLabel: string;
  onOpenValidator?: (payload: ValidationShiftPayload) => void;
  onOpenStudentCheckIn?: (payload: ValidationShiftPayload) => void;
}

export const PrintableRegister: React.FC<PrintableRegisterProps> = ({
  records,
  settings,
  periodLabel,
  selectedResourcesLabel,
  onOpenValidator,
  onOpenStudentCheckIn,
}) => {
  const isDigitalMode = settings.registerMode === 'digitale';

  // Strictly ensure only non-cancelled active records are printed in the attendance register
  const activeRecordsOnly = records.filter((r) => !r.isCancelled);

  // Sort records chronologically by date and start time, then surname
  const sortedRecords = [...activeRecordsOnly].sort((a, b) => {
    if (a.dateStr !== b.dateStr) {
      return a.dateStr.localeCompare(b.dateStr);
    }
    if (a.startTimeStr !== b.startTimeStr) {
      return a.startTimeStr.localeCompare(b.startTimeStr);
    }
    return a.fullName.localeCompare(b.fullName);
  });

  // Group records by day if setting is enabled
  const groupedByDay: Record<string, BookingRecord[]> = {};
  if (settings.groupByDay || isDigitalMode) {
    sortedRecords.forEach((rec) => {
      const groupKey=JSON.stringify([rec.dateStr,rec.resourceName,rec.startTimeStr.slice(0,5),rec.endTimeStr.slice(0,5)]);
      if(!groupedByDay[groupKey])groupedByDay[groupKey]=[];
      groupedByDay[groupKey].push(rec);
    });
  }

  // Dynamic Column Definitions based on settings and mode
  const getColumns = (isGrouped: boolean) => {
    const cols: Array<{
      id: string;
      label: string;
      weight: number;
      alignClass: string;
      headerAlignClass: string;
      renderCell: (rec: BookingRecord) => React.ReactNode;
    }> = [];

    if (!isGrouped && settings.showDateColumn !== false) {
      cols.push({
        id: 'date',
        label: 'GIORNO E DATA',
        weight: 12,
        alignClass: 'text-left py-2.5 px-3 text-xs',
        headerAlignClass: 'text-left py-2.5 px-2',
        renderCell: (rec) => {
          const formattedDate = formatDateItalian(rec.dateStr);
          const dayName = formatDayNameItalian(rec.dateStr);
          return (
            <div className="whitespace-nowrap">
              <div className="font-semibold text-slate-900 print:text-black">
                {dayName}
              </div>
              <div className="text-[11px] text-slate-600 print:text-slate-800">
                {formattedDate}
              </div>
            </div>
          );
        },
      });
    }

    if (settings.showTimeColumn !== false) {
      cols.push({
        id: 'time',
        label: 'ORARIO',
        weight: 8,
        alignClass: 'text-center py-2 px-1 text-xs font-mono font-bold whitespace-nowrap',
        headerAlignClass: 'text-center py-2.5 px-1',
        renderCell: (rec) => {
          const startTimeFormatted = rec.startTimeStr ? rec.startTimeStr.substring(0, 5) : '';
          return <div className="text-slate-900 print:text-black">{startTimeFormatted}</div>;
        },
      });
    }

    if (settings.showShiftColumn !== false) {
      cols.push({
        id: 'shift',
        label: 'TURNO',
        weight: 12,
        alignClass: 'text-center py-2 px-0.5 text-xs font-bold text-slate-800 uppercase',
        headerAlignClass: 'text-center py-2.5 px-0.5',
        renderCell: (rec) => {
          const shiftLabel = getShiftLabel(rec.startTimeStr);
          let colorStyle = 'bg-stone-100 text-stone-800 border-stone-200';
          if (shiftLabel.includes('DIURNO')) {
            colorStyle = 'bg-amber-50 text-amber-900 border-amber-200/80';
          } else if (shiftLabel.includes('POMERIDIANO')) {
            colorStyle = 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
          } else if (shiftLabel.includes('NOTTURNO')) {
            colorStyle = 'bg-indigo-50 text-indigo-900 border-indigo-200/80';
          }
          return (
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-tight border ${colorStyle} max-w-full truncate`}
            >
              {shiftLabel}
            </span>
          );
        },
      });
    }

    if (settings.showResourceColumn !== false) {
      cols.push({
        id: 'resource',
        label: 'RISORSA',
        weight: 18,
        alignClass: 'text-left py-2 px-2 text-xs font-medium text-slate-800 print:text-black break-words leading-tight',
        headerAlignClass: 'text-left py-2.5 px-2',
        renderCell: (rec) => rec.resourceName,
      });
    }

    if (settings.showNameColumn !== false) {
      cols.push({
        id: 'name',
        label: 'COGNOME E NOME',
        weight: isDigitalMode ? 25 : 22,
        alignClass: 'text-left py-2.5 px-3 text-xs',
        headerAlignClass: 'text-left py-2.5 px-2',
        renderCell: (rec) => (
          <>
            <div className="font-bold text-slate-900 uppercase tracking-tight print:text-black">
              {rec.fullName}
            </div>
            {settings.showEmail && (
              <div className="text-[10px] text-slate-500 print:text-slate-700">
                {rec.bookedByEmail}
              </div>
            )}
          </>
        ),
      });
    }

    if (settings.showMatricola !== false) {
      cols.push({
        id: 'matricola',
        label: 'MATRICOLA',
        weight: 10,
        alignClass: 'text-center py-2.5 px-2 text-xs font-mono text-slate-700 print:text-black whitespace-nowrap',
        headerAlignClass: 'text-center py-2.5 px-1',
        renderCell: (rec) => rec.matricola || rec.comments || '-',
      });
    }

    if (settings.showBookingCode !== false) {
      cols.push({
        id: 'code',
        label: 'CODICE',
        weight: 8,
        alignClass: 'text-center py-2.5 px-2 text-xs font-mono font-bold text-slate-700 print:text-black whitespace-nowrap',
        headerAlignClass: 'text-center py-2.5 px-1',
        renderCell: (rec) => rec.bookingCode || '-',
      });
    }

    // In Cartaceo mode: Signature Box
    if (!isDigitalMode && settings.showSignatureColumn !== false) {
      cols.push({
        id: 'signature',
        label: 'FIRMA DEL TIROCINANTE',
        weight: 30,
        alignClass: 'py-2 px-2 border-l border-slate-300 print:border-slate-400 bg-slate-50/30 print:bg-white',
        headerAlignClass: 'text-center py-2.5 px-2',
        renderCell: () => (
          <div className="h-9 border-b border-dashed border-slate-400 print:border-slate-500 w-full" />
        ),
      });
    }

    // In Digitale mode: Digital Verification / Check Column
    if (isDigitalMode) {
      cols.push({
        id: 'digital_check',
        label: 'CONVALIDA DIGITALE (QR / PIN)',
        weight: 22,
        alignClass: 'py-2 px-2 border-l border-stone-300 print:border-stone-400 text-center',
        headerAlignClass: 'text-center py-2.5 px-2',
        renderCell: (rec) => (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500 print:text-stone-700">
            <span className="w-4 h-4 rounded-full border border-stone-400 inline-block shrink-0" />
            <span className="font-mono text-[9px]">Ricevuta Smartphone</span>
          </div>
        ),
      });
    }

    return cols;
  };

  const renderTable = (items: BookingRecord[], isGrouped: boolean) => {
    const cols = getColumns(isGrouped);
    const totalWeight = cols.reduce((acc, c) => acc + c.weight, 0);

    return (
      <table className="w-full table-fixed border-collapse border border-stone-300 text-left">
        <thead>
          <tr className="bg-[#E8EFEA] text-[#2C4437] text-[10px] font-extrabold uppercase border-b-2 border-[#3E5C4B]">
            {cols.map((col) => {
              const pct = totalWeight > 0 ? Math.round((col.weight / totalWeight) * 1000) / 10 : 0;
              return (
                <th
                  key={col.id}
                  style={{ width: `${pct}%` }}
                  className={`${col.headerAlignClass} whitespace-nowrap`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((rec) => (
            <tr
              key={rec.id}
              className="border-b border-stone-200 text-stone-900 font-sans"
            >
              {cols.map((col) => (
                <td key={col.id} className={col.alignClass}>
                  {col.renderCell(rec)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div
      id="printable-register-document"
      className="w-full bg-white text-stone-900 p-8 print:p-0 print:bg-white min-h-[1050px] flex flex-col justify-between font-sans"
    >
      {/* Header Section */}
      <div>
        <div className="border-b-2 border-stone-800 pb-4 mb-6 print:mb-4 print:pb-3 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold uppercase tracking-wide text-stone-900">
                {settings.headerTitle}
              </h1>
            </div>
            <p className="text-xs font-semibold text-stone-700 uppercase">
              {settings.facilitySubtitle}
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] text-stone-600 pt-1 font-mono">
              {settings.academicYear && (
                <span>
                  A.A.: <strong>{settings.academicYear}</strong>
                </span>
              )}
              <span>
                Data Generazione: <strong>{new Date().toLocaleDateString('it-IT')}</strong>
              </span>
              <span className="font-sans font-bold text-[#2C4437] uppercase text-[10px] bg-[#E8EFEA] px-2 py-0.2 rounded border border-[#C5D6CC]">
                {isDigitalMode ? 'Registro Digitale con QR Code e PIN' : 'Registro Cartaceo per Firma Tradizionale'}
              </span>
            </div>
          </div>

          {/* Logo */}
          {settings.showLogo && (
            <div className="flex-shrink-0 flex items-center justify-end">
              <img
                src={settings.logoUrl || DEFAULT_UNITO_LOGO}
                alt="Logo Struttura"
                style={{ height: `${settings.logoHeight || 80}px` }}
                className="object-contain max-w-[280px] max-h-[140px] transition-all"
              />
            </div>
          )}
        </div>

        {/* Main Document Title Box */}
        <div className="bg-[#E8EFEA]/80 p-3.5 rounded-xl border border-[#C5D6CC] mb-6 print:mb-4">
          <div className="text-center space-y-1">
            <span className="inline-block px-3 py-1 bg-[#3E5C4B] text-white text-xs font-black uppercase tracking-wider rounded shadow-2xs">
              {settings.documentTitle || 'REGISTRO PRESENZE TIROCINI INTERNI'}
            </span>
            <p className="text-xs font-semibold text-stone-800 pt-1">
              {periodLabel}
            </p>
            <div className="text-[11px] font-medium text-stone-700 pt-1 flex flex-wrap items-center justify-center gap-1.5">
              <span>Risorsa e Turni:</span>
              <span className="inline-block font-extrabold text-[#2C4235] uppercase tracking-tight bg-white px-2.5 py-0.5 rounded border border-[#C5D6CC]">
                {selectedResourcesLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {sortedRecords.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-stone-300 rounded-xl my-8">
            <p className="text-sm font-semibold text-stone-500">
              Nessuno studente/tirocinante iscritto per il periodo e le risorse selezionate.
            </p>
          </div>
        ) : (settings.groupByDay || isDigitalMode) ? (
          <div className="space-y-6 print:space-y-4">
            {Object.entries(groupedByDay).map(([groupId, dayRecords]) => {
              const dayDate=dayRecords[0].dateStr;
              const formattedDate = formatDateItalian(dayDate);
              const dayName = formatDayNameItalian(dayDate);
              const resourceName =
                Array.from(new Set(dayRecords.map((r) => r.resourceName))).join(', ') ||
                selectedResourcesLabel;
              const timeSlot = dayRecords[0]?.startTimeStr
                ? `${dayRecords[0].startTimeStr.substring(0, 5)}${
                    dayRecords[0].endTimeStr ? ' - ' + dayRecords[0].endTimeStr.substring(0, 5) : ''
                  }`
                : '';



              const dayPayload: ValidationShiftPayload = {
                date: dayDate,
                resource: resourceName,
                timeSlot,
                recipientEmail: settings.validationEmail || 'tirocini.dsv@unito.it',
                academicYear: settings.academicYear,
                students: dayRecords.map((r) => ({
                  id: r.id,
                  name: r.fullName,
                  matricola: r.matricola,
                  bookingCode: r.bookingCode,
                  email: r.bookedByEmail,
                })),
              };

              return (
                <div key={groupId} className="space-y-2.5 page-break-inside-avoid">
                  {/* Day Header Bar */}
                  <div className="bg-[#3E5C4B] text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-between shadow-2xs">
                    <div>
                      <span>
                        {dayName} {formattedDate}
                      </span>
                      <span className="text-[11px] font-normal opacity-90 ml-2.5">
                        ({dayRecords.length} tirocinanti iscritti)
                      </span>
                    </div>

                    {isDigitalMode && (
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <Lock className="w-3.5 h-3.5 text-emerald-300" />
                        <span>PIN DEL TURNO: <strong>{<ServerPin payload={dayPayload} />}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* If in DIGITAL MODE: Prominent Tutor QR + Student QR + PIN Box (Side-by-Side) */}
                  {isDigitalMode && (
                    <div className="flex flex-row print:flex-row items-stretch gap-3 bg-[#F7F9F8] print:bg-white border-2 border-[#D5E2DA] print:border-stone-400 rounded-2xl p-3">
                      {/* Left: Info and Daily PIN Instructions (width 38%) */}
                      <div className="w-[38%] print:w-[38%] flex flex-col justify-between space-y-2 shrink-0">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#2C4437] uppercase">
                            <Smartphone className="w-4 h-4 text-[#3E5C4B]" />
                            <span>Convalida Digitale Senza Carta</span>
                          </div>
                          <p className="text-[9.5px] text-stone-600 print:text-stone-800 leading-snug mt-1">
                            Gli studenti scansionano il <strong>QR Studente</strong> e inseriscono il PIN del turno per ricevere la ricevuta digitale sul loro smartphone.
                          </p>
                        </div>

                        {/* PIN Highlight Box */}
                        <div className="bg-white print:bg-stone-50 border-2 border-[#2C4437] rounded-xl p-2 text-center shadow-xs">
                          <span className="text-[8.5px] uppercase font-bold text-stone-500 block tracking-wider">
                            PIN DEL TURNO DA COMUNICARE AGLI STUDENTI
                          </span>
                          <span className="font-mono text-2xl font-black text-[#2C4437] tracking-[0.2em] block my-0.5">
                            {<ServerPin payload={dayPayload} />}
                          </span>
                          <span className="text-[8px] text-stone-500 font-medium">
                            Valido esclusivamente per questo turno e reparto
                          </span>
                        </div>
                      </div>

                      {/* Right: Both QR Codes Affiancati (Side-by-Side) (width 62%) */}
                      <div className="w-[62%] print:w-[62%] flex flex-row print:flex-row items-center justify-around gap-2.5">
                        {/* Student Self-Check-In QR */}
                        <div className="flex-1 flex items-center justify-center">
                          <AttendanceQrCode
                            payload={dayPayload}
                            mode="student"
                            size={78}
                            density={settings.qrCodeDensity || 'simple'}
                            showDetails={true}
                            onOpenStudentCheckIn={onOpenStudentCheckIn}
                          />
                        </div>

                        {/* Tutor Roll-Call QR */}
                        <div className="flex-1 flex items-center justify-center">
                          <AttendanceQrCode
                            payload={dayPayload}
                            mode="tutor"
                            size={78}
                            density={settings.qrCodeDensity || 'simple'}
                            showDetails={true}
                            onOpenValidator={onOpenValidator}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {renderTable(dayRecords, true)}
                </div>
              );
            })}
          </div>
        ) : (
          renderTable(sortedRecords, false)
        )}
      </div>

      {/* Footer Section */}
      <div className="mt-8 pt-6 border-t-2 border-stone-800 space-y-6 print:mt-6 print:pt-4 page-break-inside-avoid">
        {settings.footerNotes && (
          <div className="text-[11px] text-[#2C4437] italic leading-relaxed bg-[#E8EFEA]/80 p-3 rounded-lg border border-[#C5D6CC]">
            <strong>Note e Disposizioni:</strong> {settings.footerNotes}
          </div>
        )}

        {(() => {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 pt-2 items-center">
              {/* Col 1: Totale e Attestazione */}
              <div className="text-xs space-y-1.5">
                <p className="font-bold text-stone-900 uppercase text-[11px]">
                  Totale Tirocinanti Iscritti:{' '}
                  <span className="text-sm font-black text-[#3E5C4B]">{sortedRecords.length}</span>
                </p>
                <p className="text-[10px] text-stone-500">
                  {isDigitalMode
                    ? 'Le presenze convalidate digitalmente confluiscono direttamente nel Foglio Google centrale.'
                    : 'Valido ai fini dell\'attestazione con firma manuale per le ore di tirocinio pratico interno.'}
                </p>
              </div>

              {/* Col 2: Firma Responsabile */}
              {settings.showTutorSignatureBlock && (
                <div className="text-xs text-right space-y-2">
                  <p className="font-bold text-stone-900 uppercase text-[11px]">
                    Firma del Responsabile della Struttura / Tutor
                  </p>
                  <p className="text-[11px] text-stone-700 font-semibold">
                    {settings.tutorName || 'Dott. / Prof. ________________________'}
                  </p>
                  <div className="pt-6 border-b border-stone-400 w-48 ml-auto" />
                </div>
              )}
            </div>
          );
        })()}

        {/* Institutional Contact Line */}
        {(settings.footerContactInfo === undefined || settings.footerContactInfo.trim() !== '') && (
          <div className="pt-4 mt-2 border-t border-stone-300 text-center text-[10px] font-medium text-stone-600 tracking-tight">
            {settings.footerContactInfo ||
              'Tel.: +390116708941 - e-mail: tirocini.dsv@unito.it - Sito web: http://www.unito.it/samev'}
          </div>
        )}
      </div>
    </div>
  );
};
