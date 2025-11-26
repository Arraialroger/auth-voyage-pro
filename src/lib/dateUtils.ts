import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Creates a Date object in the local timezone (America/Sao_Paulo)
 * from a date and time string.
 * 
 * @param date - The date object
 * @param time - Time in HH:mm format
 * @returns Date object adjusted for the local timezone
 */
export function createLocalDateTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create Date in UTC timezone with the literal time (no timezone conversion)
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
}

/**
 * Parses an ISO string to a Date object in the local timezone
 * 
 * @param isoString - ISO date string
 * @returns Date object in the local timezone
 */
export function parseLocalDateTime(isoString: string): Date {
  // Parse the ISO string directly without timezone conversion
  // This ensures 09:00 UTC is displayed as 09:00 in the interface
  return new Date(isoString);
}

/**
 * Formats an ISO date string to display time in HH:mm format
 * WITHOUT timezone conversion (treats time as literal UTC value)
 * 
 * @param isoString - ISO date string from database
 * @returns Formatted time string (e.g., "09:00")
 */
export function formatUTCTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats an ISO date string to display date in specified format
 * WITHOUT timezone conversion
 * 
 * @param isoString - ISO date string from database
 * @param formatStr - Format string for date-fns format function
 * @returns Formatted date string
 */
export function formatUTCDate(isoString: string, formatStr: string): string {
  const date = new Date(isoString);
  // Create a date in local timezone with UTC values to avoid conversion
  const utcDate = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes()
  );
  return format(utcDate, formatStr, { locale: ptBR });
}
