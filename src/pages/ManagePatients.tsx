import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  full_name: string;
  contact_phone: string;
  birth_date: string | null;
  medical_history_notes: string | null;
  created_at: string;
}

export default function ManagePatients() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    contact_phone: '',
    birth_date: '',
    medical_history_notes: ''
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as Patient[];
    }
  });

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.contact_phone.includes(searchTerm)
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      contact_phone: '',
      birth_date: '',
      medical_history_notes: ''
    });
  };

  const handleCreatePatient = async () => {
    try {
      const { error } = await supabase
        .from('patients')
        .insert([{
          full_name: formData.full_name,
          contact_phone: formData.contact_phone,
          birth_date: formData.birth_date || null,
          medical_history_notes: formData.medical_history_notes || null
        }]);

      if (error) throw error;

      toast({
        title: 'Paciente criado',
        description: 'O novo paciente foi criado com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar paciente. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPatient = async () => {
    if (!editingPatient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          full_name: formData.full_name,
          contact_phone: formData.contact_phone,
          birth_date: formData.birth_date || null,
          medical_history_notes: formData.medical_history_notes || null
        })
        .eq('id', editingPatient.id);

      if (error) throw error;

      toast({
        title: 'Paciente atualizado',
        description: 'Os dados do paciente foram atualizados com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsEditDialogOpen(false);
      setEditingPatient(null);
      resetForm();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar paciente. Tente novamente.',
        variant: 'destructive',
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
        title: 'Paciente excluído',
        description: 'O paciente foi excluído com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir paciente. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name,
      contact_phone: patient.contact_phone,
      birth_date: patient.birth_date || '',
      medical_history_notes: patient.medical_history_notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gerenciar Pacientes
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin')} className="border-border/50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout} className="group border-border/50 hover:border-destructive hover:text-destructive">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar pacientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-80"
              />
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Paciente</DialogTitle>
                  <DialogDescription>
                    Preencha as informações do novo paciente abaixo.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="medical_history">Histórico Médico</Label>
                    <Textarea
                      id="medical_history"
                      value={formData.medical_history_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, medical_history_notes: e.target.value }))}
                      placeholder="Informações relevantes do histórico médico"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreatePatient}
                    disabled={!formData.full_name || !formData.contact_phone}
                  >
                    Criar Paciente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Patients Grid */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="mt-2 text-muted-foreground">Carregando pacientes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <Card key={patient.id} className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">
                      {patient.full_name}
                    </CardTitle>
                    <CardDescription>
                      {patient.contact_phone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {patient.birth_date && (
                      <div className="text-sm">
                        <span className="font-medium">Nascimento: </span>
                        {(() => {
                          try {
                            const date = new Date(patient.birth_date);
                            return !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                          } catch {
                            return 'Data inválida';
                          }
                        })()}
                      </div>
                    )}
                    {patient.medical_history_notes && (
                      <div className="text-sm">
                        <span className="font-medium">Histórico: </span>
                        <span className="text-muted-foreground line-clamp-2">
                          {patient.medical_history_notes}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Cadastrado em {(() => {
                        try {
                          const date = new Date(patient.created_at);
                          return !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                        } catch {
                          return 'Data inválida';
                        }
                      })()}
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(patient)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Paciente</DialogTitle>
                            <DialogDescription>
                              Atualize as informações do paciente abaixo.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div>
                              <Label htmlFor="edit_name">Nome Completo *</Label>
                              <Input
                                id="edit_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Digite o nome completo"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_phone">Telefone *</Label>
                              <Input
                                id="edit_phone"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                placeholder="(11) 99999-9999"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                              <Input
                                id="edit_birth_date"
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit_medical_history">Histórico Médico</Label>
                              <Textarea
                                id="edit_medical_history"
                                value={formData.medical_history_notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, medical_history_notes: e.target.value }))}
                                placeholder="Informações relevantes do histórico médico"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleEditPatient}
                              disabled={!formData.full_name || !formData.contact_phone}
                            >
                              Salvar Alterações
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o paciente <strong>{patient.full_name}</strong>? 
                              Esta ação não pode ser desfeita.
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredPatients.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca.'
                  : 'Clique no botão "Novo Paciente" para cadastrar o primeiro paciente.'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}