import Papa from 'papaparse';
import { BookingRecord, ResourceCategoryKey, ResourceCategoryInfo } from '../types';

export const RESOURCE_CATEGORIES: Record<ResourceCategoryKey, ResourceCategoryInfo> = {
  ospedale: {
    key: 'ospedale',
    label: '1) Turni Ospedale Veterinario Universitario',
    url: 'https://sdsmv.campusnet.unito.it/do/home.pl/View?doc=/struttura/ospedale.html',
    color: '#3E5C4B', // Sage Green
    badgeBg: 'bg-[#E8EFEA] text-[#2C4437] dark:bg-[#1E2E25] dark:text-[#A3C2B0] border-[#C5D6CC] dark:border-[#2C4437]',
    defaultResources: [
      'Tirocinio Piccoli Animali',
      'Tirocinio Grandi Animali',
      'C.A.N.C. (Animali Non Convenzionali)',
    ],
  },
  azienda_zootecnica: {
    key: 'azienda_zootecnica',
    label: '2) Turni Azienda Zootecnica',
    url: 'https://sdsmv.campusnet.unito.it/do/home.pl/View?doc=/struttura/azienda_zootecnica.html',
    color: '#4A6B62', // Forest Teal
    badgeBg: 'bg-[#EAF1EF] text-[#2D453E] dark:bg-[#1C2C28] dark:text-[#A8C7BE] border-[#C1D6D0] dark:border-[#2D453E]',
    defaultResources: [
      'Tirocinio Azienda Zootecnica (lun-ven)',
      'Tirocinio Azienda Zootecnica (sab-dom)',
    ],
  },
  skill_lab: {
    key: 'skill_lab',
    label: '3) Turni Skill Lab',
    url: 'https://www.veterinaria.unito.it/do/home.pl/View?doc=/didattica/clinical_skill_lab.html',
    color: '#786C5A', // Earthy Taupe
    badgeBg: 'bg-[#F4F1EC] text-[#4A4135] dark:bg-[#2A261F] dark:text-[#D1C7B8] border-[#D8D1C7] dark:border-[#4A4135]',
    defaultResources: [
      'OSCE VIRTUALVET',
      'Skill Lab 1 (Aula Ghisleni)',
      'Skill Lab 2 (Palazzina blu)',
      'Training VirtualVet',
    ],
  },
  buiatri: {
    key: 'buiatri',
    label: '4) Turni Buiatri',
    color: '#8C6849', // Warm Clay / Ochre
    badgeBg: 'bg-[#F9F3EE] text-[#5C422C] dark:bg-[#302318] dark:text-[#E0C8B3] border-[#E3D4C6] dark:border-[#5C422C]',
    defaultResources: [
      'Mungitura - dott. Casalone',
      'Turno B - dott. Casalone',
      'Turno C - dott. Ruta',
    ],
  },
  izs: {
    key: 'izs',
    label: '5) Tirocinio IZS',
    url: 'https://www.izsplv.it/it/lavora-con-noi/337-tirocini/2097-tirocinio-non-clinico-diagnostica-cadaverica.html',
    color: '#5B7065', // Slate Green
    badgeBg: 'bg-[#EDF1EE] text-[#394B41] dark:bg-[#232F28] dark:text-[#B4C6BC] border-[#C2D1C8] dark:border-[#394B41]',
    defaultResources: ['Tirocinio IZS', 'Turni IZS'],
  },
};

