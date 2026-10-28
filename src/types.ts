export interface AffluencesRawRow {
  "ID della risorsa"?: string;
  "Risorsa"?: string;
  "Prenotato da"?: string;
  "Numero di persone"?: string | number;
  "Prenotazioni effettuate"?: string;
  "Giorno"?: string;
  "Ora di inizio"?: string;
  "Durata"?: string;
  "Codice di prenotazione"?: string;
  "Prenotazione effettuata da un amministratore"?: string;
  "Prenotazione tramite app"?: string;
  "Data e ora di conferma"?: string;
  "Data e ora della convalida delle presenze"?: string;
  "Data e ora di cancellazione"?: string;
  "Cancellazione effettuata da"?: string;
  "Ragione della cancellazione"?: string;
  "Nome"?: string;
  "Cognome"?: string;
  "Numero di telefono"?: string;
  "Commenti"?: string;
  [key: string]: any;
}

export interface BookingRecord {
  id: string;
  resourceId: string;
  resourceName: string;
  categoryKey: ResourceCategoryKey;
  bookedByEmail: string;
  peopleCount: number;
  bookingMadeAt: string;
  dateStr: string; // YYYY-MM-DD
  startTimeStr: string; // HH:mm:ss
  endTimeStr: string; // HH:mm:ss
  durationStr: string; // HH:mm:ss
  bookingCode: string;
  isAdminBooking: boolean;
  isAppBooking: boolean;
  confirmedAt: string;
  validatedPresenceAt: string;
  cancelledAt: string;
  cancelledBy: string; // 'admin' | 'user' | 'system' | ''
  cancellationReason: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  comments: string;
  matricola: string;
  isCancelled: boolean;
  status: 'valid' | 'cancelled_user' | 'cancelled_admin' | 'cancelled_system' | 'expired';
}

export type ResourceCategoryKey = 
  | 'ospedale' 
  | 'azienda_zootecnica' 
  | 'skill_lab' 
  | 'buiatri' 
  | 'izs';

export interface ResourceCategoryInfo {
  key: ResourceCategoryKey;
  label: string;
  url?: string;
  color: string;
  badgeBg: string;
  badgeText?: string;
  defaultResources: string[];
}

export interface RegisterTemplateSettings {
  headerTitle: string;
  facilitySubtitle: string;
  documentTitle: string;
  protocolNumber: string;
  academicYear: string;
  logoUrl: string | null;
  logoHeight: number; // in px
  showLogo: boolean;
  footerNotes: string;
  footerContactInfo?: string;
  showTutorSignatureBlock: boolean;
  tutorName: string;
  showComments: boolean;
  showBookingCode: boolean;
  showMatricola: boolean;
  showEmail: boolean;
  showDateColumn?: boolean;
  showTimeColumn?: boolean;
  showShiftColumn?: boolean;
  showResourceColumn?: boolean;
  showNameColumn?: boolean;
  showSignatureColumn?: boolean;
  signatureBoxWidth: string; // e.g. '180px' or 'auto'
  groupByDay: boolean;
  compactMode: boolean;
  // Register mode: cartaceo (paper only, no QR) or digitale (QR codes & PIN)
  registerMode?: 'cartaceo' | 'digitale';
  // QR Code Attendance Validation Configuration
  showValidationQrCode: boolean;
  validationEmail: string; // default: 'tirocini.dsv@unito.it'
  qrCodeSize: number; // in px, e.g. 80-120
  qrCodePosition: 'both' | 'groups' | 'footer';
  validationInstructions: string;
  qrCodeDensity?: 'simple' | 'detailed'; // default: 'simple' for large pixels & easy scanning
  customPin?: string; // Optional custom PIN override
}

export type ValidationMode = 'CARTACEA' | 'TUTOR_QR' | 'STUDENTE_QR' | 'MANUALE';

export interface ValidationRecord {
  syncState?: "confirmed" | "pending";
  presenceKey?: string;
  tutorNotes?: string;
  id: string;
  date: string; // YYYY-MM-DD
  resource: string;
  timeSlot: string;
  studentName: string;
  matricola: string;
  bookingCode?: string;
  email?: string;
  status: AttendanceStatus;
  delayMinutes: number; // 0 for on-time (including out-of-list punctual additions), >0 for latecomers
  validationMode: ValidationMode;
  validatedAt: string; // ISO string or human-readable format
  validatedBy: string; // Tutor name or 'Studente'
  pinUsed?: string;
  note?: string;
  securityHash?: string;
  isManualIntegration?: boolean;
}

export interface GoogleSheetsWebhookConfig {
  webhookUrl: string;
  isEnabled: boolean;
  lastSyncAt?: string;
  syncCount?: number;
  lastStatus?: 'success' | 'error' | 'idle';
  lastErrorMessage?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface StudentAttendanceItem {
  id: string;
  name: string;
  matricola: string;
  bookingCode?: string;
  email?: string;
  status: AttendanceStatus;
  delayMinutes?: number;
  note?: string;
  isManualIntegration?: boolean;
}

export interface ValidationShiftPayload {
  shiftId?: string;
  token?: string;
  role?: "tutor" | "student";
  serverPin?: string;
  tutorPassword?: string;
  date: string; // YYYY-MM-DD
  resource: string;
  timeSlot: string;
  recipientEmail: string;
  academicYear?: string;
  title?: string;
  students: Array<{
    id?: string;
    name: string;
    matricola: string;
    bookingCode?: string;
    email?: string;
  }>;
}

export interface DateFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  selectedWeekKey?: string;
}

export interface StatisticsSummary {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  cancellationRate: number; // percentage
  cancellationsByActor: {
    user: number;
    admin: number;
    system: number;
    other: number;
  };
  cancellationsByReason: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  bookingsByResource: Array<{
    resourceName: string;
    total: number;
    active: number;
    cancelled: number;
    cancellationRate: number;
  }>;
  bookingsByDay: Array<{
    dateStr: string;
    formattedDate: string;
    active: number;
    cancelled: number;
    total: number;
  }>;
  topStudentsCancelled: Array<{
    name: string;
    email: string;
    count: number;
    reasons: string[];
  }>;
}
