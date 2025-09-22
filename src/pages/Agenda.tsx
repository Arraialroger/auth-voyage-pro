import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, LogOut, User, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { startOfWeek, endOfWeek, format, addDays, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NewAppointmentModal } from '@/components/NewAppointmentModal';
interface Appointment {
  id: string;
  appointment_start_time: string;
  appointment_end_time: string;
  patient: {
    full_name: string;
  } | null;
  treatment: {
    treatment_name: string;
  } | null;
  professional: {
    full_name: string;
  } | null;
}
export default function Agenda() {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialValues, setModalInitialValues] = useState<{
    professional_id?: string;
    appointment_date?: Date;
    start_time?: string;
  }>({});
  const weekStart = startOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const weekEnd = endOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const {
    data: appointments = [],
    isLoading
  } = useQuery({
    queryKey: ['appointments', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await (supabase as any).from('appointments').select(`
            id,
            appointment_start_time,
            appointment_end_time,
            patients:patient_id (full_name),
            treatments:treatment_id (treatment_name),
            professionals:professional_id (full_name)
          `).gte('appointment_start_time', weekStart.toISOString()).lte('appointment_start_time', weekEnd.toISOString()).order('appointment_start_time');
        if (error) throw error;
        return (data || []).map((apt: any) => ({
          id: apt.id,
          appointment_start_time: apt.appointment_start_time,
          appointment_end_time: apt.appointment_end_time,
          patient: apt.patients,
          treatment: apt.treatments,
          professional: apt.professionals
        })) as Appointment[];
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return [];
      }
    }
  });
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  // Get all professionals for empty slot handling
  const {
    data: allProfessionals = []
  } = useQuery({
    queryKey: ['all-professionals'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await (supabase as any).from('professionals').select('id, full_name').order('full_name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return [];
      }
    }
  });
  const handleEmptySlotClick = (professional: any, day: Date, timeSlot: string) => {
    setModalInitialValues({
      professional_id: professional.id,
      appointment_date: day,
      start_time: timeSlot
    });
    setModalOpen(true);
  };

  // Group appointments by professional and day
  const appointmentsByProfessional = appointments.reduce((acc, apt) => {
    const professionalName = apt.professional?.full_name || 'Profissional não identificado';
    if (!acc[professionalName]) {
      acc[professionalName] = {};
    }
    const dayKey = format(new Date(apt.appointment_start_time), 'yyyy-MM-dd');
    if (!acc[professionalName][dayKey]) {
      acc[professionalName][dayKey] = [];
    }
    acc[professionalName][dayKey].push(apt);
    return acc;
  }, {} as Record<string, Record<string, Appointment[]>>);

  // Use all professionals instead of just those with appointments
  const professionals = allProfessionals.length > 0 ? allProfessionals : Object.keys(appointmentsByProfessional).map(name => ({
    full_name: name
  }));
  const weekDays = Array.from({
    length: 7
  }, (_, i) => addDays(weekStart, i));
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Minha Agenda
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="group border-border/50 hover:border-destructive hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Week Navigation */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={previousWeek} className="border-border/50 hover:bg-muted">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Semana Anterior
                </Button>
                
                <h2 className="text-xl font-semibold">
                  {format(weekStart, "dd 'de' MMMM", {
                  locale: ptBR
                })} - {format(weekEnd, "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR
                })}
                </h2>
                
                <Button variant="outline" onClick={nextWeek} className="border-border/50 hover:bg-muted">
                  Próxima Semana
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Calendar */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
            <CardContent className="p-6">
              {isLoading ? <div className="text-center py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-muted-foreground">Carregando agendamentos...</p>
                </div> : <div className="overflow-x-auto">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-8 gap-2 mb-4">
                    <div className="font-semibold text-sm text-muted-foreground p-2">
                      Profissional
                    </div>
                    {weekDays.map(day => <div key={day.toISOString()} className="font-semibold text-sm text-center p-2">
                        <div>{format(day, 'EEE', {
                      locale: ptBR
                    })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'dd/MM')}</div>
                      </div>)}
                  </div>

                  {/* Calendar Body */}
                  {professionals.length > 0 ? professionals.map(professional => <div key={professional.id || professional.full_name} className="grid grid-cols-8 gap-2 mb-4 border-b border-border/30 pb-4">
                        <div className="font-medium p-2 text-sm">
                          {professional.full_name}
                        </div>
                        {weekDays.map(day => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayAppointments = appointmentsByProfessional[professional.full_name]?.[dayKey] || [];
                  return <div key={dayKey} className="min-h-[120px] p-1 border border-border/20 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                              {dayAppointments.map(appointment => <div key={appointment.id} className="bg-gradient-primary text-primary-foreground p-2 rounded-md mb-1 text-xs shadow-sm">
                                  <div className="font-medium">
                                    {format(new Date(appointment.appointment_start_time), 'HH:mm')}
                                  </div>
                                  <div className="truncate">
                                    {appointment.patient?.full_name || 'Paciente não identificado'}
                                  </div>
                                  <div className="truncate text-primary-foreground/80">
                                    {appointment.treatment?.treatment_name || 'Tratamento não identificado'}
                                  </div>
                                </div>)}
                              
                              {/* Empty slot click area */}
                              <div onClick={() => handleEmptySlotClick(professional, day, '09:00')} className="h-8 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity bg-zinc-800">
                                <Plus className="h-4 w-4 text-muted-foreground bg-white" />
                              </div>
                            </div>;
                })}
                      </div>) : <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum profissional cadastrado</h3>
                      <p className="text-muted-foreground">
                        Não há profissionais cadastrados no sistema.
                      </p>
                    </div>}
                </div>}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* New Appointment Modal */}
      <NewAppointmentModal trigger={<div />} open={modalOpen} onOpenChange={setModalOpen} initialValues={modalInitialValues} onSuccess={() => {
      setModalOpen(false);
      setModalInitialValues({});
    }} />
    </div>;
}