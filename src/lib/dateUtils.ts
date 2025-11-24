import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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
