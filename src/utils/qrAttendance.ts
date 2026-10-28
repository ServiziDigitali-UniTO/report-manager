import { ValidationShiftPayload, StudentAttendanceItem } from '../types';
import { formatDateItalian } from './dateUtils';

// Helper to safely encode string to base64 (supporting UTF-8)
export function utf8ToBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(str);
  }
}

// Helper to safely decode base64 to string (supporting UTF-8)
export function base64ToUtf8(str: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(str);
  }
}

// Encode payload compactly for QR code URL
export function encodeShiftPayload(
  payload: ValidationShiftPayload,
  density: 'simple' | 'detailed' = 'simple'
): string {
  if (density === 'simple') {
    // Ultra-compact pipe / param representation (huge pixels, minimal size)
    const studentsStr = payload.students
      .map((st) => `${st.name.trim()}${st.matricola && st.matricola !== '-' ? '*' + st.matricola.trim() : ''}`)
      .join(',');

    const params = new URLSearchParams();
    params.set('d', payload.date);
    params.set('r', payload.resource);
    if (payload.timeSlot) params.set('t', payload.timeSlot);
    if (payload.recipientEmail && payload.recipientEmail !== 'tirocini.dsv@unito.it') {
      params.set('e', payload.recipientEmail);
    }
    params.set('s', studentsStr);
    return params.toString();
  }

  // Detailed mode
  const compact = {
    d: payload.date,
    r: payload.resource,
    t: payload.timeSlot,
    e: payload.recipientEmail,
    y: payload.academicYear || '',
    s: payload.students.map((st) => ({
      i: st.id || '',
      n: st.name,
      m: st.matricola,
      b: st.bookingCode || '',
      e: st.email || '',
    })),
  };

  const json = JSON.stringify(compact);
  return utf8ToBase64(json);
}

// Decode payload from URL fragment
export function decodeShiftPayload(encoded: string): ValidationShiftPayload | null {
  try {
    const raw = decodeURIComponent(encoded.trim());

    // 1. Check if it is the ultra-compact query parameter format (d=...&s=...)
    if ((raw.includes('d=') || raw.includes('date=')) && raw.includes('s=')) {
      const queryStr = raw.includes('?') ? raw.split('?')[1] : raw;
      const params = new URLSearchParams(queryStr);
      const d = params.get('d') || params.get('date') || '';
      const r = params.get('r') || params.get('resource') || 'Tirocinio';
      const t = params.get('t') || params.get('time') || '';
      const e = params.get('e') || 'tirocini.dsv@unito.it';
      const sRaw = params.get('s') || '';

      const students = sRaw
        .split(',')
        .filter(Boolean)
        .map((item, idx) => {
          const parts = item.split('*');
          const name = parts[0]?.trim() || `Studente ${idx + 1}`;
          const matricola = parts[1]?.trim() || '-';
          return {
            id: `st-${idx}-${matricola}`,
            name,
            matricola,
            bookingCode: '',
            email: '',
          };
        });

      return {
        date: d,
        resource: r,
        timeSlot: t,
        recipientEmail: e,
        students,
      };
    }

    // 2. Fallback to base64 JSON payload
    let jsonStr = '';
    try {
      jsonStr = base64ToUtf8(raw);
    } catch {
      jsonStr = raw;
    }
    const data = JSON.parse(jsonStr);

    if (!data || !data.d || !data.r || !Array.isArray(data.s)) {
      return null;
    }

    return {
      date: data.d,
      resource: data.r,
      timeSlot: data.t || '',
      recipientEmail: data.e || 'tirocini.dsv@unito.it',
      academicYear: data.y || '',
      students: data.s.map((st: any) => ({
        id: st.i || Math.random().toString(36).substring(2, 9),
        name: st.n || 'Studente',
        matricola: st.m || '-',
        bookingCode: st.b || '',
        email: st.e || '',
      })),
    };
  } catch (err) {
    console.error('Error decoding shift payload:', err);
    return null;
  }
}

// Legacy synchronous QR/PIN helpers deliberately removed. Server capabilities are
// prepared asynchronously by services/shifts.ts. A client checksum is not a signature.
