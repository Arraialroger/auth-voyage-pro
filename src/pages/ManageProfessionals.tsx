import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Edit, Trash2, Search, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Professional = Database['public']['Tables']['professionals']['Row'];
type ProfessionalInsert = Database['public']['Tables']['professionals']['Insert'];

const professionalFormSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  specialization: z.enum(['Psicólogo', 'Fisioterapeuta', 'Nutricionista', 'Médico']),
  email: z.string().email('Email deve ser válido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type ProfessionalFormData = z.infer<typeof professionalFormSchema>;

export default function ManageProfessionals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  const form = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      full_name: '',
      specialization: 'Psicólogo',
      email: '',
      password: '',
    },
  });

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os profissionais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const handleCreate = async (data: ProfessionalFormData) => {
    try {
      // Primeiro, criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Usuário não foi criado');
      }

      // Depois, criar o registro na tabela professionals com o user_id
      const insertData: ProfessionalInsert = {
        full_name: data.full_name,
        specialization: data.specialization as any,
        user_id: authData.user.id,
      };

      const { error } = await supabase
        .from('professionals')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Profissional criado com sucesso!',
      });

      setIsCreateDialogOpen(false);
      form.reset();
      fetchProfessionals();
    } catch (error) {
      console.error('Erro ao criar profissional:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível criar o profissional.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (data: ProfessionalFormData) => {
    if (!selectedProfessional) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          full_name: data.full_name,
          specialization: data.specialization as any,
        })
        .eq('id', selectedProfessional.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Profissional atualizado com sucesso!',
      });

      setIsEditDialogOpen(false);
      setSelectedProfessional(null);
      form.reset();
      fetchProfessionals();
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o profissional.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (professional: Professional) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', professional.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Profissional excluído com sucesso!',
      });

      fetchProfessionals();
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o profissional.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (professional: Professional) => {
    setSelectedProfessional(professional);
    form.reset({
      full_name: professional.full_name,
      specialization: professional.specialization as any,
      email: '',
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const filteredProfessionals = professionals.filter(professional =>
    professional.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professional.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSpecializationBadgeColor = (specialization: string) => {
    const colors = {
      'Psicólogo': 'bg-blue-100 text-blue-800',
      'Fisioterapeuta': 'bg-green-100 text-green-800',
      'Nutricionista': 'bg-orange-100 text-orange-800',
      'Médico': 'bg-purple-100 text-purple-800',
    };
    return colors[specialization as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate('/admin')} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <UserCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gerenciar Profissionais
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Profissionais Cadastrados</CardTitle>
                <CardDescription>
                  Gerencie todos os profissionais do sistema
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Profissional
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Profissional</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do novo profissional
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="specialization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Especialização</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma especialização" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Psicólogo">Psicólogo</SelectItem>
                                <SelectItem value="Fisioterapeuta">Fisioterapeuta</SelectItem>
                                <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                                <SelectItem value="Médico">Médico</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Digite o email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Digite a senha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit">Criar Profissional</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2 mt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou especialização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>

          <CardContent>
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
                  {filteredProfessionals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {searchTerm ? 'Nenhum profissional encontrado.' : 'Nenhum profissional cadastrado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfessionals.map((professional) => (
                      <TableRow key={professional.id}>
                        <TableCell className="font-medium">
                          {professional.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSpecializationBadgeColor(professional.specialization)}>
                            {professional.specialization}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(professional.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(professional)}
                            >
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
                                    Tem certeza que deseja excluir o profissional "{professional.full_name}"? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(professional)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Profissional</DialogTitle>
              <DialogDescription>
                Atualize os dados do profissional
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialização</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma especialização" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Psicólogo">Psicólogo</SelectItem>
                          <SelectItem value="Fisioterapeuta">Fisioterapeuta</SelectItem>
                          <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                          <SelectItem value="Médico">Médico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Atualizar Profissional</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}