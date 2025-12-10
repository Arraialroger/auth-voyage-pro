import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, ArrowLeft, Search, Eye, MessageCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import { validateCPF, validatePhone, formatCPF, formatPhone, formatCPFMask, suggestCorrectCPF, cleanPhone, cleanCPF } from '@/lib/validators';
import { useUserProfile } from '@/hooks/useUserProfile';
import { EditPatientModal } from '@/components/EditPatientModal';

interface Patient {
  id: string;
  full_name: string;
  contact_phone: string;
  cpf: string | null;
  birth_date: string | null;
  medical_history_notes: string | null;
  created_at: string;
}

export default function ManagePatients() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const userProfile = useUserProfile();

  useEffect(() => {
    if (!userProfile.loading && userProfile.type !== 'receptionist') {
      navigate('/agenda', { replace: true });
    }
  }, [userProfile, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    contact_phone: '',
    cpf: '',
    birth_date: '',
    medical_history_notes: ''
  });
  const [cpfValidationError, setCpfValidationError] = useState<string>('');
  const [cpfSuggestion, setCpfSuggestion] = useState<string>('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingCPF, setIsCheckingCPF] = useState(false);

  const [cpfDuplicateError, setCpfDuplicateError] = useState<{
    exists: boolean;
    patient?: { full_name: string; created_at: string; id: string };
  } | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Patient[];
    }
  });

  const formatWhatsAppLink = (phone: string, message?: string) => {
    if (!phone) return '#';
    const cleanedPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    if (message) {
      const encodedMessage = encodeURIComponent(message);
      return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
    }
    return `https://wa.me/${phoneWithCountry}`;
  };

  const filteredPatients = patients?.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.contact_phone.includes(searchTerm)
  ) || [];

  const handlePhoneBlur = async (phone: string) => {
    if (!phone || !validatePhone(phone)) return;

    setIsCheckingPhone(true);
    try {
      const cleanedPhone = cleanPhone(phone);
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('contact_phone', cleanedPhone)
        .maybeSingle();

      if (data) {
        toast({
          title: "⚠️ Telefone compartilhado",
          description: `Este número também pertence a: ${data.full_name}`,
          variant: "default",
          duration: 5000
        });
      }
    } catch (error) {
      logger.error('Erro ao verificar telefone:', error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleCPFBlur = async (cpf: string) => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      setCpfDuplicateError(null);
      return;
    }

    setIsCheckingCPF(true);
    try {
      const cleanedCPF = cleanCPF(cpf);
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('cpf', cleanedCPF)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCpfDuplicateError({ exists: true, patient: data });
      } else {
        setCpfDuplicateError(null);
      }
    } catch (error) {
      logger.error('Erro ao verificar CPF:', error);
      setCpfDuplicateError(null);
    } finally {
      setIsCheckingCPF(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!formData.full_name || !formData.contact_phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!validatePhone(formData.contact_phone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD (mínimo 10 dígitos).",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    if (cpfDuplicateError?.exists) {
      toast({
        title: "CPF já cadastrado",
        description: `Este CPF pertence a: ${cpfDuplicateError.patient?.full_name}. Verifique os dados ou edite o paciente existente.`,
        variant: "destructive",
        duration: 8000
      });
      return;
    }

    if (formData.cpf && !validateCPF(formData.cpf)) {
      const suggestion = suggestCorrectCPF(formData.cpf);
      toast({
        title: "CPF inválido",
        description: suggestion
          ? `O CPF digitado é inválido. Você quis dizer ${suggestion}?`
          : "Digite um CPF válido no formato XXX.XXX.XXX-XX.",
        variant: "destructive",
        duration: 5000
      });
      setCpfValidationError(suggestion
        ? `CPF inválido. Você quis dizer ${suggestion}?`
        : "CPF inválido");
      setCpfSuggestion(suggestion || '');
      return;
    }

    try {
      const { error } = await supabase.from('patients').insert([{
        full_name: formData.full_name,
        contact_phone: cleanPhone(formData.contact_phone),
        cpf: formData.cpf ? cleanCPF(formData.cpf) : null,
        birth_date: formData.birth_date || null,
        medical_history_notes: formData.medical_history_notes || null
      }]);

      if (error) throw error;

      toast({
        title: "Paciente criado com sucesso",
        description: `${formData.full_name} foi adicionado ao sistema.`
      });

      setFormData({
        full_name: '',
        contact_phone: '',
        cpf: '',
        birth_date: '',
        medical_history_notes: ''
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error: any) {
      logger.error('Erro ao criar paciente:', error);

      if (error?.code === '23505') {
        const isDuplicatePhone = error.message?.includes('patients_contact_phone_key');
        const isDuplicateCPF = error.message?.includes('patients_cpf_key');

        if (isDuplicatePhone) {
          const cleanedPhone = cleanPhone(formData.contact_phone);
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('contact_phone', cleanedPhone)
            .maybeSingle();

          toast({
            title: "Telefone já cadastrado",
            description: existingPatient
              ? `Este telefone já está cadastrado para: ${existingPatient.full_name} (desde ${new Date(existingPatient.created_at).toLocaleDateString('pt-BR')})`
              : "Este telefone já está cadastrado no sistema.",
            variant: "destructive",
            duration: 10000
          });
          return;
        }

        if (isDuplicateCPF) {
          const cleanedCPF = formData.cpf ? cleanCPF(formData.cpf) : '';
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('cpf', cleanedCPF)
            .maybeSingle();

          toast({
            title: "CPF já cadastrado",
            description: existingPatient
              ? `Este CPF já está cadastrado para: ${existingPatient.full_name} (desde ${new Date(existingPatient.created_at).toLocaleDateString('pt-BR')})`
              : "Este CPF já está cadastrado no sistema.",
            variant: "destructive",
            duration: 10000
          });
          return;
        }
      }

      toast({
        title: "Erro ao criar paciente",
        description: "Ocorreu um erro ao salvar os dados.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Paciente excluído",
        description: "O paciente foi removido do sistema."
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      logger.error('Erro ao excluir paciente:', error);
      toast({
        title: "Erro ao excluir paciente",
        description: "Não foi possível remover o paciente. Verifique se não há agendamentos vinculados.",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (patientId: string) => {
    setSelectedPatientId(patientId);
    setEditPatientModalOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      full_name: '',
      contact_phone: '',
      cpf: '',
      birth_date: '',
      medical_history_notes: ''
    });
    setCpfDuplicateError(null);
    setCpfValidationError('');
    setCpfSuggestion('');
    setIsCreateDialogOpen(true);
  };

  // Auto-open edit modal when coming from Agenda with patientId
  useEffect(() => {
    if (patientIdFromUrl && patients) {
      const patient = patients.find(p => p.id === patientIdFromUrl);
      if (patient) {
        openEditModal(patient.id);
      }
    }
  }, [patientIdFromUrl, patients]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gerenciar Pacientes
            </h1>
          </div>

          <Button variant="gradient" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Create Patient Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Paciente</DialogTitle>
                <DialogDescription>
                  Adicione as informações do novo paciente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_phone">Telefone *</Label>
                    <div className="relative">
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({ ...formData, contact_phone: formatted });
                        }}
                        onBlur={(e) => handlePhoneBlur(e.target.value)}
                        placeholder="(00) 00000-0000"
                        disabled={isCheckingPhone}
                      />
                      {isCheckingPhone && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={e => {
                          const masked = formatCPFMask(e.target.value);
                          setFormData({ ...formData, cpf: masked });
                          setCpfDuplicateError(null);
                          setCpfValidationError('');
                          setCpfSuggestion('');
                        }}
                        onBlur={async (e) => {
                          const cpfValue = e.target.value;
                          if (cpfValue && !validateCPF(cpfValue)) {
                            const suggestion = suggestCorrectCPF(cpfValue);
                            setCpfValidationError(suggestion
                              ? `CPF inválido. Você quis dizer ${suggestion}?`
                              : "CPF inválido");
                            setCpfSuggestion(suggestion || '');
                          } else {
                            setCpfValidationError('');
                            setCpfSuggestion('');
                            await handleCPFBlur(cpfValue);
                          }
                        }}
                        placeholder="000.000.000-00"
                        error={!!cpfValidationError || !!cpfDuplicateError?.exists}
                        errorMessage={cpfValidationError || (cpfDuplicateError?.exists ? `⚠️ CPF já cadastrado para: ${cpfDuplicateError.patient?.full_name}` : undefined)}
                        maxLength={14}
                        disabled={isCheckingCPF}
                      />
                      {isCheckingCPF && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </div>
                    {cpfSuggestion && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0 text-xs text-primary"
                        onClick={() => {
                          setFormData({ ...formData, cpf: cpfSuggestion });
                          setCpfValidationError('');
                          setCpfSuggestion('');
                        }}
                      >
                        ✓ Aplicar sugestão: {cpfSuggestion}
                      </Button>
                    )}
                    {cpfDuplicateError?.exists && cpfDuplicateError.patient && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          openEditModal(cpfDuplicateError.patient!.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Paciente Existente
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="medical_history_notes">Histórico Médico</Label>
                  <Textarea
                    id="medical_history_notes"
                    value={formData.medical_history_notes}
                    onChange={e => setFormData({ ...formData, medical_history_notes: e.target.value })}
                    placeholder="Informações relevantes do histórico médico..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePatient} disabled={!formData.full_name || !formData.contact_phone}>
                  Criar Paciente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Patients List */}
          {isLoading ? (
            <div className="border rounded-lg p-8 space-y-4">
              <div className="h-10 w-full bg-muted/60 rounded animate-pulse" />
              {[1, 2, 3, 4, 5].map(index => (
                <div key={index} className="h-16 w-full bg-muted/60 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">Nascimento</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF</TableHead>
                      <TableHead className="hidden xl:table-cell">Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map(patient => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.full_name}</TableCell>
                        <TableCell>
                          <a
                            href={formatWhatsAppLink(patient.contact_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            {formatPhone(patient.contact_phone)}
                          </a>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.birth_date
                            ? (() => {
                                try {
                                  const date = new Date(patient.birth_date);
                                  return !isNaN(date.getTime())
                                    ? format(date, 'dd/MM/yyyy', { locale: ptBR })
                                    : '-';
                                } catch {
                                  return '-';
                                }
                              })()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {patient.cpf ? formatCPF(patient.cpf) : '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground">
                          {(() => {
                            try {
                              const date = new Date(patient.created_at);
                              return !isNaN(date.getTime())
                                ? format(date, 'dd/MM/yyyy', { locale: ptBR })
                                : '-';
                            } catch {
                              return '-';
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(patient.id)}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir {patient.full_name}? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePatient(patient.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
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
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Patient Modal - Reutilizando componente centralizado */}
      <EditPatientModal
        patientId={selectedPatientId}
        open={editPatientModalOpen}
        onOpenChange={setEditPatientModalOpen}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
      />
    </div>
  );
}
