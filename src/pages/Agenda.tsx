import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, LogOut, User, Clock, ChevronLeft, ChevronRight, Plus, Settings, Menu, MoreVertical, Edit, Trash2, Eye, Filter, X, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { startOfWeek, endOfWeek, format, addDays, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useRef } from 'react';
import { NewAppointmentModal } from '@/components/NewAppointmentModal';
import { EditAppointmentModal } from '@/components/EditAppointmentModal';
import { AddToWaitingListModal } from '@/components/AddToWaitingListModal';
import { AppointmentReminderButton } from '@/components/AppointmentReminderButton';
import { RegisterPaymentModal } from '@/components/RegisterPaymentModal';
import { BlockTimeModal } from '@/components/BlockTimeModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DollarSign } from 'lucide-react';
import { BLOCK_PATIENT_ID, BLOCK_TREATMENT_ID } from '@/lib/constants';
import { logger } from '@/lib/logger';
type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show' | 'Pending Confirmation';
interface Appointment {
  id: string;
  patient_id: string | null;
  treatment_id?: string | null;
  appointment_start_time: string;
  appointment_end_time: string;
  status?: AppointmentStatus;
  notes?: string;
  last_reminder_sent_at?: string | null;
  patient: {
    full_name: string;
    contact_phone?: string;
  } | null;
  treatment: {
    id: string;
    treatment_name: string;
  } | null;
  professional: {
    full_name: string;
    id: string;
  } | null;
}
interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number;
  professionalId: string;
  professionalName: string;
}
export default function Agenda() {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const userProfile = useUserProfile();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTreatment, setFilterTreatment] = useState<string>('all');
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string>('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{
    appointmentId: string;
    newStatus: AppointmentStatus;
  } | null>(null);
  const [modalInitialValues, setModalInitialValues] = useState<{
    professional_id?: string;
    appointment_date?: Date;
    start_time?: string;
  }>({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    patientId?: string;
    appointmentId?: string;
  }>({});
  const [completeAfterPaymentDialog, setCompleteAfterPaymentDialog] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<string>('');
  const previousPaymentModalOpen = useRef(paymentModalOpen);
  const [blockTimeModalOpen, setBlockTimeModalOpen] = useState(false);
  const [blockTimeInitialData, setBlockTimeInitialData] = useState<{
    professional_id?: string;
    date?: Date;
    editingBlockId?: string;
  }>({});
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  // Configuração mínima de intervalo para considerar slot disponível
  const MIN_GAP_MINUTES = 30;

  // Helper para identificar bloqueios
  const isBlockedTime = (appointment: Appointment): boolean => {
    return appointment.patient_id === BLOCK_PATIENT_ID;
  };

  // Função para deletar bloqueio
  const handleDeleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: 'Bloqueio removido',
        description: 'O horário foi desbloqueado com sucesso.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      logger.error('Erro ao deletar bloqueio:', error);
      toast({
        title: 'Erro ao remover bloqueio',
        description: 'Não foi possível desbloquear o horário.',
        variant: 'destructive',
      });
    }
    setBlockToDelete(null);
  };

  // Função para editar bloqueio
  const handleEditBlock = (appointment: Appointment) => {
    setBlockTimeInitialData({
      professional_id: appointment.professional?.id,
      date: new Date(appointment.appointment_start_time),
      editingBlockId: appointment.id,
    });
    setBlockTimeModalOpen(true);
  };

  // Função auxiliar para converter "HH:MM:SS" para minutos desde meia-noite
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Função para obter os períodos de trabalho de um profissional em um dia específico
  const getProfessionalWorkPeriods = (professionalId: string, date: Date): Array<{ start: Date; end: Date }> => {
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    
    const schedules = professionalSchedules.filter(
      s => s.professional_id === professionalId && s.day_of_week === dayOfWeek
    );

    if (schedules.length === 0) {
      return []; // Sem horário cadastrado = profissional não trabalha neste dia
    }

    return schedules.map(schedule => {
      const start = new Date(date);
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(date);
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);

      return { start, end };
    });
  };
  const weekStart = startOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const weekEnd = endOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  // Fetch treatments for filter
  const {
    data: allTreatments = []
  } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('treatments').select('id, treatment_name').order('treatment_name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error('Erro ao buscar tratamentos:', error);
        return [];
      }
    }
  });

  // Fetch patients for filter
  const {
    data: allPatients = []
  } = useQuery({
    queryKey: ['patients-for-filter'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('patients').select('id, full_name').order('full_name');
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error('Erro ao buscar pacientes:', error);
        return [];
      }
    }
  });

  // Fetch professional schedules
  const {
    data: professionalSchedules = []
  } = useQuery({
    queryKey: ['professional-schedules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('professional_schedules')
          .select('professional_id, day_of_week, start_time, end_time')
          .order('day_of_week')
          .order('start_time');
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error('Erro ao buscar horários dos profissionais:', error);
        return [];
      }
    }
  });

  // Fetch payment status for appointments
  const {
    data: paymentStatuses = []
  } = useQuery({
    queryKey: ['appointment-payment-statuses', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('financial_transactions')
          .select('id, appointment_id, status, payment_date')
          .not('appointment_id', 'is', null)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString());
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error('Erro ao buscar status de pagamento:', error);
        return [];
      }
    }
  });

  // Fetch installment plans based on transaction IDs
  const transactionIds = paymentStatuses.map(p => p.id).filter(Boolean);
  
  const {
    data: installmentPlans = []
  } = useQuery({
    queryKey: ['installment-plans-by-tx', transactionIds],
    enabled: transactionIds.length > 0,
    queryFn: async () => {
      if (transactionIds.length === 0) return [];
      
      try {
        const { data, error } = await supabase
          .from('installment_plans')
          .select('transaction_id, status')
          .in('transaction_id', transactionIds);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error('Erro ao buscar planos de parcelamento:', error);
        return [];
      }
    }
  });
  const {
    data: appointments = [],
    isLoading
  } = useQuery({
    queryKey: ['appointments', weekStart.toISOString(), weekEnd.toISOString(), userProfile.type, userProfile.professionalId],
    queryFn: async () => {
      try {
        let query = supabase.from('appointments').select(`
            id,
            patient_id,
            treatment_id,
            appointment_start_time,
            appointment_end_time,
            status,
            notes,
            last_reminder_sent_at,
            patients:patient_id (full_name, contact_phone),
            treatments:treatment_id (id, treatment_name),
            professionals:professional_id (id, full_name)
          `).gte('appointment_start_time', weekStart.toISOString()).lte('appointment_start_time', weekEnd.toISOString()).neq('status', 'Cancelled').order('appointment_start_time');

        // Se for profissional, filtrar apenas seus agendamentos
        if (userProfile.type === 'professional' && userProfile.professionalId) {
          query = query.eq('professional_id', userProfile.professionalId);
        }
        const {
          data,
          error
        } = await query;
        if (error) throw error;
        return (data || []).map((apt: any) => ({
          id: apt.id,
          patient_id: apt.patient_id,
          treatment_id: apt.treatment_id,
          appointment_start_time: apt.appointment_start_time,
          appointment_end_time: apt.appointment_end_time,
          status: apt.status,
          notes: apt.notes,
          last_reminder_sent_at: apt.last_reminder_sent_at,
          patient: apt.patients,
          treatment: apt.treatments,
          professional: apt.professionals
        })) as Appointment[];
      } catch (error) {
        logger.error('Erro ao buscar agendamentos:', error);
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
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const {
        error
      } = await supabase.from('appointments').update({
        status: 'Cancelled'
      }).eq('id', appointmentId);
      if (error) throw error;
      toast({
        title: 'Agendamento cancelado',
        description: 'O agendamento foi cancelado com sucesso.'
      });
      queryClient.invalidateQueries({
        queryKey: ['appointments']
      });
      setCancelDialogOpen(false);
    } catch (error) {
      logger.error('Erro ao cancelar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar agendamento. Tente novamente.',
        variant: 'destructive'
      });
    }
  };
  const handleEditAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setEditModalOpen(true);
  };
  const handleCancelDialogOpen = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelDialogOpen(true);
  };

  // Função para obter variante do badge de status
  const getStatusBadgeVariant = (status?: AppointmentStatus): "default" | "secondary" | "success" | "warning" | "destructive" => {
    switch (status) {
      case 'Scheduled':
        return 'default';
      case 'Confirmed':
        return 'success';
      case 'Completed':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      case 'No-Show':
        return 'warning';
      case 'Pending Confirmation':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status?: AppointmentStatus): string => {
    switch (status) {
      case 'Scheduled':
        return 'Agendado';
      case 'Confirmed':
        return 'Confirmado';
      case 'Completed':
        return 'Concluído';
      case 'Cancelled':
        return 'Cancelado';
      case 'No-Show':
        return 'Faltou';
      case 'Pending Confirmation':
        return 'Aguardando Confirmação';
      default:
        return 'Desconhecido';
    }
  };

  // Função para alterar status
  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    // Se for status crítico, mostrar confirmação
    if (newStatus === 'Cancelled' || newStatus === 'No-Show') {
      setStatusChangeData({
        appointmentId,
        newStatus
      });
      setStatusDialogOpen(true);
      return;
    }

    // Para outros status, alterar diretamente
    await updateAppointmentStatus(appointmentId, newStatus);
  };

  // Função para atualizar status no banco
  const updateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      const {
        error
      } = await supabase.from('appointments').update({
        status: newStatus
      }).eq('id', appointmentId);
      if (error) throw error;
      toast({
        title: 'Status atualizado',
        description: `O agendamento foi marcado como "${getStatusLabel(newStatus)}".`
      });
      queryClient.invalidateQueries({
        queryKey: ['appointments']
      });
      setStatusDialogOpen(false);
      setStatusChangeData(null);
    } catch (error) {
      logger.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Função para obter status de pagamento de um agendamento
  const getPaymentStatus = (appointmentId: string): 'paid' | 'pending' | 'overdue' | null => {
    const payments = paymentStatuses.filter(p => p.appointment_id === appointmentId);
    if (payments.length === 0) return null;
    
    // Se alguma transação está completed, mostrar como pago
    if (payments.some(p => p.status === 'completed')) return 'paid';
    
    // Se existe um plano de parcelamento ativo vinculado a qualquer transação, considerar como pago
    const hasActiveInstallmentPlan = payments.some(payment =>
      installmentPlans.some(plan => plan.transaction_id === payment.id && plan.status === 'active')
    );
    
    if (hasActiveInstallmentPlan) return 'paid';
    
    return 'pending';
  };

  // Função para obter badge de status de pagamento
  const getPaymentBadge = (appointmentId: string) => {
    const status = getPaymentStatus(appointmentId);
    if (!status) return null;
    
    if (status === 'paid') {
      return <Badge variant="success" className="ml-2">Pago</Badge>;
    }
    return <Badge variant="warning" className="ml-2">Pendente</Badge>;
  };

  // Função para abrir modal de pagamento com dados pré-preenchidos
  const handleRegisterPayment = (appointmentId: string, patientId: string) => {
    setPaymentModalData({
      appointmentId,
      patientId,
    });
    setPaymentModalOpen(true);
  };

  // Watch for payment modal close and ask about completing appointment
  useEffect(() => {
    // If modal was open and now closed, and there was an appointment ID
    if (previousPaymentModalOpen.current && !paymentModalOpen && paymentModalData.appointmentId) {
      setAppointmentToComplete(paymentModalData.appointmentId);
      setCompleteAfterPaymentDialog(true);
      queryClient.invalidateQueries({ queryKey: ['appointment-payment-statuses'] });
      setPaymentModalData({});
    }
    previousPaymentModalOpen.current = paymentModalOpen;
  }, [paymentModalOpen, paymentModalData.appointmentId, queryClient]);

  // Função para marcar como concluído após pagamento
  const handleCompleteAfterPayment = async () => {
    if (appointmentToComplete) {
      await updateAppointmentStatus(appointmentToComplete, 'Completed');
      setCompleteAfterPaymentDialog(false);
      setAppointmentToComplete('');
    }
  };

  // Função para calcular horários vagos baseado nos horários cadastrados
  const calculateAvailableSlots = (appointments: Appointment[], date: Date, professionalId: string, professionalName: string): AvailableSlot[] => {
    // Buscar períodos de trabalho do profissional para este dia
    const workPeriods = getProfessionalWorkPeriods(professionalId, date);
    
    // Se não há períodos de trabalho, retorna vazio (profissional não trabalha neste dia)
    if (workPeriods.length === 0) {
      return [];
    }

    const dayKey = format(date, 'yyyy-MM-dd');
    const dayAppointments = appointments.filter(apt => {
      const aptDate = format(new Date(apt.appointment_start_time), 'yyyy-MM-dd');
      return aptDate === dayKey && apt.professional?.id === professionalId;
    }).sort((a, b) => new Date(a.appointment_start_time).getTime() - new Date(b.appointment_start_time).getTime());

    const gaps: AvailableSlot[] = [];

    // Processar cada período de trabalho
    for (const period of workPeriods) {
      let currentTime = new Date(period.start);
      const periodEnd = new Date(period.end);

      // Processar agendamentos dentro deste período
      for (const apt of dayAppointments) {
        const aptStart = new Date(apt.appointment_start_time);
        const aptEnd = new Date(apt.appointment_end_time);

        // Ignorar agendamentos fora deste período
        if (aptEnd <= period.start || aptStart >= period.end) {
          continue;
        }

        // Gap antes do agendamento
        if (aptStart.getTime() > currentTime.getTime()) {
          const gapMinutes = (aptStart.getTime() - currentTime.getTime()) / 60000;
          if (gapMinutes >= MIN_GAP_MINUTES) {
            gaps.push({
              start: new Date(currentTime),
              end: new Date(aptStart),
              duration: gapMinutes,
              professionalId,
              professionalName
            });
          }
        }
        
        // Avançar currentTime para o fim do agendamento
        if (aptEnd > currentTime) {
          currentTime = new Date(aptEnd);
        }
      }

      // Gap após último agendamento até o fim do período
      if (currentTime.getTime() < periodEnd.getTime()) {
        const gapMinutes = (periodEnd.getTime() - currentTime.getTime()) / 60000;
        if (gapMinutes >= MIN_GAP_MINUTES) {
          gaps.push({
            start: new Date(currentTime),
            end: new Date(periodEnd),
            duration: gapMinutes,
            professionalId,
            professionalName
          });
        }
      }
    }

    return gaps;
  };

  // Get professionals based on user profile
  const {
    data: allProfessionals = []
  } = useQuery({
    queryKey: ['all-professionals', userProfile.type, userProfile.professionalId],
    queryFn: async () => {
      try {
        let query = supabase.from('professionals').select('id, full_name').order('full_name');

        // Se for profissional, mostrar apenas ele mesmo
        if (userProfile.type === 'professional' && userProfile.professionalId) {
          query = query.eq('id', userProfile.professionalId);
        }
        const {
          data,
          error
        } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return [];
      }
    },
    enabled: !userProfile.loading
  });
  const handleEmptySlotClick = (professional: any, day: Date, timeSlot: string) => {
    setModalInitialValues({
      professional_id: professional.id,
      appointment_date: day,
      start_time: timeSlot
    });
    setModalOpen(true);
  };
  const handleAppointmentClick = (appointment: Appointment) => {
    if (!appointment.patient_id) {
      toast({
        title: "Paciente não identificado",
        variant: "destructive"
      });
      return;
    }
    navigate(`/admin/patients?patientId=${appointment.patient_id}`);
  };

  // Apply filters to appointments
  const filteredAppointments = appointments.filter(apt => {
    // Filter by status
    if (filterStatus !== 'all' && apt.status !== filterStatus) {
      return false;
    }

    // Filter by treatment
    if (filterTreatment !== 'all' && apt.treatment?.id !== filterTreatment) {
      return false;
    }

    // Filter by patient name
    if (filterPatient !== 'all' && !apt.patient?.full_name.toLowerCase().includes(filterPatient.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Count active filters
  const activeFiltersCount = [filterStatus !== 'all', filterTreatment !== 'all', filterPatient !== 'all'].filter(Boolean).length;

  // Group appointments by professional and day
  const appointmentsByProfessional = filteredAppointments.reduce((acc, apt) => {
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
  const professionals = allProfessionals;
  const weekDays = Array.from({
    length: 6
  }, (_, i) => addDays(weekStart, i));
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex justify-between items-center">
        <div className="flex items-center">
          <img src="/assets/new-logo.png" alt="Arraial Odonto" className="h-16 w-16 lg:h-20 lg:w-20 object-contain" />
        </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button variant="outline" onClick={() => navigate('/admin')} className="hidden lg:flex border-border/50 hover:bg-muted">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
              
              {/* Mobile buttons */}
              <div className="lg:hidden flex items-center space-x-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="p-2">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="p-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Desktop buttons */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.email}</span>
                  {userProfile.type && <span className="px-2 py-1 bg-muted rounded-md text-xs">
                      {userProfile.type === 'receptionist' ? 'Recepcionista' : 'Profissional'}
                    </span>}
                </div>
                <ThemeToggle />
                <Button variant="outline" onClick={handleLogout} className="group border-border/50 hover:border-destructive hover:text-destructive">
                  <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 lg:py-8 overflow-x-hidden bg-background">
        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Navigation */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
            <CardContent className="p-4 space-y-4">
              {/* Filters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {activeFiltersCount}
                      </Badge>}
                  </Button>
                  
                  {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={() => {
                  setFilterStatus('all');
                  setFilterTreatment('all');
                  setFilterPatient('all');
                }} className="gap-1 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                      Limpar
                    </Button>}
                </div>

                {showFilters && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Scheduled">Agendado</SelectItem>
                          <SelectItem value="Confirmed">Confirmado</SelectItem>
                          <SelectItem value="Completed">Concluído</SelectItem>
                          <SelectItem value="No-Show">Faltou</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Treatment Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Tratamento</label>
                      <Select value={filterTreatment} onValueChange={setFilterTreatment}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Todos os tratamentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {allTreatments.map(treatment => <SelectItem key={treatment.id} value={treatment.id}>
                              {treatment.treatment_name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Patient Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Paciente</label>
                      <Select value={filterPatient} onValueChange={setFilterPatient}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Todos os pacientes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {allPatients.map(patient => <SelectItem key={patient.id} value={patient.full_name}>
                              {patient.full_name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>}
              </div>

              {/* Mobile: Day navigation */}
              <div className="md:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDay(addDays(currentDay, -1))} className="border-border/50 hover:bg-muted">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 px-2 text-center">
                    <h2 className="text-lg font-semibold truncate">
                      {format(currentDay, "EEEE, dd 'de' MMMM", {
                      locale: ptBR
                    })}
                    </h2>
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => setCurrentDay(addDays(currentDay, 1))} className="border-border/50 hover:bg-muted">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Professional Selector for Mobile */}
                {userProfile.type === 'receptionist' && <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Profissional:</label>
                    <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os profissionais</SelectItem>
                        {allProfessionals.map(prof => <SelectItem key={prof.id} value={prof.id}>
                            {prof.full_name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>}
                
                {/* Mobile action buttons */}
                <div className="flex flex-col gap-2 w-full">
                  <AddToWaitingListModal trigger={<Button variant="outline" className="w-full gap-2">
                        <Clock className="h-4 w-4" />
                        Lista de Espera
                      </Button>} />
                  {userProfile.type === 'receptionist' && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setBlockTimeInitialData({});
                        setBlockTimeModalOpen(true);
                      }} 
                      className="w-full gap-2 border-destructive/50 hover:bg-destructive/10"
                    >
                      <Ban className="h-4 w-4" />
                      Bloquear Horário
                    </Button>
                  )}
                  <Button onClick={() => {
                  setModalInitialValues({});
                  setModalOpen(true);
                }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Agendamento
                  </Button>
                </div>
              </div>

              {/* Desktop: Week navigation */}
              <div className="hidden md:flex items-center justify-between">
                <Button variant="outline" onClick={previousWeek} className="border-border/50 hover:bg-muted">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Semana Anterior
                </Button>
                
                <div className="flex items-center space-x-4">
                  
                  
                  <div className="flex gap-2">
                    <AddToWaitingListModal trigger={<Button variant="outline" className="gap-2">
                          <Clock className="h-4 w-4" />
                          Lista de Espera
                        </Button>} />
                    {userProfile.type === 'receptionist' && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setBlockTimeInitialData({});
                          setBlockTimeModalOpen(true);
                        }} 
                        className="gap-2 border-destructive/50 hover:bg-destructive/10"
                      >
                        <Ban className="h-4 w-4" />
                        Bloquear Horário
                      </Button>
                    )}
                    <Button onClick={() => {
                    setModalInitialValues({});
                    setModalOpen(true);
                  }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </div>
                </div>
                
                <Button variant="outline" onClick={nextWeek} className="border-border/50 hover:bg-muted">
                  Próxima Semana
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
            <CardContent className="p-4 lg:p-6">
              {isLoading ? <div className="text-center py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-muted-foreground">Carregando agendamentos...</p>
                </div> : <>
                  {/* Mobile: Card view for single day */}
                  <div className="md:hidden space-y-4">
                    {(() => {
                  // Filter professionals based on selection
                  const visibleProfessionals = selectedProfessional === 'all' ? professionals : professionals.filter(p => p.id === selectedProfessional);
                  const dayKey = format(currentDay, 'yyyy-MM-dd');
                  if (visibleProfessionals.length === 0) {
                    return <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum profissional encontrado</h3>
                            <p className="text-muted-foreground">
                              Não há profissionais disponíveis para esta seleção.
                            </p>
                          </div>;
                  }
                  return visibleProfessionals.map(professional => {
                    const dayAppointments = appointmentsByProfessional[professional.full_name]?.[dayKey] || [];
                    return <Card key={professional.id} className="border-border/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{professional.full_name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {dayAppointments.length > 0 || calculateAvailableSlots(filteredAppointments, currentDay, professional.id, professional.full_name).length > 0 ? <>
                                   {(() => {
                            const slots = calculateAvailableSlots(filteredAppointments, currentDay, professional.id, professional.full_name);
                            const allItems: Array<{
                              type: 'appointment' | 'gap';
                              data: any;
                            }> = [...dayAppointments.map(apt => ({
                              type: 'appointment' as const,
                              data: apt
                            })), ...slots.map(slot => ({
                              type: 'gap' as const,
                              data: slot
                            }))].sort((a, b) => {
                              const timeA = a.type === 'appointment' ? new Date(a.data.appointment_start_time).getTime() : a.data.start.getTime();
                              const timeB = b.type === 'appointment' ? new Date(b.data.appointment_start_time).getTime() : b.data.start.getTime();
                              return timeA - timeB;
                            });
                            return allItems.map((item, idx) => {
                              if (item.type === 'appointment') {
                                const appointment = item.data;
                                const isBlocked = isBlockedTime(appointment);
                                
                                if (isBlocked) {
                                  return <div key={`apt-${appointment.id}`} className="relative group bg-destructive/20 border-2 border-destructive/50 hover:border-destructive/70 text-destructive-foreground p-3 rounded-md shadow-sm transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <Ban className="h-4 w-4" />
                                        <div className="font-medium text-sm">
                                          {format(new Date(appointment.appointment_start_time), 'HH:mm')} - {format(new Date(appointment.appointment_end_time), 'HH:mm')}
                                        </div>
                                      </div>
                                      {userProfile.type === 'receptionist' && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => handleEditBlock(appointment)}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Editar Bloqueio
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => setBlockToDelete(appointment.id)}
                                              className="text-destructive focus:text-destructive"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Remover Bloqueio
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium">🚫 Horário Bloqueado</div>
                                    {appointment.notes && (
                                      <div className="text-xs mt-1 opacity-80">
                                        {appointment.notes}
                                      </div>
                                    )}
                                  </div>;
                                }
                                
                                return <div key={`apt-${appointment.id}`} className="relative bg-primary text-primary-foreground p-3 rounded-md shadow-sm group">
                                             <div className="flex justify-between items-start gap-2">
                                               <div className="flex-1 cursor-pointer" onClick={() => handleAppointmentClick(appointment)}>
                                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <div className="font-medium text-sm">
                                                      {format(new Date(appointment.appointment_start_time), 'HH:mm')} - {format(new Date(appointment.appointment_end_time), 'HH:mm')}
                                                    </div>
                                                    <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-[10px] px-1.5 py-0">
                                                      {getStatusLabel(appointment.status)}
                                                    </Badge>
                                                    {getPaymentBadge(appointment.id)}
                                                  </div>
                                                 <div className="text-sm">
                                                   {appointment.patient?.full_name || 'Paciente não identificado'}
                                                 </div>
                                                 <div className="text-xs text-primary-foreground/80 mt-1">
                                                   {appointment.treatment?.treatment_name || 'Tratamento não identificado'}
                                                 </div>
                                               </div>
                                               <DropdownMenu>
                                                 <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                   <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20">
                                                     <MoreVertical className="h-4 w-4" />
                                                   </Button>
                                                 </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => handleEditAppointment(appointment.id)}>
                                                      <Edit className="mr-2 h-4 w-4" />
                                                      Editar Agendamento
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAppointmentClick(appointment)}>
                                                      <Eye className="mr-2 h-4 w-4" />
                                                      Ver Paciente
                                                    </DropdownMenuItem>
                                                    {appointment.patient_id && (
                                                      <DropdownMenuItem onClick={() => handleRegisterPayment(appointment.id, appointment.patient_id!)}>
                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                        Registrar Pagamento
                                                      </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuSub>
                                                      <DropdownMenuSubTrigger>
                                                        Alterar Status
                                                      </DropdownMenuSubTrigger>
                                                      <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Scheduled')}>
                                                          Agendado
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Confirmed')}>
                                                          Confirmado
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Completed')}>
                                                          Concluído
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'No-Show')}>
                                                          Faltou
                                                        </DropdownMenuItem>
                                                      </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                   <DropdownMenuSeparator />
                                                   <DropdownMenuItem onClick={() => handleCancelDialogOpen(appointment.id)} className="text-destructive focus:text-destructive">
                                                     <Trash2 className="mr-2 h-4 w-4" />
                                                     Cancelar Agendamento
                                                   </DropdownMenuItem>
                                                 </DropdownMenuContent>
                                               </DropdownMenu>
                                             </div>
                                           </div>;
                              } else {
                                const gap = item.data;
                                return <div key={`gap-${idx}`} onClick={() => handleEmptySlotClick({
                                  id: gap.professionalId,
                                  full_name: gap.professionalName
                                }, currentDay, format(gap.start, 'HH:mm'))} className="border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-3 rounded-md cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Clock className="h-4 w-4" />
                                              <div className="flex-1">
                                                <div className="font-medium text-sm">Horário Vago</div>
                                                <div className="text-xs">{format(gap.start, 'HH:mm')} - {format(gap.end, 'HH:mm')}</div>
                                                <div className="text-xs opacity-70">{Math.floor(gap.duration)} min disponíveis</div>
                                              </div>
                                              <Plus className="h-4 w-4" />
                                            </div>
                                          </div>;
                              }
                            });
                          })()}
                                </> : <div className="text-center py-6 text-muted-foreground">
                                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Nenhum agendamento para este dia</p>
                                </div>}
                              
                              {/* Add appointment button */}
                              <Button variant="outline" className="w-full mt-3" onClick={() => handleEmptySlotClick(professional, currentDay, '09:00')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Agendamento
                              </Button>
                            </CardContent>
                          </Card>;
                  });
                })()}
                  </div>

                  {/* Desktop: Grid view for full week */}
                  <div className="hidden md:block overflow-x-auto">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-2 mb-4 min-w-[700px]">
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
                    {professionals.length > 0 ? <div className="min-w-[700px]">
                        {professionals.map(professional => <div key={professional.id} className="grid grid-cols-7 gap-2 mb-4 border-b border-border/30 pb-4">
                            <div className="font-medium p-2 text-sm">
                              {professional.full_name}
                            </div>
                            {weekDays.map(day => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayAppointments = appointmentsByProfessional[professional.full_name]?.[dayKey] || [];
                      const availableSlots = calculateAvailableSlots(filteredAppointments, day, professional.id, professional.full_name);
                      const allItems: Array<{
                        type: 'appointment' | 'gap';
                        data: any;
                      }> = [...dayAppointments.map(apt => ({
                        type: 'appointment' as const,
                        data: apt
                      })), ...availableSlots.map(slot => ({
                        type: 'gap' as const,
                        data: slot
                      }))].sort((a, b) => {
                        const timeA = a.type === 'appointment' ? new Date(a.data.appointment_start_time).getTime() : a.data.start.getTime();
                        const timeB = b.type === 'appointment' ? new Date(b.data.appointment_start_time).getTime() : b.data.start.getTime();
                        return timeA - timeB;
                      });
                      return <div key={dayKey} className="min-h-[120px] p-1 border border-border/20 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors space-y-1">
                                  {allItems.map((item, idx) => {
                          if (item.type === 'appointment') {
                            const appointment = item.data;
                            const isBlocked = isBlockedTime(appointment);
                            
                            if (isBlocked) {
                              return <div key={`apt-${appointment.id}`} className="relative group bg-destructive/20 border-2 border-destructive/50 hover:border-destructive/70 text-destructive-foreground p-2 rounded-md text-xs transition-colors cursor-pointer">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <div className="flex items-center gap-1">
                                    <Ban className="h-3 w-3" />
                                    <div className="font-medium">
                                      {format(new Date(appointment.appointment_start_time), 'HH:mm')} - {format(new Date(appointment.appointment_end_time), 'HH:mm')}
                                    </div>
                                  </div>
                                  {userProfile.type === 'receptionist' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleEditBlock(appointment)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar Bloqueio
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => setBlockToDelete(appointment.id)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Remover Bloqueio
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                                <div className="font-medium text-[10px]">🚫 Bloqueado</div>
                                {appointment.notes && (
                                  <div className="text-[9px] mt-0.5 opacity-80 truncate">
                                    {appointment.notes}
                                  </div>
                                )}
                              </div>;
                            }
                            
                            return <div key={`apt-${appointment.id}`} className="relative bg-primary text-primary-foreground p-2 rounded-md text-xs shadow-sm group">
                                           <div className="flex justify-between items-start gap-1">
                                             <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleAppointmentClick(appointment)}>
                                                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                                  <div className="font-medium">
                                                    {format(new Date(appointment.appointment_start_time), 'HH:mm')} - {format(new Date(appointment.appointment_end_time), 'HH:mm')}
                                                  </div>
                                                  <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-[9px] px-1 py-0">
                                                    {getStatusLabel(appointment.status)}
                                                  </Badge>
                                                  {getPaymentBadge(appointment.id)}
                                                </div>
                                               <div className="truncate">
                                                 {appointment.patient?.full_name || 'Paciente não identificado'}
                                               </div>
                                               <div className="truncate text-primary-foreground/80">
                                                 {appointment.treatment?.treatment_name || 'Tratamento não identificado'}
                                               </div>
                                             </div>
                                             <DropdownMenu>
                                               <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                 <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-primary-foreground hover:bg-primary-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <MoreVertical className="h-3 w-3" />
                                                 </Button>
                                               </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                  <DropdownMenuItem onClick={() => handleEditAppointment(appointment.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                  </DropdownMenuItem>
                                                   <DropdownMenuItem onClick={() => handleAppointmentClick(appointment)}>
                                                     <Eye className="mr-2 h-4 w-4" />
                                                     Ver Paciente
                                                   </DropdownMenuItem>
                                                   {appointment.patient_id && (
                                                     <DropdownMenuItem onClick={() => handleRegisterPayment(appointment.id, appointment.patient_id!)}>
                                                       <DollarSign className="mr-2 h-4 w-4" />
                                                       Registrar Pagamento
                                                     </DropdownMenuItem>
                                                   )}
                                                   <DropdownMenuSeparator />
                                                  <DropdownMenuItem asChild>
                                                    <div className="w-full">
                                                      <AppointmentReminderButton appointmentId={appointment.id} patientPhone={appointment.patient?.contact_phone || ''} patientName={appointment.patient?.full_name || ''} appointmentDate={appointment.appointment_start_time} treatmentName={appointment.treatment?.treatment_name || ''} lastReminderSent={appointment.last_reminder_sent_at} />
                                                    </div>
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                      Alterar Status
                                                    </DropdownMenuSubTrigger>
                                                     <DropdownMenuSubContent>
                                                       <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Scheduled')}>
                                                         Agendado
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Pending Confirmation')}>
                                                         Aguardando Confirmação
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Confirmed')}>
                                                         Confirmado
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'Completed')}>
                                                         Concluído
                                                       </DropdownMenuItem>
                                                       <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'No-Show')}>
                                                         Faltou
                                                       </DropdownMenuItem>
                                                     </DropdownMenuSubContent>
                                                  </DropdownMenuSub>
                                                 <DropdownMenuSeparator />
                                                 <DropdownMenuItem onClick={() => handleCancelDialogOpen(appointment.id)} className="text-destructive focus:text-destructive">
                                                   <Trash2 className="mr-2 h-4 w-4" />
                                                   Cancelar
                                                 </DropdownMenuItem>
                                               </DropdownMenuContent>
                                             </DropdownMenu>
                                           </div>
                                         </div>;
                          } else {
                            const gap = item.data;
                            return <div key={`gap-${idx}`} onClick={() => handleEmptySlotClick({
                              id: gap.professionalId,
                              full_name: gap.professionalName
                            }, day, format(gap.start, 'HH:mm'))} className="border border-dashed border-muted-foreground/30 bg-muted/30 p-1 rounded cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all">
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs font-medium truncate">Vago</div>
                                              <div className="text-[10px] truncate">{format(gap.start, 'HH:mm')}-{format(gap.end, 'HH:mm')}</div>
                                            </div>
                                          </div>
                                        </div>;
                          }
                        })}
                                  
                                  {/* Empty slot click area */}
                                  {allItems.length === 0 && <div onClick={() => handleEmptySlotClick(professional, day, '09:00')} className="h-full min-h-[100px] flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity bg-muted/40 hover:bg-muted/60 rounded border border-dashed border-muted-foreground/30">
                                      <Plus className="h-4 w-4 text-muted-foreground" />
                                    </div>}
                                </div>;
                    })}
                          </div>)}
                      </div> : <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum profissional cadastrado</h3>
                        <p className="text-muted-foreground">
                          Não há profissionais cadastrados no sistema.
                        </p>
                      </div>}
                  </div>
                </>}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* New Appointment Modal */}
      <NewAppointmentModal trigger={<div />} open={modalOpen} onOpenChange={setModalOpen} initialValues={modalInitialValues} onSuccess={() => {
      setModalOpen(false);
      setModalInitialValues({});
    }} />

      {/* Edit Appointment Modal */}
      {selectedAppointmentId && <EditAppointmentModal appointmentId={selectedAppointmentId} open={editModalOpen} onOpenChange={setEditModalOpen} onSuccess={() => {
      setEditModalOpen(false);
      setSelectedAppointmentId('');
    }} />}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCancelAppointment(appointmentToCancel)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Status do Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status deste agendamento para "{statusChangeData ? getStatusLabel(statusChangeData.newStatus) : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusChangeData(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusChangeData && updateAppointmentStatus(statusChangeData.appointmentId, statusChangeData.newStatus)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Registration Modal */}
      <RegisterPaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen}
        prefilledPatientId={paymentModalData.patientId}
        prefilledAppointmentId={paymentModalData.appointmentId}
      />

      {/* Complete After Payment Confirmation Dialog */}
      <AlertDialog open={completeAfterPaymentDialog} onOpenChange={setCompleteAfterPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pagamento Registrado!</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento foi registrado com sucesso. Deseja marcar a consulta como concluída?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCompleteAfterPaymentDialog(false);
              setAppointmentToComplete('');
            }}>
              Não, agora não
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteAfterPayment} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sim, marcar como concluída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Time Modal */}
      <BlockTimeModal 
        open={blockTimeModalOpen} 
        onOpenChange={setBlockTimeModalOpen}
        professionals={allProfessionals}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }}
        initialData={blockTimeInitialData}
      />

      {/* Delete Block Confirmation Dialog */}
      <AlertDialog open={!!blockToDelete} onOpenChange={(open) => !open && setBlockToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloqueio de horário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desbloquear este horário na agenda. O horário ficará disponível para novos agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => blockToDelete && handleDeleteBlock(blockToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}