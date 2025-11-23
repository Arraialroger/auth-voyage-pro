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
  Menu,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  Ban,
  Check,
  ChevronsUpDown,
  Bell,
  Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { startOfWeek, endOfWeek, format, addDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef } from "react";
import { NewAppointmentModal } from "@/components/NewAppointmentModal";
import { EditAppointmentModal } from "@/components/EditAppointmentModal";
import { AddToWaitingListModal } from "@/components/AddToWaitingListModal";
import { AppointmentReminderButton } from "@/components/AppointmentReminderButton";
import { EditPatientModal } from "@/components/EditPatientModal";

import { BlockTimeModal } from "@/components/BlockTimeModal";
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

import { BLOCK_PATIENT_ID, BLOCK_TREATMENT_ID } from "@/lib/constants";
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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTreatment, setFilterTreatment] = useState<string>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
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
  const [blockTimeModalOpen, setBlockTimeModalOpen] = useState(false);
  const [blockTimeInitialData, setBlockTimeInitialData] = useState<{
    professional_id?: string;
    date?: Date;
    editingBlockId?: string;
  }>({});
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [quickSearch, setQuickSearch] = useState<string>("");
  const [globalPatientSearch, setGlobalPatientSearch] = useState<string>("");
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const [highlightToday, setHighlightToday] = useState(false);

  // Configuração mínima de intervalo para considerar slot disponível
  const MIN_GAP_MINUTES = 30;

  // Helper para identificar bloqueios
  const isBlockedTime = (appointment: Appointment): boolean => {
    return appointment.patient_id === BLOCK_PATIENT_ID;
  };

  // Função para deletar bloqueio
  const handleDeleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", blockId);

      if (error) throw error;

      toast({
        title: "Bloqueio removido",
        description: "O horário foi desbloqueado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } catch (error) {
      logger.error("Erro ao deletar bloqueio:", error);
      toast({
        title: "Erro ao remover bloqueio",
        description: "Não foi possível desbloquear o horário.",
        variant: "destructive",
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
  // Fetch treatments for filter
  const { data: allTreatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("treatments").select("id, treatment_name").order("treatment_name");
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error("Erro ao buscar tratamentos:", error);
        return [];
      }
    },
  });

  // Fetch patients for filter
  const { data: allPatients = [] } = useQuery({
    queryKey: ["patients-for-filter"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("patients").select("id, full_name").order("full_name");
        if (error) throw error;
        return data || [];
      } catch (error) {
        logger.error("Erro ao buscar pacientes:", error);
        return [];
      }
    },
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
  const handleEditAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setEditModalOpen(true);
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
    const dayAppointments = appointments
      .filter((apt) => {
        const aptDate = format(new Date(apt.appointment_start_time), "yyyy-MM-dd");
        return aptDate === dayKey && apt.professional?.id === professionalId;
      })
      .sort((a, b) => new Date(a.appointment_start_time).getTime() - new Date(b.appointment_start_time).getTime());

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
              professionalName,
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
    setFilterPatient(patient.id);
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

  // Apply filters to appointments
  const filteredAppointments = appointments.filter((apt) => {
    // Quick search filter (busca rápida por nome, telefone ou tratamento)
    if (quickSearch.trim()) {
      const searchLower = quickSearch.toLowerCase().trim();
      const patientName = apt.patient?.full_name?.toLowerCase() || "";
      const patientPhone = apt.patient?.contact_phone || "";
      const treatmentName = apt.treatment?.treatment_name?.toLowerCase() || "";

      const matchesSearch =
        patientName.includes(searchLower) || patientPhone.includes(searchLower) || treatmentName.includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Filter by status
    if (filterStatus !== "all" && apt.status !== filterStatus) {
      return false;
    }

    // Filter by treatment
    if (filterTreatment !== "all" && apt.treatment?.id !== filterTreatment) {
      return false;
    }

    // Filter by patient name
    if (filterPatient !== "all" && !apt.patient?.full_name.toLowerCase().includes(filterPatient.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Count active filters
  const activeFiltersCount = [
    filterStatus !== "all",
    filterTreatment !== "all",
    filterPatient !== "all",
    selectedProfessional !== "all" && userProfile.type === "receptionist",
  ].filter(Boolean).length;

  // Group appointments by professional and day
  const appointmentsByProfessional = filteredAppointments.reduce(
    (acc, apt) => {
      const professionalName = apt.professional?.full_name || "Profissional não identificado";
      if (!acc[professionalName]) {
        acc[professionalName] = {};
      }
      const dayKey = format(new Date(apt.appointment_start_time), "yyyy-MM-dd");
      if (!acc[professionalName][dayKey]) {
        acc[professionalName][dayKey] = [];
      }
      acc[professionalName][dayKey].push(apt);
      return acc;
    },
    {} as Record<string, Record<string, Appointment[]>>,
  );

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
              {/* Quick Search Section */}
              <div className="flex gap-3 flex-col sm:flex-row">
                {/* Busca Rápida de Agendamentos */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar agendamentos..."
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
                  />
                  {quickSearch && (
                    <button
                      onClick={() => setQuickSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Busca Global de Pacientes (Fase 2 - Apenas Profissionais) */}
                {userProfile.type === "professional" && (
                  <div className="relative flex-1 max-w-md">
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
                                <Button size="sm" onClick={() => navigate(`/patient/${patient.id}`)} className="gap-1">
                                  <Eye className="h-4 w-4" />
                                  Ver Página
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleScheduleForPatient(patient)}
                                  className="gap-1"
                                >
                                  <Calendar className="h-4 w-4" />
                                  Agendar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Mensagem quando não há resultados */}
                    {globalPatientSearch && globalSearchPatients.length === 0 && (
                      <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
                        <CardContent className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum paciente encontrado
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Filters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterTreatment("all");
                        setFilterPatient("all");
                        setSelectedProfessional("all");
                      }}
                      className="gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </Button>
                  )}
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
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
                          {allTreatments.map((treatment) => (
                            <SelectItem key={treatment.id} value={treatment.id}>
                              {treatment.treatment_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Patient Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Paciente</label>
                      <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={patientComboboxOpen}
                            className="w-full justify-between bg-background"
                          >
                            {filterPatient === "all"
                              ? "Todos os pacientes"
                              : allPatients.find((patient) => patient.full_name === filterPatient)?.full_name ||
                                "Todos os pacientes"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar paciente..." />
                            <CommandList>
                              <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="all"
                                  onSelect={() => {
                                    setFilterPatient("all");
                                    setPatientComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      filterPatient === "all" ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  Todos os pacientes
                                </CommandItem>
                                {allPatients.map((patient) => (
                                  <CommandItem
                                    key={patient.id}
                                    value={patient.full_name}
                                    onSelect={(currentValue) => {
                                      setFilterPatient(currentValue);
                                      setPatientComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        filterPatient === patient.full_name ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {patient.full_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

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
                  {userProfile.type === "receptionist" && (
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
                    {userProfile.type === "receptionist" && (
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
                              {dayAppointments.length > 0 ||
                              calculateAvailableSlots(
                                filteredAppointments,
                                currentDay,
                                professional.id,
                                professional.full_name,
                              ).length > 0 ? (
                                <>
                                  {(() => {
                                    const slots = calculateAvailableSlots(
                                      filteredAppointments,
                                      currentDay,
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
                                      ...slots.map((slot) => ({
                                        type: "gap" as const,
                                        data: slot,
                                      })),
                                    ].sort((a, b) => {
                                      const timeA =
                                        a.type === "appointment"
                                          ? new Date(a.data.appointment_start_time).getTime()
                                          : a.data.start.getTime();
                                      const timeB =
                                        b.type === "appointment"
                                          ? new Date(b.data.appointment_start_time).getTime()
                                          : b.data.start.getTime();
                                      return timeA - timeB;
                                    });
                                    return allItems.map((item, idx) => {
                                      if (item.type === "appointment") {
                                        const appointment = item.data;
                                        const isBlocked = isBlockedTime(appointment);

                                        if (isBlocked) {
                                          return (
                                            <div
                                              key={`apt-${appointment.id}`}
                                              className="relative group bg-destructive/20 border-2 border-destructive/50 hover:border-destructive/70 text-destructive-foreground p-3 rounded-md shadow-sm transition-colors cursor-pointer"
                                            >
                                              <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2">
                                                  <Ban className="h-4 w-4" />
                                                  <div className="font-medium text-sm">
                                                    {format(new Date(appointment.appointment_start_time), "HH:mm")} -{" "}
                                                    {format(new Date(appointment.appointment_end_time), "HH:mm")}
                                                  </div>
                                                </div>
                                                {userProfile.type === "receptionist" && (
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
                                                <div className="text-xs mt-1 opacity-80">{appointment.notes}</div>
                                              )}
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={`apt-${appointment.id}`}
                                            className={cn(
                                              "relative p-3 rounded-lg shadow-md border-2 group transition-all hover:shadow-lg",
                                              appointment.is_squeeze_in
                                                ? "bg-orange-50 dark:bg-orange-950/50 border-orange-400 dark:border-orange-600 text-foreground"
                                                : "bg-primary/95 dark:bg-primary border-primary-foreground/20 dark:border-primary text-primary-foreground",
                                            )}
                                          >
                                            {/* Indicador pulsante para "Patient Arrived" */}
                                            {appointment.status === "Patient Arrived" && (
                                              <div className="absolute -top-1 -right-1">
                                                <span className="relative flex h-3 w-3">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex justify-between items-start gap-2">
                                              <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => handleAppointmentClick(appointment)}
                                              >
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                  <div
                                                    className={cn(
                                                      "font-semibold text-sm",
                                                      appointment.is_squeeze_in
                                                        ? "text-foreground"
                                                        : "text-primary-foreground",
                                                    )}
                                                  >
                                                    {format(new Date(appointment.appointment_start_time), "HH:mm")} -{" "}
                                                    {format(new Date(appointment.appointment_end_time), "HH:mm")}
                                                  </div>
                                                  {appointment.is_squeeze_in && (
                                                    <Badge
                                                      variant="warning"
                                                      className="text-[10px] px-1.5 py-0 font-bold"
                                                    >
                                                      Encaixe
                                                    </Badge>
                                                  )}
                                                  <Badge
                                                    variant={getStatusBadgeVariant(appointment.status)}
                                                    className="text-[10px] px-1.5 py-0.5 whitespace-nowrap font-medium"
                                                  >
                                                    {getStatusLabel(appointment.status)}
                                                  </Badge>
                                                </div>
                                                <div
                                                  className={cn(
                                                    "text-base font-medium",
                                                    appointment.is_squeeze_in
                                                      ? "text-foreground"
                                                      : "text-primary-foreground",
                                                  )}
                                                >
                                                  {userProfile.type === "professional" ? (
                                                    <button
                                                      onClick={(e) => handlePatientNameClick(e, appointment.patient_id)}
                                                      className="hover:underline cursor-pointer text-left"
                                                    >
                                                      {appointment.patient?.full_name || "Paciente não identificado"}
                                                    </button>
                                                  ) : (
                                                    appointment.patient?.full_name || "Paciente não identificado"
                                                  )}
                                                </div>
                                                <div
                                                  className={cn(
                                                    "text-sm mt-1",
                                                    appointment.is_squeeze_in
                                                      ? "text-muted-foreground"
                                                      : "text-primary-foreground/75",
                                                  )}
                                                >
                                                  {appointment.treatment?.treatment_name ||
                                                    "Tratamento não identificado"}
                                                </div>
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
                                                    onClick={() => handleEditAppointment(appointment.id)}
                                                  >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar Agendamento
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Scheduled")}
                                                      >
                                                        Agendado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Confirmed")}
                                                      >
                                                        Confirmado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() =>
                                                          handleStatusChange(appointment.id, "Patient Arrived")
                                                        }
                                                        className="text-green-600 dark:text-green-400"
                                                      >
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Paciente Chegou
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Completed")}
                                                      >
                                                        Concluído
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "No-Show")}
                                                      >
                                                        Faltou
                                                      </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                  </DropdownMenuSub>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => handleCancelDialogOpen(appointment.id)}
                                                    className="text-destructive focus:text-destructive"
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Cancelar Agendamento
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
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
                                </>
                              ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Nenhum agendamento para este dia</p>
                                </div>
                              )}

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
                                  const timeA =
                                    a.type === "appointment"
                                      ? new Date(a.data.appointment_start_time).getTime()
                                      : a.data.start.getTime();
                                  const timeB =
                                    b.type === "appointment"
                                      ? new Date(b.data.appointment_start_time).getTime()
                                      : b.data.start.getTime();
                                  return timeA - timeB;
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
                                        const appointment = item.data;
                                        const isBlocked = isBlockedTime(appointment);

                                        if (isBlocked) {
                                          return (
                                            <div
                                              key={`apt-${appointment.id}`}
                                              className="relative group bg-destructive/20 border-2 border-destructive/50 hover:border-destructive/70 text-destructive-foreground p-2 rounded-md text-xs transition-colors cursor-pointer"
                                            >
                                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <div className="flex items-center gap-1">
                                                  <Ban className="h-3 w-3" />
                                                  <div className="font-medium">
                                                    {format(new Date(appointment.appointment_start_time), "HH:mm")} -{" "}
                                                    {format(new Date(appointment.appointment_end_time), "HH:mm")}
                                                  </div>
                                                </div>
                                                {userProfile.type === "receptionist" && (
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
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={`apt-${appointment.id}`}
                                            className={cn(
                                              "relative p-2 rounded-md text-xs shadow-sm group",
                                              appointment.is_squeeze_in
                                                ? "bg-orange-50 dark:bg-orange-950 border-2 border-orange-300 dark:border-orange-700 text-foreground"
                                                : "bg-primary text-primary-foreground",
                                            )}
                                          >
                                            {/* Indicador pulsante para "Patient Arrived" */}
                                            {appointment.status === "Patient Arrived" && (
                                              <div className="absolute -top-1 -right-1">
                                                <span className="relative flex h-2.5 w-2.5">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex justify-between items-start gap-1">
                                              <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => handleAppointmentClick(appointment)}
                                              >
                                                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                                  <div className="font-medium">
                                                    {format(new Date(appointment.appointment_start_time), "HH:mm")} -{" "}
                                                    {format(new Date(appointment.appointment_end_time), "HH:mm")}
                                                  </div>
                                                  {appointment.is_squeeze_in && (
                                                    <Badge variant="warning" className="text-[9px] px-1 py-0">
                                                      Encaixe
                                                    </Badge>
                                                  )}
                                                  <Badge
                                                    variant={getStatusBadgeVariant(appointment.status)}
                                                    className="text-[10px] px-1.5 whitespace-nowrap"
                                                  >
                                                    {getStatusLabel(appointment.status)}
                                                  </Badge>
                                                </div>
                                                <div className="truncate">
                                                  {userProfile.type === "professional" ? (
                                                    <button
                                                      onClick={(e) => handlePatientNameClick(e, appointment.patient_id)}
                                                      className="hover:underline cursor-pointer text-left"
                                                    >
                                                      {appointment.patient?.full_name || "Paciente não identificado"}
                                                    </button>
                                                  ) : (
                                                    appointment.patient?.full_name || "Paciente não identificado"
                                                  )}
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
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                      "h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                                      appointment.is_squeeze_in
                                                        ? "text-foreground hover:bg-accent"
                                                        : "text-primary-foreground hover:bg-primary-foreground/20",
                                                    )}
                                                  >
                                                    <MoreVertical className="h-3 w-3" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                  <DropdownMenuItem
                                                    onClick={() => handleEditAppointment(appointment.id)}
                                                  >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem asChild>
                                                    <div className="w-full">
                                                      <AppointmentReminderButton
                                                        appointmentId={appointment.id}
                                                        patientPhone={appointment.patient?.contact_phone || ""}
                                                        patientName={appointment.patient?.full_name || ""}
                                                        appointmentDate={appointment.appointment_start_time}
                                                        treatmentName={appointment.treatment?.treatment_name || ""}
                                                        lastReminderSent={appointment.last_reminder_sent_at}
                                                      />
                                                    </div>
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Scheduled")}
                                                      >
                                                        Agendado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() =>
                                                          handleStatusChange(appointment.id, "Pending Confirmation")
                                                        }
                                                      >
                                                        Aguardando Confirmação
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Confirmed")}
                                                      >
                                                        Confirmado
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() =>
                                                          handleStatusChange(appointment.id, "Patient Arrived")
                                                        }
                                                        className="text-green-600 dark:text-green-400"
                                                      >
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Paciente Chegou
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "Completed")}
                                                      >
                                                        Concluído
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                        onClick={() => handleStatusChange(appointment.id, "No-Show")}
                                                      >
                                                        Faltou
                                                      </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                  </DropdownMenuSub>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => handleCancelDialogOpen(appointment.id)}
                                                    className="text-destructive focus:text-destructive"
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Cancelar
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
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
                                                day,
                                                format(gap.start, "HH:mm"),
                                              )
                                            }
                                            className="border border-dashed border-muted-foreground/30 bg-muted/30 p-1 rounded cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/50 transition-all"
                                          >
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <Clock className="h-3 w-3" />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium truncate">Vago</div>
                                                <div className="text-[10px] truncate">
                                                  {format(gap.start, "HH:mm")}-{format(gap.end, "HH:mm")}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    })}

                                    {/* Empty slot click area */}
                                    {allItems.length === 0 && (
                                      <div
                                        onClick={() => handleEmptySlotClick(professional, day, "09:00")}
                                        className="h-full min-h-[100px] flex items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity bg-muted/40 hover:bg-muted/60 rounded border border-dashed border-muted-foreground/30"
                                      >
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
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

      {/* Edit Appointment Modal */}
      {selectedAppointmentId && (
        <EditAppointmentModal
          appointmentId={selectedAppointmentId}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={() => {
            setEditModalOpen(false);
            setSelectedAppointmentId("");
          }}
        />
      )}

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

      {/* Block Time Modal */}
      <BlockTimeModal
        open={blockTimeModalOpen}
        onOpenChange={setBlockTimeModalOpen}
        professionals={allProfessionals}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
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
