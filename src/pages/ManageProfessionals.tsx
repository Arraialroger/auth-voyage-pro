import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Edit, Trash2, Search, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Database } from '@/integrations/supabase/types';
import ProfessionalScheduleForm, { type DaySchedule } from '@/components/ProfessionalScheduleForm';

type Professional = Database['public']['Tables']['professionals']['Row'];
type ProfessionalInsert = Database['public']['Tables']['professionals']['Insert'];

// Schema de validação para criar profissional
const professionalCreateSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  specialization: z.enum(['Cirurgião-Dentista', 'Ortodontista']),
  email: z.string().min(1, 'Email é obrigatório.'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.')
});
type ProfessionalCreateData = z.infer<typeof professionalCreateSchema>;

// Schema de validação para editar profissional (sem email e password)
const professionalEditSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  specialization: z.enum(['Cirurgião-Dentista', 'Ortodontista'])
});
type ProfessionalEditData = z.infer<typeof professionalEditSchema>;
export default function ManageProfessionals() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [currentSchedules, setCurrentSchedules] = useState<DaySchedule[]>([]);
  
  // Form para criar profissional
  const createForm = useForm<ProfessionalCreateData>({
    resolver: zodResolver(professionalCreateSchema),
    defaultValues: {
      full_name: '',
      specialization: 'Cirurgião-Dentista',
      email: '',
      password: ''
    }
  });

  // Form para editar profissional
  const editForm = useForm<ProfessionalEditData>({
    resolver: zodResolver(professionalEditSchema),
    defaultValues: {
      full_name: '',
      specialization: 'Cirurgião-Dentista'
    }
  });
  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('professionals').select('*').order('full_name');
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os profissionais.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProfessionals();
  }, []);
  const handleCreate = async (data: ProfessionalCreateData) => {
    try {
      console.log('Criando profissional via Edge Function:', data.email);
      
      const { data: result, error } = await supabase.functions.invoke('create-professional', {
        body: {
          full_name: data.full_name,
          specialization: data.specialization,
          email: data.email,
          password: data.password,
        }
      });

      if (error) {
        console.error('Erro ao chamar Edge Function:', error);
        throw new Error(error.message || 'Erro ao criar profissional');
      }

      if (!result?.professional) {
        throw new Error('Resposta inválida da Edge Function');
      }

      console.log('Profissional criado:', result.professional.id);

      // Salvar horários de trabalho
      if (currentSchedules.length > 0) {
        console.log('Salvando horários...');
        await saveSchedules(result.professional.id, currentSchedules);
      }

      toast({
        title: 'Sucesso',
        description: 'Profissional criado com sucesso!'
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setCurrentSchedules([]);
      fetchProfessionals();
    } catch (error) {
      console.error('Erro completo:', error);
      toast({
        title: 'Erro ao criar profissional',
        description: error instanceof Error ? error.message : 'Não foi possível criar o profissional.',
        variant: 'destructive'
      });
    }
  };
  const handleEdit = async (data: ProfessionalEditData) => {
    if (!selectedProfessional) return;
    try {
      console.log('Atualizando profissional:', selectedProfessional.id);
      
      const {
        error
      } = await supabase.from('professionals').update({
        full_name: data.full_name,
        specialization: data.specialization
      }).eq('id', selectedProfessional.id);
      
      if (error) {
        console.error('Erro ao atualizar:', error);
        throw error;
      }

      console.log('Profissional atualizado');

      // Atualizar horários de trabalho
      if (currentSchedules.length > 0) {
        console.log('Salvando horários...');
        await saveSchedules(selectedProfessional.id, currentSchedules);
      }

      toast({
        title: 'Sucesso',
        description: 'Profissional atualizado com sucesso!'
      });
      setIsEditDialogOpen(false);
      setSelectedProfessional(null);
      editForm.reset();
      setCurrentSchedules([]);
      fetchProfessionals();
    } catch (error) {
      console.error('Erro completo:', error);
      toast({
        title: 'Erro ao atualizar profissional',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o profissional.',
        variant: 'destructive'
      });
    }
  };

  const saveSchedules = async (professionalId: string, schedules: DaySchedule[]) => {
    try {
      // Deletar horários antigos
      await supabase
        .from('professional_schedules')
        .delete()
        .eq('professional_id', professionalId);

      // Inserir novos horários
      const schedulesToInsert = schedules
        .filter(s => s.is_working && s.time_slots.length > 0)
        .flatMap(s => 
          s.time_slots.map(slot => ({
            professional_id: professionalId,
            day_of_week: s.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time
          }))
        );

      if (schedulesToInsert.length > 0) {
        const { error } = await supabase
          .from('professional_schedules')
          .insert(schedulesToInsert);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      throw error;
    }
  };
  const handleDelete = async (professional: Professional) => {
    try {
      // Importante: a lógica para deletar o usuário do Auth correspondente
      // precisaria ser implementada com uma Edge Function por segurança.
      // Por enquanto, deletaremos apenas o perfil.
      const {
        error
      } = await supabase.from('professionals').delete().eq('id', professional.id);
      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Profissional excluído com sucesso!'
      });
      fetchProfessionals();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o profissional.',
        variant: 'destructive'
      });
    }
  };
  const openEditDialog = (professional: Professional) => {
    setSelectedProfessional(professional);
    editForm.reset({
      full_name: professional.full_name,
      specialization: professional.specialization
    });
    setIsEditDialogOpen(true);
  };
  const filteredProfessionals = professionals.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.specialization.toLowerCase().includes(searchTerm.toLowerCase()));

  // CORREÇÃO 3: Cores das etiquetas alinhadas com as especializações corretas.
  const getSpecializationBadgeColor = (specialization: string) => {
    const colors = {
      'Cirurgião-Dentista': 'bg-blue-100 text-blue-800',
      'Ortodontista': 'bg-green-100 text-green-800'
    };
    return colors[specialization as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <Button variant="ghost" onClick={() => navigate('/admin')} className="p-2 lg:mr-2">
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
            <UserCheck className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <h1 className="text-lg lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {isMobile ? 'Profissionais' : 'Gerenciar Profissionais'}
            </h1>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-4 lg:py-8">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'}`}>
              <div>
                <CardTitle className="text-lg lg:text-xl">Profissionais Cadastrados</CardTitle>
                <CardDescription>Gerencie todos os profissionais do sistema</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Profissional</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Profissional</DialogTitle>
                    <DialogDescription>Preencha os dados do novo profissional</DialogDescription>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-6">
                      <Tabs defaultValue="dados" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                          <TabsTrigger value="horarios">Horários de Trabalho</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="dados" className="space-y-4 mt-4">
                          <FormField control={createForm.control} name="full_name" render={({
                          field
                        }) => <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField control={createForm.control} name="specialization" render={({
                          field
                        }) => <FormItem>
                              <FormLabel>Especialização</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Cirurgião-Dentista">Cirurgião-Dentista</SelectItem>
                                  <SelectItem value="Ortodontista">Ortodontista</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>} />
                          <FormField control={createForm.control} name="email" render={({
                          field
                        }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>} />
                          <FormField control={createForm.control} name="password" render={({
                          field
                        }) => <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
                        </TabsContent>
                        
                        <TabsContent value="horarios" className="mt-4">
                          <ProfessionalScheduleForm 
                            professionalId={null}
                            onScheduleChange={setCurrentSchedules}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      <DialogFooter>
                        <Button type="submit">Criar Profissional</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className={`bg-background/50 ${isMobile ? 'w-full' : 'max-w-sm'}`} 
              />
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              // Mobile: Cards view
              <div className="space-y-4">
                {filteredProfessionals.length > 0 ? (
                  filteredProfessionals.map(p => (
                    <Card key={p.id} className="border-border/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h3 className="font-medium text-base">{p.full_name}</h3>
                            <Badge className={getSpecializationBadgeColor(p.specialization)}>
                              {p.specialization}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
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
                                    Tem certeza que deseja excluir "{p.full_name}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cadastrado em: {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum profissional encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhum resultado para sua busca.' : 'Nenhum profissional cadastrado ainda.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Desktop: Table view
              <ScrollArea className="w-full">
                <div className="rounded-md border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Especialização</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfessionals.length > 0 ? (
                        filteredProfessionals.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell>
                              <Badge className={getSpecializationBadgeColor(p.specialization)}>
                                {p.specialization}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(p.created_at).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir "{p.full_name}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(p)}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            {searchTerm ? 'Nenhum profissional encontrado.' : 'Nenhum profissional cadastrado.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Formulário de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>Atualize os dados do profissional</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-6">
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="horarios">Horários de Trabalho</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dados" className="space-y-4 mt-4">
                  <FormField control={editForm.control} name="full_name" render={({
                  field
                }) => <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={editForm.control} name="specialization" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Especialização</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cirurgião-Dentista">Cirurgião-Dentista</SelectItem>
                          <SelectItem value="Ortodontista">Ortodontista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                </TabsContent>
                
                <TabsContent value="horarios" className="mt-4">
                  <ProfessionalScheduleForm 
                    professionalId={selectedProfessional?.id}
                    onScheduleChange={setCurrentSchedules}
                  />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="submit">Atualizar Profissional</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>;
}