import { supabase } from "@/integrations/supabase/client";
import { parseISO, isBefore, isAfter, addDays, differenceInHours, startOfDay, endOfDay } from "date-fns";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppointmentValidationParams {
  professionalId: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
  excludeAppointmentId?: string;
}

// Configuration
const BUSINESS_RULES = {
  MAX_APPOINTMENTS_PER_DAY: 8,
  MIN_HOURS_BETWEEN_SAME_PATIENT: 24,
  MAX_DAILY_HOURS: 10,
  MIN_APPOINTMENT_DURATION: 15, // minutes
  MAX_APPOINTMENT_DURATION: 240, // minutes (4 hours)
};

/**
 * Verifica se há conflito de horário com agendamentos existentes
 */
export async function checkTimeConflict(
  professionalId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    let query = supabase
      .from('appointments')
      .select('id, appointment_start_time, appointment_end_time, patient:patients(full_name)')
      .eq('professional_id', professionalId)
      .neq('status', 'Cancelled')
      .or(`and(appointment_start_time.lt.${endTime.toISOString()},appointment_end_time.gt.${startTime.toISOString()})`);

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: conflicts, error } = await query;

    if (error) throw error;

    if (conflicts && conflicts.length > 0) {
      result.isValid = false;
      conflicts.forEach((conflict: any) => {
        result.errors.push(
          `Conflito com agendamento existente: ${conflict.patient?.full_name || 'Paciente'} ` +
          `(${new Date(conflict.appointment_start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ` +
          `${new Date(conflict.appointment_end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
        );
      });
    }
  } catch (error) {
    console.error('Erro ao verificar conflitos de horário:', error);
    result.isValid = false;
    result.errors.push('Erro ao verificar conflitos de horário');
  }

  return result;
}

/**
 * Verifica se o horário está dentro do expediente do profissional
 */
export async function checkProfessionalSchedule(
  professionalId: string,
  startTime: Date,
  endTime: Date
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    const dayOfWeek = startTime.getDay();
    
    const { data: schedules, error } = await supabase
      .from('professional_schedules')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek);

    if (error) throw error;

    if (!schedules || schedules.length === 0) {
      result.isValid = false;
      result.errors.push('Profissional não possui expediente configurado para este dia');
      return result;
    }

    // Check if appointment time falls within any schedule
    const appointmentStartTime = startTime.toTimeString().slice(0, 5);
    const appointmentEndTime = endTime.toTimeString().slice(0, 5);

    const isWithinSchedule = schedules.some(schedule => {
      return appointmentStartTime >= schedule.start_time && 
             appointmentEndTime <= schedule.end_time;
    });

    if (!isWithinSchedule) {
      result.isValid = false;
      result.errors.push(
        `Horário fora do expediente. Expediente: ${schedules.map(s => `${s.start_time}-${s.end_time}`).join(', ')}`
      );
    }
  } catch (error) {
    console.error('Erro ao verificar expediente:', error);
    result.warnings.push('Não foi possível verificar o expediente do profissional');
  }

  return result;
}

/**
 * Verifica limite de agendamentos por dia
 */
export async function checkDailyAppointmentLimit(
  professionalId: string,
  date: Date
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professionalId)
      .neq('status', 'Cancelled')
      .gte('appointment_start_time', dayStart.toISOString())
      .lte('appointment_start_time', dayEnd.toISOString());

    if (error) throw error;

    const count = appointments?.length || 0;

    if (count >= BUSINESS_RULES.MAX_APPOINTMENTS_PER_DAY) {
      result.isValid = false;
      result.errors.push(
        `Limite de ${BUSINESS_RULES.MAX_APPOINTMENTS_PER_DAY} agendamentos por dia atingido (${count} agendamentos)`
      );
    } else if (count >= BUSINESS_RULES.MAX_APPOINTMENTS_PER_DAY - 2) {
      result.warnings.push(
        `Atenção: ${count} agendamentos neste dia (limite: ${BUSINESS_RULES.MAX_APPOINTMENTS_PER_DAY})`
      );
    }
  } catch (error) {
    console.error('Erro ao verificar limite diário:', error);
    result.warnings.push('Não foi possível verificar limite diário de agendamentos');
  }

  return result;
}

/**
 * Verifica carga horária diária do profissional
 */
export async function checkDailyWorkload(
  professionalId: string,
  date: Date,
  newAppointmentDuration: number
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_start_time, appointment_end_time')
      .eq('professional_id', professionalId)
      .neq('status', 'Cancelled')
      .gte('appointment_start_time', dayStart.toISOString())
      .lte('appointment_start_time', dayEnd.toISOString());

    if (error) throw error;

    // Calculate total hours
    let totalMinutes = newAppointmentDuration;
    appointments?.forEach(apt => {
      const start = parseISO(apt.appointment_start_time);
      const end = parseISO(apt.appointment_end_time);
      totalMinutes += differenceInHours(end, start) * 60;
    });

    const totalHours = totalMinutes / 60;

    if (totalHours > BUSINESS_RULES.MAX_DAILY_HOURS) {
      result.warnings.push(
        `Carga horária elevada: ${totalHours.toFixed(1)}h (recomendado: até ${BUSINESS_RULES.MAX_DAILY_HOURS}h)`
      );
    }
  } catch (error) {
    console.error('Erro ao verificar carga horária:', error);
    result.warnings.push('Não foi possível verificar carga horária diária');
  }

  return result;
}

/**
 * Verifica intervalo mínimo entre sessões do mesmo paciente
 */
export async function checkPatientSessionInterval(
  patientId: string,
  professionalId: string,
  startTime: Date,
  excludeAppointmentId?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    const minHoursBefore = addDays(startTime, -1);
    const minHoursAfter = addDays(startTime, 1);

    let query = supabase
      .from('appointments')
      .select('appointment_start_time, appointment_end_time')
      .eq('patient_id', patientId)
      .eq('professional_id', professionalId)
      .neq('status', 'Cancelled')
      .or(`appointment_start_time.gte.${minHoursBefore.toISOString()},appointment_start_time.lte.${minHoursAfter.toISOString()}`);

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: nearbyAppointments, error } = await query;

    if (error) throw error;

    const tooClose = nearbyAppointments?.filter(apt => {
      const aptTime = parseISO(apt.appointment_start_time);
      const hoursDiff = Math.abs(differenceInHours(startTime, aptTime));
      return hoursDiff < BUSINESS_RULES.MIN_HOURS_BETWEEN_SAME_PATIENT;
    });

    if (tooClose && tooClose.length > 0) {
      result.warnings.push(
        `Este paciente já possui agendamento próximo (intervalo mínimo recomendado: ${BUSINESS_RULES.MIN_HOURS_BETWEEN_SAME_PATIENT}h)`
      );
    }
  } catch (error) {
    console.error('Erro ao verificar intervalo entre sessões:', error);
    result.warnings.push('Não foi possível verificar intervalos entre sessões');
  }

  return result;
}

/**
 * Valida duração do agendamento
 */
export function validateAppointmentDuration(startTime: Date, endTime: Date): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (isAfter(startTime, endTime)) {
    result.isValid = false;
    result.errors.push('Horário de término deve ser posterior ao horário de início');
    return result;
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  if (durationMinutes < BUSINESS_RULES.MIN_APPOINTMENT_DURATION) {
    result.isValid = false;
    result.errors.push(
      `Duração mínima do agendamento: ${BUSINESS_RULES.MIN_APPOINTMENT_DURATION} minutos`
    );
  }

  if (durationMinutes > BUSINESS_RULES.MAX_APPOINTMENT_DURATION) {
    result.isValid = false;
    result.errors.push(
      `Duração máxima do agendamento: ${BUSINESS_RULES.MAX_APPOINTMENT_DURATION} minutos (${BUSINESS_RULES.MAX_APPOINTMENT_DURATION / 60}h)`
    );
  }

  return result;
}

/**
 * Valida agendamento no passado
 */
export function validateNotInPast(startTime: Date): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (isBefore(startTime, new Date())) {
    result.isValid = false;
    result.errors.push('Não é possível agendar no passado');
  }

  return result;
}

/**
 * Executa todas as validações de agendamento
 */
export async function validateAppointment(
  params: AppointmentValidationParams
): Promise<ValidationResult> {
  const { professionalId, patientId, startTime, endTime, excludeAppointmentId } = params;

  const results: ValidationResult[] = [];

  // Validações síncronas
  results.push(validateAppointmentDuration(startTime, endTime));
  results.push(validateNotInPast(startTime));

  // Validações assíncronas
  results.push(await checkTimeConflict(professionalId, startTime, endTime, excludeAppointmentId));
  results.push(await checkProfessionalSchedule(professionalId, startTime, endTime));
  results.push(await checkDailyAppointmentLimit(professionalId, startTime));
  
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  results.push(await checkDailyWorkload(professionalId, startTime, durationMinutes));
  results.push(await checkPatientSessionInterval(patientId, professionalId, startTime, excludeAppointmentId));

  // Combinar resultados
  const combinedResult: ValidationResult = {
    isValid: results.every(r => r.isValid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
  };

  return combinedResult;
}
