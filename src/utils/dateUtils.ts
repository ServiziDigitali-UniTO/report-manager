export function formatDateItalian(dateStr: string): string {
  if (!dateStr) return '';
  // Expect YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatDayNameItalian(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[date.getDay()];
}

export function formatFullDateItalian(dateStr: string): string {
  if (!dateStr) return '';
  const dayName = formatDayNameItalian(dateStr);
  const formattedDate = formatDateItalian(dateStr);
  return `${dayName} ${formattedDate}`;
}

export interface WeekPreset {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Generates reference week presets starting on Saturday and ending on the following Friday (Sabato - Venerdì).
 * This aligns with the weekly schedule export generated every Friday after 15:00.
 */
export function getWeeksFromRecords(dates: string[]): WeekPreset[] {
  if (!dates || dates.length === 0) return [];

  const sortedDates = Array.from(new Set(dates)).sort();
  const weeksMap = new Map<string, { startDate: string; endDate: string }>();

  sortedDates.forEach((dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const dayOfMonth = parseInt(parts[2], 10);

    const date = new Date(year, month, dayOfMonth);
    if (isNaN(date.getTime())) return;

    // Shift to Saturday (Start of week):
    // In JS Date: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const dayOfWeek = date.getDay();
    // For Saturday (6), diff is 0
    // For Sunday (0), diff is -1 (Saturday was yesterday)
    // For Monday (1), diff is -2
    // For Tuesday (2), diff is -3
    // For Wednesday (3), diff is -4
    // For Thursday (4), diff is -5
    // For Friday (5), diff is -6 (Saturday was 6 days ago)
    const diffToSaturday = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);

    const saturday = new Date(year, month, dayOfMonth + diffToSaturday);
    const friday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 6);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const saturdayStr = `${saturday.getFullYear()}-${pad(saturday.getMonth() + 1)}-${pad(saturday.getDate())}`;
    const fridayStr = `${friday.getFullYear()}-${pad(friday.getMonth() + 1)}-${pad(friday.getDate())}`;

    const weekKey = `${saturdayStr}_${fridayStr}`;
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, { startDate: saturdayStr, endDate: fridayStr });
    }
  });

  const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[1].startDate.localeCompare(b[1].startDate));

  const weekPresets: WeekPreset[] = [];
  sortedWeeks.forEach(([key, val]) => {
    const satLabel = formatDateItalian(val.startDate);
    const friLabel = formatDateItalian(val.endDate);
    weekPresets.push({
      key,
      label: `Settimana dal ${satLabel} al ${friLabel} (Sabato - Venerdì)`,
      startDate: val.startDate,
      endDate: val.endDate,
    });
  });

  return weekPresets;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (!startTime) return '';
  const s = startTime.substring(0, 5); // HH:mm
  const e = endTime ? endTime.substring(0, 5) : '';
  return e ? `${s} - ${e}` : s;
}

export function getShiftLabel(startTimeStr: string): string {
  if (!startTimeStr) return 'DIURNO';
  const hour = parseInt(startTimeStr.split(':')[0], 10);
  if (isNaN(hour)) return 'DIURNO';
  if (hour >= 20 || hour < 5) return 'NOTTURNO';
  if (hour >= 14) return 'POMERIDIANO';
  return 'DIURNO';
}
