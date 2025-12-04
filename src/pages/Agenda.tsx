import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  LogOut,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  MoreVertical,
  Trash2,
  X,
  MessageSquare,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useMemo } from "react";
import { startOfWeek, endOfWeek, format, addDays, addWeeks, subWeeks, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatUTCTime, formatUTCDate } from "@/lib/dateUtils";
import { NewAppointmentModal } from "@/components/NewAppointmentModal";
import { AddToWaitingListModal } from "@/components/AddToWaitingListModal";
import { AppointmentReminderButton } from "@/components/AppointmentReminderButton";
import { EditPatientModal } from "@/components/EditPatientModal";

import { useUserProfile } from "@/hooks/useUserProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { NotificationTestButton } from "@/components/NotificationTestButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "@/components/OptimizedImage";

type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "Patient Arrived"
  | "Completed"
  | "Cancelled"
  | "No-Show"
  | "Pending Confirmation";

interface Appointment {
  id: string;
  patient_id: string | null;
  treatment_id?: string | null;
  appointment_start_time: string;
  appointment_end_time: string;
  status?: AppointmentStatus;
  notes?: string;
  last_reminder_sent_at?: string | null;
  is_squeeze_in?: boolean;
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

// Helper to get UTC values as local Date (for consistent time comparison)
const getUTCAsLocal = (isoString: string): Date => {
  const date = new Date(isoString);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
};

export default function Agenda() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const userProfile = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ativar sistema de notificações
  useAppointmentNotifications();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());

  // Sincronizar currentWeek com currentDay (para mobile)
  useEffect(() => {
    const dayWeekStart = startOfWeek(currentDay, { weekStartsOn: 1 });
    const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

    // Se o dia atual está em uma semana diferente da currentWeek, atualizar
    if (dayWeekStart.getTime() !== currentWeekStart.getTime()) {
      setCurrentWeek(currentDay);
    }
  }, [currentDay]);

  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string>("");
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
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  
  const [globalPatientSearch, setGlobalPatientSearch] = useState<string>("");
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const [highlightToday, setHighlightToday] = useState(false);

  // Configuração mínima de intervalo para considerar slot disponível
  const MIN_GAP_MINUTES = 30;

  // Função auxiliar para converter "HH:MM:SS" para minutos desde meia-noite
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Função para obter os períodos de trabalho de um profissional em um dia específico
  const getProfessionalWorkPeriods = (professionalId: string, date: Date): Array<{ start: Date; end: Date }> => {
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

    const schedules = professionalSchedules.filter(
      (s) => s.professional_id === professionalId && s.day_of_week === dayOfWeek,
    );

    if (schedules.length === 0) {
      return []; // Sem horário cadastrado = profissional não trabalha neste dia
    }

    return schedules.map((schedule) => {
      const start = new Date(date);
      const [startHour, startMinute] = schedule.start_time.split(":").map(Number);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(date);
      const [endHour, endMinute] = schedule.end_time.split(":").map(Number);
      end.setHours(endHour, endMinute, 0, 0);

      return { start, end };
    });
  };

  const weekStart = startOfWeek(currentWeek, {
    weekStartsOn: 1,
  });
  const weekEnd = endOfWeek(currentWeek, {
    weekStartsOn: 1,
  });

  // Fetch patients for global search (professionals only)
  const { data: globalSearchPatients = [] } = useQuery({
    queryKey: ["patients-global-search", globalPatientSearch, userProfile.professionalId],
    queryFn: async () => {
      if (!globalPatientSearch.trim() || userProfile.type !== "professional") {
        return [];
      }

      try {
        const searchTerm = globalPatientSearch.toLowerCase().trim();
        const { data, error } = await supabase
          .from("patients")
          .select("id, full_name, contact_phone")
          .or(`full_name.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%`)
          .order("full_name")
          .limit(10);

        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error("Erro ao buscar pacientes globalmente:", error);
        return [];
      }
    },
    enabled: globalPatientSearch.trim().length > 0 && userProfile.type === "professional",
  });

  // Fetch professional schedules
  const { data: professionalSchedules = [] } = useQuery({
    queryKey: ["professional-schedules"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("professional_schedules")
          .select("professional_id, day_of_week, start_time, end_time")
          .order("day_of_week")
          .order("start_time");

        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error("Erro ao buscar horários dos profissionais:", error);
        return [];
      }
    },
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [
      "appointments",
      weekStart.toISOString(),
      weekEnd.toISOString(),
      userProfile.type,
      userProfile.professionalId,
    ],
    queryFn: async () => {
      try {
        let query = supabase
          .from("appointments")
          .select(
            `
            id,
            patient_id,
            treatment_id,
            appointment_start_time,
            appointment_end_time,
            status,
            notes,
            last_reminder_sent_at,
            is_squeeze_in,
            patients:patient_id (full_name, contact_phone),
            treatments:treatment_id (id, treatment_name),
            professionals:professional_id (id, full_name)
          `,
          )
          .gte("appointment_start_time", weekStart.toISOString())
          .lte("appointment_start_time", weekEnd.toISOString())
          .neq("status", "Cancelled")
          .order("appointment_start_time");

        // Se for profissional, filtrar apenas seus agendamentos
        if (userProfile.type === "professional" && userProfile.professionalId) {
          query = query.eq("professional_id", userProfile.professionalId);
        }
        const { data, error } = await query;
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
          is_squeeze_in: apt.is_squeeze_in || false,
          patient: apt.patients,
          treatment: apt.treatments,
          professional: apt.professionals,
        })) as Appointment[];
      } catch (error) {
        logger.error("Erro ao buscar agendamentos:", error);
        return [];
      }
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "Cancelled",
        })
        .eq("id", appointmentId);
      if (error) throw error;
      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso.",
      });
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
      setCancelDialogOpen(false);
    } catch (error) {
      logger.error("Erro ao cancelar agendamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDialogOpen = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setCancelDialogOpen(true);
  };

  // Função para obter variante do badge de status
  const getStatusBadgeVariant = (
    status?: AppointmentStatus,
  ): "default" | "secondary" | "success" | "warning" | "destructive" => {
    switch (status) {
      case "Scheduled":
        return "default";
      case "Confirmed":
        return "success";
      case "Patient Arrived":
        return "success";
      case "Completed":
        return "secondary";
      case "Cancelled":
        return "destructive";
      case "No-Show":
        return "warning";
      case "Pending Confirmation":
        return "warning";
      default:
        return "default";
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status?: AppointmentStatus): string => {
    switch (status) {
      case "Scheduled":
        return "Agendado";
      case "Confirmed":
        return "Confirmado";
      case "Patient Arrived":
        return "🟢 Chegou";
      case "Completed":
        return "Concluído";
      case "Cancelled":
        return "Cancelado";
      case "No-Show":
        return "Faltou";
      case "Pending Confirmation":
        return "Aguardando Confirmação";
      default:
        return "Desconhecido";
    }
  };

  // Função para alterar status
  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    // Se for status crítico, mostrar confirmação
    if (newStatus === "Cancelled" || newStatus === "No-Show") {
      setStatusChangeData({
        appointmentId,
        newStatus,
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
      const { error } = await supabase
        .from("appointments")
        .update({
          status: newStatus,
        })
        .eq("id", appointmentId);

      logger.info("📝 Status atualizado:", { appointmentId, newStatus, error });

      if (error) throw error;
      toast({
        title: "Status atualizado",
        description: `O agendamento foi marcado como "${getStatusLabel(newStatus)}".`,
      });
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
      setStatusDialogOpen(false);
      setStatusChangeData(null);
    } catch (error) {
      logger.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para calcular horários vagos baseado nos horários cadastrados
  const calculateAvailableSlots = (
    appointments: Appointment[],
    date: Date,
    professionalId: string,
    professionalName: string,
  ): AvailableSlot[] => {
    // Buscar períodos de trabalho do profissional para este dia
    const workPeriods = getProfessionalWorkPeriods(professionalId, date);

    // Se não há períodos de trabalho, retorna vazio (profissional não trabalha neste dia)
    if (workPeriods.length === 0) {
      return [];
    }

    const dayKey = format(date, "yyyy-MM-dd");
    
    // Filtrar agendamentos do dia/profissional
    const dayAppointments = appointments
      .filter((apt) => {
        const aptDate = formatUTCDate(apt.appointment_start_time, "yyyy-MM-dd");
        return aptDate === dayKey && apt.professional?.id === professionalId;
      })
      .sort((a, b) => new Date(a.appointment_start_time).getTime() - new Date(b.appointment_start_time).getTime());

    // Converter agendamentos em ocupações
    type Occupation = { start: Date; end: Date };
    const occupations: Occupation[] = dayAppointments.map((apt) => ({
      start: getUTCAsLocal(apt.appointment_start_time),
      end: getUTCAsLocal(apt.appointment_end_time),
    })).sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps: AvailableSlot[] = [];

    // Processar cada período de trabalho
    for (const period of workPeriods) {
      let currentTime = new Date(period.start);
      const periodEnd = new Date(period.end);

      // Processar ocupações dentro deste período
      for (const occ of occupations) {
        // Ignorar ocupações fora deste período
        if (occ.end <= period.start || occ.start >= period.end) {
          continue;
        }

        // Gap antes da ocupação
        if (occ.start.getTime() > currentTime.getTime()) {
          const gapMinutes = (occ.start.getTime() - currentTime.getTime()) / 60000;
          if (gapMinutes >= MIN_GAP_MINUTES) {
            gaps.push({
              start: new Date(currentTime),
              end: new Date(occ.start),
              duration: gapMinutes,
              professionalId,
              professionalName,
            });
          }
        }

        // Avançar currentTime para o fim da ocupação
        if (occ.end > currentTime) {
          currentTime = new Date(occ.end);
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
            professionalName,
          });
        }
      }
    }

    return gaps;
  };

  // Função para navegar para página do paciente (Fase 1)
  const handlePatientNameClick = (e: React.MouseEvent, patientId: string | null) => {
    e.stopPropagation();
    if (userProfile.type === "professional" && patientId) {
      navigate(`/patient/${patientId}`);
    }
  };

  // Função para abrir modal de novo agendamento para paciente (Fase 2)
  const handleScheduleForPatient = (patient: { id: string; full_name: string }) => {
    setModalInitialValues({
      professional_id: userProfile.professionalId || undefined,
    });
    setModalOpen(true);
    setGlobalPatientSearch("");
  };

  // Get professionals based on user profile
  const { data: allProfessionals = [] } = useQuery({
    queryKey: ["all-professionals", userProfile.type, userProfile.professionalId],
    queryFn: async () => {
      try {
        let query = supabase.from("professionals").select("id, full_name").order("full_name");

        // Se for profissional, mostrar apenas ele mesmo
        if (userProfile.type === "professional" && userProfile.professionalId) {
          query = query.eq("id", userProfile.professionalId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error("Erro ao buscar profissionais:", error);
        return [];
      }
    },
    enabled: !userProfile.loading,
  });

  const handleEmptySlotClick = (professional: any, day: Date, timeSlot: string) => {
    setModalInitialValues({
      professional_id: professional.id,
      appointment_date: day,
      start_time: timeSlot,
    });
    setModalOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    if (!appointment.patient_id) {
      toast({
        title: "Paciente não identificado",
        variant: "destructive",
      });
      return;
    }

    // ✅ NOVO: Verificar tipo de usuário
    if (userProfile.type === "receptionist") {
      // Recepcionistas: abrir modal de edição (apenas dados cadastrais)
      setSelectedPatientId(appointment.patient_id);
      setEditPatientModalOpen(true);
    } else {
      // Profissionais: navegar para página completa (informações clínicas)
      navigate(`/patient/${appointment.patient_id}`);
    }
  };

  // Appointments list (sem filtros adicionais)
  const filteredAppointments = useMemo(() => appointments, [appointments]);

  // Group appointments by professional and day (optimized with useMemo)
  const appointmentsByProfessional = useMemo(() => {
    return filteredAppointments.reduce(
      (acc, apt) => {
        const professionalName = apt.professional?.full_name || "Profissional não identificado";
        if (!acc[professionalName]) {
          acc[professionalName] = {};
        }
        const dayKey = formatUTCDate(apt.appointment_start_time, "yyyy-MM-dd");
        if (!acc[professionalName][dayKey]) {
          acc[professionalName][dayKey] = [];
        }
        acc[professionalName][dayKey].push(apt);
        return acc;
      },
      {} as Record<string, Record<string, Appointment[]>>,
    );
  }, [filteredAppointments]);

  // Use all professionals instead of just those with appointments
  const professionals = allProfessionals;
  const weekDays = Array.from(
    {
      length: 6,
    },
    (_, i) => addDays(weekStart, i),
  );

  // Auto-scroll to today on desktop (once only)
  const hasScrolledToToday = useRef(false);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    if (isDesktop && todayColumnRef.current && !hasScrolledToToday.current) {
      hasScrolledToToday.current = true;

      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });

        // Brief highlight animation
        setHighlightToday(true);
        setTimeout(() => setHighlightToday(false), 2000);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <OptimizedImage
                src="/assets/new-logo.png"
                alt="Arraial Odonto"
                className="h-16 w-16 lg:h-20 lg:w-20 object-contain"
                loading="eager"
              />
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              {userProfile.type === "receptionist" && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  className="hidden lg:flex border-border/50 hover:bg-muted"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}

              {/* Mobile buttons */}
              <div className="lg:hidden flex items-center space-x-2">
                <ThemeToggle />
                {userProfile.type === "receptionist" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="p-2">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="p-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Desktop buttons */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.email}</span>
                  {userProfile.type && (
                    <span className="px-2 py-1 bg-muted rounded-md text-xs">
                      {userProfile.type === "receptionist" ? "Recepcionista" : "Profissional"}
                    </span>
                  )}
                </div>
                {userProfile.type === "professional" && <NotificationTestButton />}
                <ThemeToggle />
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="group border-border/50 hover:border-destructive hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 lg:py-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
          {/* Navigation */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
            <CardContent className="p-4 space-y-4">
              {/* Busca Global de Pacientes - Apenas Profissionais */}
              {userProfile.type === "professional" && (
                <div className="relative max-w-md">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar qualquer paciente..."
                    value={globalPatientSearch}
                    onChange={(e) => setGlobalPatientSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
                  />
                  {globalPatientSearch && (
                    <button
                      onClick={() => setGlobalPatientSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Resultados da Busca Global */}
                  {globalPatientSearch && globalSearchPatients.length > 0 && (
                    <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto shadow-lg">
                      <CardContent className="p-0">
                        {globalSearchPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="border-b last:border-0 p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-semibold">{patient.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {patient.contact_phone
                                  ? patient.contact_phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
                                  : "Sem telefone"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigate(`/patient/${patient.id}`);
                                  setGlobalPatientSearch("");
                                }}
                              >
                                Ver Página
                              </Button>
                              <Button size="sm" onClick={() => handleScheduleForPatient(patient)}>
                                Agendar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Professional Filter - Desktop/Tablet Only */}
              {userProfile.type === "receptionist" && (
                <div className="hidden md:flex items-center gap-3 pb-3 border-b border-border/30">
                  <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Filtrar por Profissional:
                  </label>
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                    <SelectTrigger className="w-[280px] bg-background">
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os profissionais</SelectItem>
                      {allProfessionals.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Mobile: Day navigation */}
              <div className="md:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDay(addDays(currentDay, -1))}
                    className="border-border/50 hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 px-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="text-lg font-semibold truncate">
                        {format(currentDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h2>
                      {format(currentDay, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
                        <Badge
                          variant="default"
                          className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold"
                        >
                          HOJE
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDay(addDays(currentDay, 1))}
                    className="border-border/50 hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Professional Selector for Mobile */}
                {userProfile.type === "receptionist" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Profissional:</label>
                    <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os profissionais</SelectItem>
                        {allProfessionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Mobile action buttons */}
                <div className="flex flex-col gap-2 w-full">
                  <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/admin/waiting-list")}>
                    <Clock className="h-4 w-4" />
                    Lista de Espera
                  </Button>
                  <Button
                    onClick={() => {
                      setModalInitialValues({});
                      setModalOpen(true);
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
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
                    <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/waiting-list")}>
                      <Clock className="h-4 w-4" />
                      Lista de Espera
                    </Button>
                    <Button
                      onClick={() => {
                        setModalInitialValues({});
                        setModalOpen(true);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
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
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-muted-foreground">Carregando agendamentos...</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Card view for single day */}
                  <div className="md:hidden space-y-4">
                    {(() => {
                      // Filter professionals based on selection
                      const visibleProfessionals =
                        selectedProfessional === "all"
                          ? professionals
                          : professionals.filter((p) => p.id === selectedProfessional);
                      const dayKey = format(currentDay, "yyyy-MM-dd");
                      if (visibleProfessionals.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum profissional encontrado</h3>
                            <p className="text-muted-foreground">Não há profissionais disponíveis para esta seleção.</p>
                          </div>
                        );
                      }
                      return visibleProfessionals.map((professional) => {
                        const dayAppointments = appointmentsByProfessional[professional.full_name]?.[dayKey] || [];
                        return (
                          <Card key={professional.id} className="border-border/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{professional.full_name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {(() => {
                                const slots = calculateAvailableSlots(
                                  filteredAppointments,
                                  currentDay,
                                  professional.id,
                                  professional.full_name,
                                );
                                
                                const hasContent = dayAppointments.length > 0 || slots.length > 0;
                                
                                if (!hasContent) {
                                  return (
                                    <div className="text-center py-6 text-muted-foreground">
                                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">Nenhum agendamento para este dia</p>
                                    </div>
                                  );
                                }
                                
                                const allItems: Array<{
                                  type: "appointment" | "gap";
                                  data: any;
                                }> = [
                                  ...dayAppointments.map((apt) => ({
                                    type: "appointment" as const,
                                    data: apt,
                                  })),
                                  ...slots.map((slot) => ({
                                    type: "gap" as const,
                                    data: slot,
                                  })),
                                ].sort((a, b) => {
                                  const getTime = (item: typeof allItems[0]) => {
                                    if (item.type === "appointment") return getUTCAsLocal(item.data.appointment_start_time).getTime();
                                    return item.data.start.getTime();
                                  };
                                  return getTime(a) - getTime(b);
                                });
                                
                                return allItems.map((item, idx) => {
                                  if (item.type === "appointment") {
                                    const appointment = item.data as Appointment;
                                    return (
                                      <div
                                        key={appointment.id}
                                        onClick={() => handleAppointmentClick(appointment)}
                                        className={cn(
                                          "p-3 rounded-md cursor-pointer transition-colors relative group",
                                          appointment.is_squeeze_in
                                            ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-dashed border-yellow-500"
                                            : "bg-primary/10 hover:bg-primary/20 border-l-4 border-primary",
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-sm font-medium">
                                                {formatUTCTime(appointment.appointment_start_time)} -{" "}
                                                {formatUTCTime(appointment.appointment_end_time)}
                                              </span>
                                              <Badge
                                                variant={getStatusBadgeVariant(appointment.status)}
                                                className="text-xs"
                                              >
                                                {getStatusLabel(appointment.status)}
                                              </Badge>
                                              {appointment.is_squeeze_in && (
                                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                                  Encaixe
                                                </Badge>
                                              )}
                                            </div>
                                            <p
                                              className={cn(
                                                "font-semibold truncate",
                                                userProfile.type === "professional" &&
                                                  "hover:underline cursor-pointer text-primary",
                                              )}
                                              onClick={(e) => handlePatientNameClick(e, appointment.patient_id)}
                                            >
                                              {appointment.patient?.full_name || "Paciente não identificado"}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                              {appointment.treatment?.treatment_name || "Tratamento não identificado"}
                                            </p>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (appointment.patient?.contact_phone) {
                                                    const phone = appointment.patient.contact_phone.replace(/\D/g, "");
                                                    const message = encodeURIComponent(
                                                      `Olá ${appointment.patient.full_name}, este é um lembrete do seu agendamento no dia ${formatUTCDate(appointment.appointment_start_time, "dd/MM/yyyy")} às ${formatUTCTime(appointment.appointment_start_time)} para ${appointment.treatment?.treatment_name || "consulta"}. Aguardamos você!`
                                                    );
                                                    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
                                                  }
                                                }}
                                                disabled={!appointment.patient?.contact_phone}
                                              >
                                                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                </svg>
                                                Enviar Lembrete
                                              </DropdownMenuItem>
                                              {appointment.last_reminder_sent_at && (
                                                <div className="px-2 py-1 text-xs text-muted-foreground">
                                                  Último lembrete: {formatDistanceToNow(new Date(appointment.last_reminder_sent_at), { addSuffix: false, locale: ptBR })}
                                                </div>
                                              )}
                                              <DropdownMenuSeparator />
                                              <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStatusChange(appointment.id, "Scheduled");
                                                    }}
                                                  >
                                                    Agendado
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStatusChange(appointment.id, "Confirmed");
                                                    }}
                                                  >
                                                    Confirmado
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStatusChange(appointment.id, "Patient Arrived");
                                                    }}
                                                    className="text-green-600 dark:text-green-400"
                                                  >
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Paciente Chegou
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStatusChange(appointment.id, "Completed");
                                                    }}
                                                  >
                                                    Concluído
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleStatusChange(appointment.id, "No-Show");
                                                    }}
                                                  >
                                                    Faltou
                                                  </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                              </DropdownMenuSub>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCancelDialogOpen(appointment.id);
                                                }}
                                                className="text-destructive focus:text-destructive"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Cancelar Agendamento
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
<AppointmentReminderButton 
                                          appointmentId={appointment.id}
                                          patientPhone={appointment.patient?.contact_phone || ""}
                                          patientName={appointment.patient?.full_name || ""}
                                          appointmentDate={appointment.appointment_start_time}
                                          treatmentName={appointment.treatment?.treatment_name || ""}
                                        />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const gap = item.data;
                                    return (
                                      <div
                                        key={`gap-${idx}`}
                                        onClick={() =>
                                          handleEmptySlotClick(
                                            {
                                              id: gap.professionalId,
                                              full_name: gap.professionalName,
                                            },
                                            currentDay,
                                            format(gap.start, "HH:mm"),
                                          )
                                        }
                                        className="border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-3 rounded-md cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                                      >
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Clock className="h-4 w-4" />
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">Horário Vago</div>
                                            <div className="text-xs">
                                              {format(gap.start, "HH:mm")} - {format(gap.end, "HH:mm")}
                                            </div>
                                            <div className="text-xs opacity-70">
                                              {Math.floor(gap.duration)} min disponíveis
                                            </div>
                                          </div>
                                          <Plus className="h-4 w-4" />
                                        </div>
                                      </div>
                                    );
                                  }
                                });
                              })()}

                              {/* Add appointment button */}
                              <Button
                                variant="outline"
                                className="w-full mt-3"
                                onClick={() => handleEmptySlotClick(professional, currentDay, "09:00")}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Agendamento
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                  </div>

                  {/* Desktop: Grid view for full week */}
                  <div className="hidden md:block overflow-x-hidden w-full max-w-full">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      <div className="font-semibold text-sm text-muted-foreground p-2">Profissional</div>
                      {weekDays.map((day) => {
                        const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                        return (
                          <div
                            key={day.toISOString()}
                            ref={isToday ? todayColumnRef : null}
                            className={cn(
                              "font-semibold text-sm text-center p-2 rounded-t-md transition-all",
                              isToday && "bg-primary/10 ring-2 ring-primary/30",
                              highlightToday && isToday && "animate-in fade-in duration-500",
                            )}
                          >
                            <div className={cn(isToday && "text-primary font-bold")}>
                              {format(day, "EEE", { locale: ptBR })}
                            </div>
                            <div
                              className={cn(
                                "text-xs",
                                isToday ? "text-primary font-semibold" : "text-muted-foreground",
                              )}
                            >
                              {format(day, "dd/MM")}
                              {isToday && " (Hoje)"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calendar Body */}
                    {(() => {
                      // Apply professional filter
                      const visibleProfessionals =
                        selectedProfessional === "all"
                          ? professionals
                          : professionals.filter((p) => p.id === selectedProfessional);

                      return visibleProfessionals.length > 0 ? (
                        <div>
                          {visibleProfessionals.map((professional) => (
                            <div
                              key={professional.id}
                              className="grid grid-cols-7 gap-2 mb-4 border-b border-border/30 pb-4"
                            >
                              <div className="font-medium p-2 text-sm">{professional.full_name}</div>
                              {weekDays.map((day) => {
                                const dayKey = format(day, "yyyy-MM-dd");
                                const dayAppointments =
                                  appointmentsByProfessional[professional.full_name]?.[dayKey] || [];
                                
                                const availableSlots = calculateAvailableSlots(
                                  filteredAppointments,
                                  day,
                                  professional.id,
                                  professional.full_name,
                                );
                                
                                const allItems: Array<{
                                  type: "appointment" | "gap";
                                  data: any;
                                }> = [
                                  ...dayAppointments.map((apt) => ({
                                    type: "appointment" as const,
                                    data: apt,
                                  })),
                                  ...availableSlots.map((slot) => ({
                                    type: "gap" as const,
                                    data: slot,
                                  })),
                                ].sort((a, b) => {
                                  const getTime = (item: typeof allItems[0]) => {
                                    if (item.type === "appointment") return getUTCAsLocal(item.data.appointment_start_time).getTime();
                                    return item.data.start.getTime();
                                  };
                                  return getTime(a) - getTime(b);
                                });
                                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                                return (
                                  <div
                                    key={dayKey}
                                    className={cn(
                                      "min-h-[120px] p-1 border rounded-md transition-colors space-y-1",
                                      isToday
                                        ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                                        : "border-border/20 bg-muted/20 hover:bg-muted/40",
                                    )}
                                  >
                                    {allItems.map((item, idx) => {
                                      if (item.type === "appointment") {
                                        const appointment = item.data as Appointment;
                                        return (
                                          <div
                                            key={appointment.id}
                                            onClick={() => handleAppointmentClick(appointment)}
                                            className={cn(
                                              "p-2 rounded-md text-xs cursor-pointer transition-colors relative group",
                                              appointment.is_squeeze_in
                                                ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-dashed border-yellow-500 text-foreground hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90",
                                            )}
                                          >
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                              <div className="flex items-center gap-1 flex-wrap">
                                                <div className="font-medium whitespace-nowrap">
                                                  {formatUTCTime(appointment.appointment_start_time)} -{" "}
                                                  {formatUTCTime(appointment.appointment_end_time)}
                                                </div>
                                                <Badge
                                                  variant={getStatusBadgeVariant(appointment.status)}
                                                  className="text-[10px] h-4 px-1"
                                                >
                                                  {getStatusLabel(appointment.status)}
                                                </Badge>
                                                {appointment.is_squeeze_in && (
                                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-500 bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                                    Encaixe
                                                  </Badge>
                                                )}
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                      "h-6 w-6 p-0",
                                                      appointment.is_squeeze_in
                                                        ? "text-foreground hover:bg-accent"
                                                        : "text-primary-foreground hover:bg-primary-foreground/20",
                                                    )}
                                                  >
                                                    <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (appointment.patient?.contact_phone) {
                                                        const phone = appointment.patient.contact_phone.replace(/\D/g, "");
                                                        const message = encodeURIComponent(
                                                          `Olá ${appointment.patient.full_name}, este é um lembrete do seu agendamento no dia ${formatUTCDate(appointment.appointment_start_time, "dd/MM/yyyy")} às ${formatUTCTime(appointment.appointment_start_time)} para ${appointment.treatment?.treatment_name || "consulta"}. Aguardamos você!`
                                                        );
                                                        window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
                                                      }
                                                    }}
                                                    disabled={!appointment.patient?.contact_phone}
                                                  >
                                                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                    </svg>
                                                    Enviar Lembrete
                                                  </DropdownMenuItem>
                                                  {appointment.last_reminder_sent_at && (
                                                    <div className="px-2 py-1 text-xs text-muted-foreground">
                                                      Último lembrete: {formatDistanceToNow(new Date(appointment.last_reminder_sent_at), { addSuffix: false, locale: ptBR })}
                                                    </div>
                                                  )}
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(appointment.id, "Scheduled");
                                                        }}
                                                      >
                                                        Agendado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(appointment.id, "Confirmed");
                                                        }}
                                                      >
                                                        Confirmado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(appointment.id, "Patient Arrived");
                                                        }}
                                                        className="text-green-600 dark:text-green-400"
                                                      >
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Paciente Chegou
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(appointment.id, "Completed");
                                                        }}
                                                      >
                                                        Concluído
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStatusChange(appointment.id, "No-Show");
                                                        }}
                                                      >
                                                        Faltou
                                                      </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                  </DropdownMenuSub>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCancelDialogOpen(appointment.id);
                                                    }}
                                                    className="text-destructive focus:text-destructive"
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Cancelar Agendamento
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <div className="truncate flex-1 min-w-0">
                                                <div
                                                  className={cn(
                                                    "font-semibold truncate",
                                                    userProfile.type === "professional" && "hover:underline cursor-pointer",
                                                  )}
                                                  onClick={(e) => handlePatientNameClick(e, appointment.patient_id)}
                                                >
                                                  {appointment.patient?.full_name || "Paciente não identificado"}
                                                </div>
                                                <div
                                                  className={cn(
                                                    "truncate",
                                                    appointment.is_squeeze_in
                                                      ? "text-muted-foreground"
                                                      : "text-primary-foreground/80",
                                                  )}
                                                >
                                                  {appointment.treatment?.treatment_name ||
                                                    "Tratamento não identificado"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        const gap = item.data;
                                        return (
                                          <div
                                            key={`gap-${idx}`}
                                            onClick={() =>
                                              handleEmptySlotClick(professional, day, format(gap.start, "HH:mm"))
                                            }
                                            className="border border-dashed border-muted-foreground/30 bg-muted/30 p-1 rounded text-xs text-center text-muted-foreground cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                                          >
                                            <div className="font-medium">Vago</div>
                                            <div>
                                              {format(gap.start, "HH:mm")} - {format(gap.end, "HH:mm")}
                                            </div>
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Nenhum profissional encontrado</h3>
                          <p className="text-muted-foreground">Não há profissionais disponíveis para esta seleção.</p>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        trigger={<div />}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialValues={modalInitialValues}
        onSuccess={() => {
          setModalOpen(false);
          setModalInitialValues({});
        }}
      />

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
            <AlertDialogAction
              onClick={() => handleCancelAppointment(appointmentToCancel)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              Tem certeza que deseja alterar o status deste agendamento para "
              {statusChangeData ? getStatusLabel(statusChangeData.newStatus) : ""}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusChangeData(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                statusChangeData && updateAppointmentStatus(statusChangeData.appointmentId, statusChangeData.newStatus)
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Patient Modal (Receptionists only) */}
      <EditPatientModal
        patientId={selectedPatientId}
        open={editPatientModalOpen}
        onOpenChange={setEditPatientModalOpen}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          toast({
            title: "Paciente atualizado",
            description: "As informações foram salvas com sucesso.",
          });
        }}
      />
    </div>
  );
}
