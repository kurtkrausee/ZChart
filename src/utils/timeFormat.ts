// react-app/src/utils/timezone.ts
// Version: 1.2.0 | Updated: 2026-05-06 | By: Agent
// P7.4: chartAxisLabel + crosshairLabel accept FormatOptions (timeFormat, dateFormat, dayOfWeekOnLabels)
/**
 * Zentrales Timezone-Utility.
 *
 * Alle Frontend-Zeitformatierungen sollen über diese Funktionen laufen,
 * damit die User-Profileinstellung (z.B. "Europe/Berlin") einheitlich
 * verwendet wird – statt der Browser-Locale.
 */

// ─── Intl.DateTimeFormat-basierte Helfer ────────────────────────────────────

/**
 * Liefert Jahr, Monat (0-basiert), Tag, Stunde, Minute, Sekunde
 * in der angegebenen Zeitzone.  Nutzt Intl.DateTimeFormat statt
 * Date.getHours() (das immer Browser-TZ nimmt).
 */
export function dateParts(
  ts: number | Date,
  tz: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  // formatToParts liefert die Werte exakt in der gewünschten Zeitzone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const pts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(pts.year),
    month: Number(pts.month) - 1, // 0-basiert wie JS Date
    day: Number(pts.day),
    hour: Number(pts.hour) % 24, // "24" → 0
    minute: Number(pts.minute),
    second: Number(pts.second),
  };
}

// ─── Kurzformatierung für Chart-Achsen ──────────────────────────────────────

const MONTHS_DE = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];
/** 2-char day abbreviations (Mon=0 in JS .getDay()) */
const DOW_ABBR = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Returns DOW abbreviation for a timestamp in a given timezone. */
function dowAbbr(ts: number, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const short = fmt.format(new Date(ts)); // "Mon", "Tue", ...
  const idx = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(short);
  return idx >= 0 ? DOW_ABBR[idx] : short.slice(0, 2);
}

/** P7.4: format options passed through XAxisNode.draw → chartAxisLabel */
export interface AxisFormatOptions {
  timeFormat?: '24h' | '12h';
  dateFormat?: 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  dayOfWeekOnLabels?: boolean;
}

/** Format a day number into a date-change label according to dateFormat */
function dayChangeLabel(p: ReturnType<typeof dateParts>, dateFormat?: AxisFormatOptions['dateFormat']): string {
  const mm = String(p.month + 1).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  if (dateFormat === 'MM/dd/yyyy') return `${mm}/${dd}`;
  if (dateFormat === 'yyyy-MM-dd') return `${mm}-${dd}`;
  return `${p.day} ${MONTHS_DE[p.month]}`; // dd.MM.yyyy default (compact form)
}

/** Format a time string according to timeFormat */
function fmtTime(hour: number, minute: number, timeFormat?: AxisFormatOptions['timeFormat']): string {
  if (timeFormat === '12h') {
    const h12 = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
/** Threshold: intervals >= 1 day are treated as daily (no time labels) */
const DAY_MS = 86_400_000;

/**
 * Chart-X-Achse / Crosshair: kompakter Label-String.
 *
 * Intraday  → "14:30"  oder  "12 Apr" (bei Tageswechsel)
 * Daily     → "12", "Apr" oder "2026" (je nach Wechsel)
 *
 * @param intervalMs  Candle duration in ms. When >= 1 day, the label always
 *                    uses the daily path regardless of hour/minute values.
 * @param fmt         P7.4: optional format overrides
 */
export function chartAxisLabel(
  ts: number,
  tz: string,
  prev: { year: number; month: number; day: number } | null,
  intervalMs?: number,
  fmt?: AxisFormatOptions,
): { label: string; bold: boolean } {
  const p = dateParts(ts, tz);
  const isDaily = intervalMs != null && intervalMs >= DAY_MS;
  const dow = fmt?.dayOfWeekOnLabels ? dowAbbr(ts, tz) : '';

  // Intraday (Stunde/Minute != 0) — but NOT when interval is daily or higher
  if (!isDaily && (p.hour !== 0 || p.minute !== 0)) {
    if (prev && p.day !== prev.day) {
      const dayLabel = dayChangeLabel(p, fmt?.dateFormat);
      return { label: dow ? `${dow} ${dayLabel}` : dayLabel, bold: true };
    }
    return {
      label: fmtTime(p.hour, p.minute, fmt?.timeFormat),
      bold: false,
    };
  }

  // Daily
  if (prev && p.year !== prev.year) {
    return { label: String(p.year), bold: true };
  }
  if (prev && p.month !== prev.month) {
    return { label: MONTHS_DE[p.month], bold: true };
  }
  const dayLabel = String(p.day);
  return { label: dow ? `${dow} ${dayLabel}` : dayLabel, bold: false };
}

/**
 * Crosshair-Label:  "12 Apr 14:30"  oder  "12 Apr 2026" (Daily)
 *
 * @param intervalMs  When >= 1 day, always uses the daily format (no time).
 * @param fmt         P7.4: optional format overrides
 */
export function crosshairLabel(ts: number, tz: string, intervalMs?: number, fmt?: AxisFormatOptions): string {
  const p = dateParts(ts, tz);
  const isDaily = intervalMs != null && intervalMs >= DAY_MS;
  if (!isDaily && (p.hour !== 0 || p.minute !== 0)) {
    const timeStr = fmtTime(p.hour, p.minute, fmt?.timeFormat);
    const dayPart = dayChangeLabel(p, fmt?.dateFormat);
    return `${dayPart} ${timeStr}`;
  }
  const dayPart = dayChangeLabel(p, fmt?.dateFormat);
  return `${dayPart} ${p.year}`;
}

// ─── Allgemeine UI-Formatierung ─────────────────────────────────────────────

/**
 * Formatiert einen Timestamp für die allgemeine UI-Anzeige.
 *
 * @param ts    Unix-ms, Date oder ISO-String
 * @param tz    IANA-Timezone (z.B. "Europe/Berlin")
 * @param opts  Optionale Intl.DateTimeFormat-Optionen (Default: Datum + Uhrzeit)
 */
export function formatTs(
  ts: number | Date | string,
  tz: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof ts === "string" ? new Date(ts) : typeof ts === "number" ? new Date(ts) : ts;
  const defaults: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return d.toLocaleString("de-DE", opts ? { timeZone: tz, ...opts } : defaults);
}

/**
 * Nur Datum (ohne Uhrzeit).
 */
export function formatDate(
  ts: number | Date | string,
  tz: string,
): string {
  const d = typeof ts === "string" ? new Date(ts) : typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleDateString("de-DE", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Nur Uhrzeit.
 */
export function formatTime(
  ts: number | Date | string,
  tz: string,
): string {
  const d = typeof ts === "string" ? new Date(ts) : typeof ts === "number" ? new Date(ts) : ts;
  return d.toLocaleTimeString("de-DE", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
