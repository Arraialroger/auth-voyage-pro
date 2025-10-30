import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, Stethoscope, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface Appointment {
  id: string;
  appointment_start_time: string;
  appointment_end_time: string;
  status: string;
  notes: string | null;
  professionals: {
    full_name: string;
    specialization: string;
  } | null;
  treatments: {
    treatment_name: string;
    description: string | null;
  } | null;
}


interface PatientAppointmentHistoryProps {
  patientId: string;
}

const statusColors: Record<string, string> = {
  Scheduled: 'bg-info/10 text-info border-info/20',
  Confirmed: 'bg-success/10 text-success border-success/20',
  Completed: 'bg-success/10 text-success border-success/20',
  Cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  NoShow: 'bg-warning/10 text-warning border-warning/20',
};

const statusLabels: Record<string, string> = {
  Scheduled: 'Agendado',
  Confirmed: 'Confirmado',
  Completed: 'Concluído',
  Cancelled: 'Cancelado',
  NoShow: 'Faltou',
};

export function PatientAppointmentHistory({ patientId }: PatientAppointmentHistoryProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_start_time,
          appointment_end_time,
          status,
          notes,
          professionals (
            full_name,
            specialization
          ),
          treatments (
            treatment_name,
            description
          )
        `)
        .eq('patient_id', patientId)
        .order('appointment_start_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      logger.error('Erro ao buscar histórico de consultas:', error);
    } finally{
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border border-border/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma consulta encontrada
        </h3>
        <p className="text-sm text-muted-foreground">
          Este paciente ainda não possui histórico de consultas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="p-4 border border-border/50 rounded-lg hover:border-primary/20 hover:shadow-soft transition-all duration-300 bg-card/50"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {format(new Date(appointment.appointment_start_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <Badge className={statusColors[appointment.status] || 'bg-muted'}>
              {statusLabels[appointment.status] || appointment.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(appointment.appointment_start_time), 'HH:mm', { locale: ptBR })} - {format(new Date(appointment.appointment_end_time), 'HH:mm', { locale: ptBR })}
              </span>
            </div>

            {appointment.professionals && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {appointment.professionals.full_name}
                  {appointment.professionals.specialization && (
                    <span className="text-xs ml-1">
                      ({appointment.professionals.specialization})
                    </span>
                  )}
                </span>
              </div>
            )}

            {appointment.treatments && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Stethoscope className="h-4 w-4" />
                <span>{appointment.treatments.treatment_name}</span>
              </div>
            )}

            {appointment.notes && (
              <div className="flex items-start gap-2 text-muted-foreground mt-3 pt-3 border-t border-border/30">
                <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">{appointment.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="text-center pt-4 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          Total de {appointments.length} consulta{appointments.length !== 1 ? 's' : ''} registrada{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
