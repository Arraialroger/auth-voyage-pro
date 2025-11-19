import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, ArrowLeft, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import { formatPhone, formatCPF } from '@/lib/validators';

interface DuplicateGroup {
  field: 'phone' | 'cpf';
  value: string;
  patients: {
    id: string;
    full_name: string;
    contact_phone: string;
    cpf: string | null;
    created_at: string;
  }[];
}

interface TestPatient {
  id: string;
  full_name: string;
  contact_phone: string;
  created_at: string;
}

export default function DataCleanup() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Buscar duplicatas de telefone
  const { data: phoneDuplicates, isLoading: loadingPhoneDuplicates } = useQuery({
    queryKey: ['phone-duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, contact_phone, cpf, created_at')
        .order('contact_phone');

      if (error) throw error;

      // Agrupar por telefone
      const groups = new Map<string, typeof data>();
      data.forEach(patient => {
        const existing = groups.get(patient.contact_phone) || [];
        groups.set(patient.contact_phone, [...existing, patient]);
      });

      // Filtrar apenas grupos com duplicatas
      const duplicates: DuplicateGroup[] = [];
      groups.forEach((patients, phone) => {
        if (patients.length > 1) {
          duplicates.push({
            field: 'phone',
            value: phone,
            patients: patients.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          });
        }
      });

      return duplicates;
    }
  });

  // Buscar duplicatas de CPF
  const { data: cpfDuplicates, isLoading: loadingCpfDuplicates } = useQuery({
    queryKey: ['cpf-duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, contact_phone, cpf, created_at')
        .not('cpf', 'is', null)
        .order('cpf');

      if (error) throw error;

      // Agrupar por CPF
      const groups = new Map<string, typeof data>();
      data.forEach(patient => {
        if (patient.cpf) {
          const existing = groups.get(patient.cpf) || [];
          groups.set(patient.cpf, [...existing, patient]);
        }
      });

      // Filtrar apenas grupos com duplicatas
      const duplicates: DuplicateGroup[] = [];
      groups.forEach((patients, cpf) => {
        if (patients.length > 1) {
          duplicates.push({
            field: 'cpf',
            value: cpf,
            patients: patients.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          });
        }
      });

      return duplicates;
    }
  });

  // Buscar pacientes de teste
  const { data: testPatients, isLoading: loadingTestPatients } = useQuery({
    queryKey: ['test-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, contact_phone, created_at')
        .or('full_name.ilike.%test%,full_name.ilike.%teste%,full_name.ilike.%exemplo%,full_name.ilike.%demo%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TestPatient[];
    }
  });

  const handleDeletePatient = async (patientId: string) => {
    setDeletingIds(prev => new Set(prev).add(patientId));

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Paciente removido",
        description: "O paciente foi removido com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['phone-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['cpf-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['test-patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      logger.error('Erro ao deletar paciente:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover o paciente.",
        variant: "destructive"
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  const handleDeleteAllTestPatients = async () => {
    if (!testPatients || testPatients.length === 0) return;

    const testPatientIds = testPatients.map(p => p.id);
    setDeletingIds(new Set(testPatientIds));

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .in('id', testPatientIds);

      if (error) throw error;

      toast({
        title: "Pacientes de teste removidos",
        description: `${testPatients.length} paciente(s) de teste foram removidos com sucesso.`
      });

      queryClient.invalidateQueries({ queryKey: ['test-patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      logger.error('Erro ao deletar pacientes de teste:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao remover os pacientes de teste.",
        variant: "destructive"
      });
    } finally {
      setDeletingIds(new Set());
    }
  };

  const isLoading = loadingPhoneDuplicates || loadingCpfDuplicates || loadingTestPatients;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-accent/80">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-warning" />
                <h1 className="text-xl sm:text-2xl font-bold">Limpeza de Dados</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Alert */}
          <Card className="border-warning bg-warning/10">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle>Atenção</CardTitle>
              </div>
              <CardDescription>
                Esta ferramenta permite identificar e remover registros duplicados ou de teste. 
                Use com cuidado, pois a exclusão é permanente.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pacientes de Teste */}
          <Card>
            <CardHeader>
              <CardTitle>Pacientes de Teste</CardTitle>
              <CardDescription>
                Pacientes com nomes contendo "teste", "test", "exemplo" ou "demo"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTestPatients ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Buscando pacientes de teste...</p>
                </div>
              ) : testPatients && testPatients.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {testPatients.length} paciente(s) de teste encontrado(s)
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Todos os Testes
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover {testPatients.length} paciente(s) de teste? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAllTestPatients}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover Todos
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testPatients.map((patient) => (
                      <Card key={patient.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{patient.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatPhone(patient.contact_phone)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Cadastrado: {format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={deletingIds.has(patient.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {patient.full_name}? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePatient(patient.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum paciente de teste encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicatas de Telefone */}
          <Card>
            <CardHeader>
              <CardTitle>Telefones Duplicados</CardTitle>
              <CardDescription>
                Pacientes com o mesmo número de telefone
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPhoneDuplicates ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Buscando duplicatas...</p>
                </div>
              ) : phoneDuplicates && phoneDuplicates.length > 0 ? (
                <div className="space-y-6">
                  {phoneDuplicates.map((group, idx) => (
                    <Card key={idx} className="border-warning">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Telefone: {formatPhone(group.value)}
                        </CardTitle>
                        <CardDescription>
                          {group.patients.length} paciente(s) compartilham este telefone
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {group.patients.map((patient, pIdx) => (
                            <div key={patient.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {pIdx === 0 && '🔵 '}
                                  {patient.full_name}
                                  {pIdx === 0 && ' (mais antigo)'}
                                </p>
                                {patient.cpf && (
                                  <p className="text-sm text-muted-foreground">CPF: {formatCPF(patient.cpf)}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Cadastrado: {format(new Date(patient.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </p>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={deletingIds.has(patient.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover {patient.full_name}? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePatient(patient.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma duplicata de telefone encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicatas de CPF */}
          <Card>
            <CardHeader>
              <CardTitle>CPFs Duplicados</CardTitle>
              <CardDescription>
                Pacientes com o mesmo CPF
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCpfDuplicates ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Buscando duplicatas...</p>
                </div>
              ) : cpfDuplicates && cpfDuplicates.length > 0 ? (
                <div className="space-y-6">
                  {cpfDuplicates.map((group, idx) => (
                    <Card key={idx} className="border-warning">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          CPF: {formatCPF(group.value)}
                        </CardTitle>
                        <CardDescription>
                          {group.patients.length} paciente(s) compartilham este CPF
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {group.patients.map((patient, pIdx) => (
                            <div key={patient.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {pIdx === 0 && '🔵 '}
                                  {patient.full_name}
                                  {pIdx === 0 && ' (mais antigo)'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatPhone(patient.contact_phone)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cadastrado: {format(new Date(patient.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </p>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={deletingIds.has(patient.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover {patient.full_name}? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePatient(patient.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma duplicata de CPF encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