export function categorizeResource(resourceName: string): ResourceCategoryKey {
  const norm = resourceName.toLowerCase().trim();
  if (
    norm.includes('piccoli') ||
    norm.includes('grandi') ||
    norm.includes('ospedale') ||
    norm.includes('canc') ||
    norm.includes('c.a.n.c') ||
    norm.includes('convenzionali')
  ) {
    return 'ospedale';
  }
  if (norm.includes('izs')) {
    return 'izs';
  }
  if (
    norm.includes('skill lab') ||
    norm.includes('virtualvet') ||
    norm.includes('osce') ||
    norm.includes('tavet')
  ) {
    return 'skill_lab';
  }
  if (
    norm.includes('casalone') ||
    norm.includes('ruta') ||
    norm.includes('geninatti') ||
    norm.includes('mungitura') ||
    norm.includes('turno a') ||
    norm.includes('turno b') ||
    norm.includes('turno c') ||
    norm.includes('buiat')
  ) {
    return 'buiatri';
  }
  if (norm.includes('zootecnica') || norm.includes('azienda')) {
    return 'azienda_zootecnica';
  }
  return 'ospedale';
}

function calculateEndTime(startTime: string, duration: string): string {
  if (!startTime || !duration) return startTime || '';
  const [sh, sm, ss] = startTime.split(':').map((n) => parseInt(n || '0', 10));
  const [dh, dm, ds] = duration.split(':').map((n) => parseInt(n || '0', 10));

  let totalMinutes = (sh || 0) * 60 + (sm || 0) + (dh || 0) * 60 + (dm || 0);
  let totalHours = Math.floor(totalMinutes / 60) % 24;
  let remainingMinutes = totalMinutes % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(totalHours)}:${pad(remainingMinutes)}:${pad(ss || 0)}`;
}

function formatNameFromEmail(email: string): { firstName: string; lastName: string; fullName: string } {
  if (!email) return { firstName: '', lastName: '', fullName: 'Studente Non Specificato' };
  const prefix = email.split('@')[0] || '';
  const parts = prefix.split('.');
  if (parts.length >= 2) {
    const rawFirst = parts[0].replace(/[0-9]/g, '');
    const rawLast = parts[1].replace(/[0-9]/g, '');
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const firstName = capitalize(rawFirst);
    const lastName = capitalize(rawLast);
    return {
      firstName,
      lastName,
      fullName: `${lastName} ${firstName}`,
    };
  }
  return {
    firstName: prefix,
    lastName: '',
    fullName: prefix,
  };
}

export function normalizeDateStringToIso(rawDateStr: string): string {
  if (!rawDateStr) return '';

  // Clean string: remove quotes, BOM, and take date part before time
  let cleaned = rawDateStr.replace(/^\uFEFF/, '').trim().replace(/^"|"$/g, '');
  if (cleaned.includes(' ')) {
    cleaned = cleaned.split(' ')[0];
  }
  if (cleaned.includes('T')) {
    cleaned = cleaned.split('T')[0];
  }

  // 1. If YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  let match = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. If DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or D/M/YYYY (Italian / European format)
  match = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }

  // 3. If DD/MM/YY or DD-MM-YY or DD.MM.YY
  match = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const yearNum = parseInt(match[3], 10);
    const y = yearNum > 50 ? `19${match[3]}` : `20${match[3]}`;
    return `${y}-${m}-${d}`;
  }

  // Fallback: Date.parse
  const dt = new Date(rawDateStr);
  if (!isNaN(dt.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }

  return rawDateStr;
}

// Case-insensitive, BOM-proof, quote-proof column accessor
function getColVal(row: Record<string, string>, aliases: string[]): string {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/^\uFEFF/, '').replace(/[\u00A0\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
    const foundKey = rowKeys.find((k) => {
      const normK = k.toLowerCase().replace(/^\uFEFF/, '').replace(/[\u00A0\r\n]/g, ' ').replace(/\s+/g, ' ').replace(/^"|"$/g, '').trim();
      return normK === target;
    });
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return String(row[foundKey]).trim().replace(/^"|"$/g, '');
    }
  }
  return '';
}

export function parseAffluencesCsv(csvText: string): BookingRecord[] {
  // Strip sep=, or sep=; line if present, and remove BOM
  let cleanCsv = csvText.replace(/^\uFEFF/, '').trim();
  if (cleanCsv.toLowerCase().startsWith('sep=')) {
    const firstNewline = cleanCsv.indexOf('\n');
    if (firstNewline !== -1) {
      cleanCsv = cleanCsv.substring(firstNewline + 1).trim();
    }
  }

  const parseResult = Papa.parse<Record<string, string>>(cleanCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim().replace(/^"|"$/g, '').trim(),
  });

  const records: BookingRecord[] = [];

  parseResult.data.forEach((row, index) => {
    const resourceId = getColVal(row, [
      'ID della risorsa',
      'id della risorsa',
      'ID risorsa',
      'id risorsa',
      'Resource ID',
      'resource_id',
    ]);

    const resourceName =
      getColVal(row, [
        'Risorsa',
        'risorsa',
        'Resource',
        'resource',
        'Nome risorsa',
        'Nome della risorsa',
      ]) || resourceId;

    if (!resourceName) return; // skip empty rows

    let rawDateStr = getColVal(row, [
      'Giorno',
      'giorno',
      'Data',
      'data',
      'Date',
      'date',
      'Day',
      'day',
      'Giorno del turno',
      'Data del turno',
    ]);

    // Fallback if Giorno is missing: try booking date column
    if (!rawDateStr) {
      rawDateStr = getColVal(row, ['Prenotazioni effettuate', 'created_at', 'Data prenotazione']);
    }

    const dateStr = normalizeDateStringToIso(rawDateStr);
    const startTimeStr = getColVal(row, ['Ora di inizio', 'ora di inizio', 'Start time', 'Inizio']);
    const durationStr = getColVal(row, ['Durata', 'durata', 'Duration']);
    const endTimeStr = calculateEndTime(startTimeStr, durationStr);

    const bookedByEmail = getColVal(row, ['Prenotato da', 'prenotato da', 'Email', 'email', 'Booked by']);
    let rawFirstName = getColVal(row, ['Nome', 'nome', 'First name', 'First Name']);
    let rawLastName = getColVal(row, ['Cognome', 'cognome', 'Last name', 'Last Name']);

    let firstName = rawFirstName;
    let lastName = rawLastName;
    let fullName = '';

    if (rawLastName && rawFirstName) {
      fullName = `${rawLastName} ${rawFirstName}`;
    } else if (rawLastName) {
      fullName = rawLastName;
    } else if (rawFirstName) {
      fullName = rawFirstName;
    } else {
      const derived = formatNameFromEmail(bookedByEmail);
      firstName = derived.firstName;
      lastName = derived.lastName;
      fullName = derived.fullName;
    }

    // Multi-strategy detection for cancellation
    let cancelledAt = '';
    let cancellationReason = '';
    let cancelledBy = '';

    // Strategy 1: Iterate over all keys in row looking for any column related to cancellation
    for (const [key, val] of Object.entries(row)) {
      if (!val) continue;
      const cleanVal = String(val).trim().replace(/^"|"$/g, '');
      if (!cleanVal) continue;

      const normKey = key.toLowerCase().replace(/^\uFEFF/, '').replace(/[\u00A0\r\n]/g, ' ').trim();

      if (normKey.includes('cancellat') || normKey.includes('cancellaz') || normKey.includes('cancelled') || normKey.includes('canc')) {
        if (normKey.includes('da') || normKey.includes('by') || normKey.includes('effettuata')) {
          cancelledBy = cleanVal;
        } else if (normKey.includes('ragione') || normKey.includes('motivo') || normKey.includes('reason')) {
          cancellationReason = cleanVal;
        } else {
          cancelledAt = cleanVal;
        }
      }
    }

    // Strategy 2: Specific column aliases lookup if generic scan didn't capture all
    if (!cancelledAt) {
      cancelledAt = getColVal(row, [
        'Data e ora di cancellazione',
        'data e ora di cancellazione',
        'Data e ora della cancellazione',
        'Data e ora cancellazione',
        'Data di cancellazione',
        'Data cancellazione',
        'Cancelled at',
        'Cancellata il',
      ]);
    }

    if (!cancellationReason) {
      cancellationReason = getColVal(row, [
        'Ragione della cancellazione',
        'ragione della cancellazione',
        'Ragione di cancellazione',
        'Ragione cancellazione',
        'Motivo cancellazione',
        'Motivo della cancellazione',
        'Cancellation reason',
      ]);
    }

    if (!cancelledBy) {
      cancelledBy = getColVal(row, [
        'Cancellato da',
        'cancellato da',
        'Cancellazione effettuata da',
        'cancellazione effettuata da',
        'Cancellata da',
        'Cancelled by',
        'Effettuata da',
      ]);
    }

    const normCancelledBy = cancelledBy.toLowerCase().trim();

    // A booking IS CANCELLED if ANY of the cancellation fields are populated
    // (and not explicitly negative like 'no', 'nessuno', 'false')
    const isCancelled =
      (!!cancelledAt && cancelledAt.toLowerCase() !== 'no' && cancelledAt.toLowerCase() !== 'false') ||
      (!!cancellationReason && cancellationReason.toLowerCase() !== 'no' && cancellationReason.toLowerCase() !== 'false') ||
      (!!normCancelledBy && normCancelledBy !== '' && normCancelledBy !== 'no' && normCancelledBy !== 'nessuno' && normCancelledBy !== 'false');

    let status: BookingRecord['status'] = 'valid';
    if (isCancelled) {
      if (
        normCancelledBy.includes('system') &&
        cancellationReason.toLowerCase().includes('durata della conferma scaduta')
      ) {
        status = 'expired';
      } else if (normCancelledBy.includes('system')) {
        status = 'cancelled_system';
      } else if (normCancelledBy.includes('admin')) {
        status = 'cancelled_admin';
      } else {
        status = 'cancelled_user';
      }
    }

    const comments = getColVal(row, ['Commenti', 'commenti', 'Comments', 'Note']);
    let matricola = getColVal(row, ['Matricola', 'matricola', 'Numero di matricola', 'Numero matricola']);
    if (!matricola && comments) {
      matricola = comments;
    }

    const bookingCode = getColVal(row, ['Codice di prenotazione', 'codice di prenotazione', 'Booking code', 'Code']);
    const peopleCountRaw = getColVal(row, ['Numero di persone', 'persone', 'People count']);
    const isAdminBooking = getColVal(row, ['Prenotazione effettuata da un amministratore', 'admin']).toLowerCase() === 'si';
    const isAppBooking = getColVal(row, ['Prenotazione tramite app', 'app']).toLowerCase() === 'si';
    const confirmedAt = getColVal(row, ['Data e ora di conferma', 'confermata']);
    const validatedPresenceAt = getColVal(row, ['Data e ora della convalida delle presenze', 'convalidata']);
    const bookingMadeAt = getColVal(row, ['Prenotazioni effettuate', 'created_at']);
    const phone = getColVal(row, ['Numero di telefono', 'telefono', 'Phone']);

    const record: BookingRecord = {
      id: `${bookingCode || index}_${dateStr}_${index}`,
      resourceId,
      resourceName,
      categoryKey: categorizeResource(resourceName),
      bookedByEmail,
      peopleCount: parseInt(peopleCountRaw || '1', 10) || 1,
      bookingMadeAt,
      dateStr,
      startTimeStr,
      endTimeStr,
      durationStr,
      bookingCode,
      isAdminBooking,
      isAppBooking,
      confirmedAt,
      validatedPresenceAt,
      cancelledAt,
      cancelledBy,
      cancellationReason,
      firstName,
      lastName,
      fullName,
      phone,
      comments,
      matricola,
      isCancelled,
      status,
    };

    records.push(record);
  });

  return records;
}
