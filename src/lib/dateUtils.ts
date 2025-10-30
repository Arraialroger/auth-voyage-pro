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
  
  // Create a date in the local timezone
  const localDate = new Date(date);
  localDate.setHours(hour, minute, 0, 0);
  
  // Convert to the correct timezone
  return fromZonedTime(localDate, TIMEZONE);
}

/**
 * Parses an ISO string to a Date object in the local timezone
 * 
 * @param isoString - ISO date string
 * @returns Date object in the local timezone
 */
export function parseLocalDateTime(isoString: string): Date {
  return toZonedTime(new Date(isoString), TIMEZONE);
}
