import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, UserCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface Receptionist {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

const receptionistSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

type ReceptionistFormData = z.infer<typeof receptionistSchema>;

export default function ManageReceptionists() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<ReceptionistFormData>({
    resolver: zodResolver(receptionistSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
    },
  });

  useEffect(() => {
    fetchReceptionists();
  }, []);

  const fetchReceptionists = async () => {
    try {
      setLoading(true);
      
      // Buscar staff_profiles com role='receptionist'
      const { data: staffProfiles, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, user_id, role')
        .eq('role', 'receptionist');

      if (staffError) throw staffError;

      // Buscar dados dos usuários de auth
      const userIds: string[] = (staffProfiles?.map(s => s.user_id).filter((id): id is string => id !== null) || []);
      
      if (userIds.length === 0) {
        setReceptionists([]);
        return;
      }

      // Usar API admin para buscar usuários
      const { data: authData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError || !authData?.users) throw usersError;

      const receptionistUsers: Receptionist[] = authData.users
        .filter((user: any) => userIds.includes(user.id))
        .map((user: any) => ({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email || 'Sem nome',
          created_at: user.created_at,
        }));

      setReceptionists(receptionistUsers);
    } catch (error) {
      logger.error('Erro ao buscar recepcionistas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de recepcionistas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceptionist = async (data: ReceptionistFormData) => {
    try {
      setIsCreating(true);

      // Chamar edge function para criar recepcionista
      const { data: result, error } = await supabase.functions.invoke('create-receptionist', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({
        title: 'Recepcionista criado',
        description: `${data.full_name} foi adicionado ao sistema com sucesso.`,
      });

      setIsCreateDialogOpen(false);
      form.reset();
      fetchReceptionists();
    } catch (error: any) {
      logger.error('Erro ao criar recepcionista:', error);
      toast({
        title: 'Erro ao criar recepcionista',
        description: error.message || 'Ocorreu um erro ao tentar criar o recepcionista',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteReceptionist = async (receptionist: Receptionist) => {
    try {
      // Deletar usuário do auth (isso vai cascatear para staff_profiles)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(receptionist.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Recepcionista removido',
        description: `${receptionist.full_name} foi removido do sistema.`,
      });

      fetchReceptionists();
    } catch (error) {
      logger.error('Erro ao deletar recepcionista:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o recepcionista',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <UserCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Gerenciar Recepcionistas
              </h1>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Novo Recepcionista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Recepcionista</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário recepcionista no sistema.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateReceptionist)} className="space-y-4">
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                          <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Recepcionista'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Recepcionistas do Sistema</CardTitle>
            <CardDescription>
              Gerencie os usuários recepcionistas que têm acesso administrativo ao sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : receptionists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum recepcionista cadastrado no sistema.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptionists.map((receptionist) => (
                    <TableRow key={receptionist.id}>
                      <TableCell className="font-medium">{receptionist.full_name}</TableCell>
                      <TableCell>{receptionist.email}</TableCell>
                      <TableCell>
                        {new Date(receptionist.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{receptionist.full_name}</strong> do sistema?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteReceptionist(receptionist)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
