import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Settings, Calendar, Trash2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { NewAppointmentModal } from '@/components/NewAppointmentModal';

interface WaitingListEntry {
  id: string;
  patient_id: string;
  professional_id: string;
  treatment_id: string | null;
  notes: string | null;
  created_at: string;
  patients: {
    full_name: string;
    contact_phone: string;
  };
  professionals: {
    full_name: string;
  };
  treatments?: {
    treatment_name: string;
  };
}


export default function ManageWaitingList() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { type: userType, loading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const [schedulingEntry, setSchedulingEntry] = useState<WaitingListEntry | null>(null);

  useEffect(() => {
    if (!profileLoading && userType !== 'receptionist') {
      navigate('/agenda', { replace: true });
    }
  }, [userType, profileLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    // Remove caracteres especiais
    const cleanPhone = phone.replace(/\D/g, '');
    // Adiciona código do país se não tiver
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const { data: waitingList = [], isLoading } = useQuery({
    queryKey: ['waiting-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waiting_list')
        .select(`
          id,
          patient_id,
          professional_id,
          treatment_id,
          notes,
          created_at,
          patients (full_name, contact_phone),
          professionals (full_name),
          treatments (treatment_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const handleRemoveFromWaitingList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waiting_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Removido da lista',
        description: 'Paciente removido da lista de espera com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
    } catch (error) {
      logger.error('Erro ao remover da lista de espera:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover da lista de espera. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleAppointment = (entry: WaitingListEntry) => {
    setSchedulingEntry(entry);
  };

  const handleAppointmentSuccess = () => {
    // Remove from waiting list after successful scheduling
    if (schedulingEntry) {
      handleRemoveFromWaitingList(schedulingEntry.id);
    }
    setSchedulingEntry(null);
  };

  if (profileLoading) {
    return <div>Carregando...</div>;
  }

  if (userType !== 'receptionist' && userType !== 'professional') {
    return <div>Acesso negado</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Lista de Espera
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin')} className="border-border/50 text-xs sm:text-sm px-2 sm:px-4">
              <span className="sm:hidden">Voltar</span>
              <span className="hidden sm:inline">Voltar à Administração</span>
            </Button>
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="group border-border/50 hover:border-destructive hover:text-destructive text-xs sm:text-sm px-2 sm:px-4">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              Lista de Espera
            </h2>
            <p className="text-muted-foreground text-lg">
              Gerencie pacientes aguardando agendamento
            </p>
          </div>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pacientes em Espera
              </CardTitle>
              <CardDescription>
                Lista de pacientes aguardando disponibilidade para agendamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : waitingList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum paciente na lista de espera
                </div>
              ) : (
                <Table>
                  <TableHeader>
          <TableRow>
            <TableHead>Paciente</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Profissional Desejado</TableHead>
            <TableHead>Tratamento</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Data de Entrada</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingList.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.patients.full_name}
                        </TableCell>
                        <TableCell>
                          {entry.patients.contact_phone ? (
                            <a
                              href={formatWhatsAppLink(entry.patients.contact_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group"
                            >
                              <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              <span className="underline-offset-4 group-hover:underline">
                                {entry.patients.contact_phone}
                              </span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.professionals.full_name}
                        </TableCell>
                  <TableCell>
                    {entry.treatments?.treatment_name || '-'}
                  </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.notes || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleScheduleAppointment(entry)}
                              className="gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              Agendar
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {entry.patients.full_name} da lista de espera?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveFromWaitingList(entry.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Schedule Appointment Modal */}
        {schedulingEntry && (
          <NewAppointmentModal
            trigger={<div />}
            open={!!schedulingEntry}
            onOpenChange={(open) => !open && setSchedulingEntry(null)}
            onSuccess={handleAppointmentSuccess}
            initialValues={{
              patient_id: schedulingEntry.patient_id,
              professional_id: schedulingEntry.professional_id,
              treatment_id: schedulingEntry.treatment_id || undefined,
            }}
          />
        )}
    </div>
  );
}