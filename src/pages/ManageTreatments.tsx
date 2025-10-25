import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Search, ArrowLeft, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { BLOCK_TREATMENT_ID } from '@/lib/constants';
import { logger } from '@/lib/logger';

interface Treatment {
  id: string;
  treatment_name: string;
  description?: string;
  cost?: number;
  default_duration_minutes: number;
}

export default function ManageTreatments() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    treatment_name: '',
    description: '',
    cost: '',
    default_duration_minutes: ''
  });

  const fetchTreatments = async () => {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .neq('id', BLOCK_TREATMENT_ID)
        .order('treatment_name');

      if (error) throw error;
      setTreatments(data || []);
    } catch (error) {
      logger.error('Erro ao buscar tratamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tratamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const resetForm = () => {
    setFormData({
      treatment_name: '',
      description: '',
      cost: '',
      default_duration_minutes: ''
    });
  };

  const handleCreate = async () => {
    if (!formData.treatment_name || !formData.default_duration_minutes) {
      toast({
        title: "Erro",
        description: "Nome e duração são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('treatments')
        .insert([{
          treatment_name: formData.treatment_name,
          description: formData.description || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          default_duration_minutes: parseInt(formData.default_duration_minutes)
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tratamento criado com sucesso",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchTreatments();
    } catch (error) {
      logger.error('Erro ao criar tratamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tratamento",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingTreatment || !formData.treatment_name || !formData.default_duration_minutes) {
      toast({
        title: "Erro",
        description: "Nome e duração são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('treatments')
        .update({
          treatment_name: formData.treatment_name,
          description: formData.description || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          default_duration_minutes: parseInt(formData.default_duration_minutes)
        })
        .eq('id', editingTreatment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tratamento atualizado com sucesso",
      });

      setIsEditDialogOpen(false);
      setEditingTreatment(null);
      resetForm();
      fetchTreatments();
    } catch (error) {
      logger.error('Erro ao atualizar tratamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar tratamento",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (treatment: Treatment) => {
    try {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', treatment.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tratamento excluído com sucesso",
      });

      fetchTreatments();
    } catch (error) {
      logger.error('Erro ao deletar tratamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir tratamento",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      treatment_name: treatment.treatment_name,
      description: treatment.description || '',
      cost: treatment.cost?.toString() || '',
      default_duration_minutes: treatment.default_duration_minutes.toString()
    });
    setIsEditDialogOpen(true);
  };

  const filteredTreatments = treatments.filter(treatment =>
    treatment.treatment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    treatment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
    }
    return `${remainingMinutes}min`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'}`}>
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-background/50"
              >
                <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
              <Stethoscope className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {isMobile ? 'Tratamentos' : 'Gerenciar Tratamentos'}
              </h1>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tratamento
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Tratamento</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo tratamento.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="treatment-name">Nome do Tratamento *</Label>
                  <Input
                    id="treatment-name"
                    value={formData.treatment_name}
                    onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
                    placeholder="Ex: Limpeza de Pele"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do tratamento..."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Valor (R$)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duração (minutos) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.default_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, default_duration_minutes: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>
                  Criar Tratamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 lg:py-8">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'}`}>
              <div>
                <CardTitle className="text-lg lg:text-xl">Tratamentos Cadastrados</CardTitle>
                <CardDescription>
                  Gerencie os tratamentos disponíveis na clínica
                </CardDescription>
              </div>
              <div className={`flex items-center space-x-2 ${isMobile ? 'w-full' : 'w-full max-w-sm'}`}>
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tratamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando tratamentos...</p>
              </div>
            ) : isMobile ? (
              // Mobile: Cards view
              <div className="space-y-4">
                {filteredTreatments.length === 0 ? (
                  <div className="text-center py-12">
                    <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum tratamento encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhum resultado para sua busca.' : 'Nenhum tratamento cadastrado ainda.'}
                    </p>
                  </div>
                ) : (
                  filteredTreatments.map((treatment) => (
                    <Card key={treatment.id} className="border-border/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1 flex-1">
                            <h3 className="font-medium text-base">{treatment.treatment_name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {treatment.description || 'Sem descrição'}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(treatment)}>
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
                                    Tem certeza que deseja excluir o tratamento "{treatment.treatment_name}"? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(treatment)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor:</span>
                            <p className="font-medium">{formatCurrency(treatment.cost)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duração:</span>
                            <p className="font-medium">{formatDuration(treatment.default_duration_minutes)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
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
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTreatments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'Nenhum tratamento encontrado' : 'Nenhum tratamento cadastrado'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTreatments.map((treatment) => (
                          <TableRow key={treatment.id}>
                            <TableCell className="font-medium">
                              {treatment.treatment_name}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {treatment.description || '-'}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(treatment.cost)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(treatment.default_duration_minutes)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(treatment)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o tratamento "{treatment.treatment_name}"? 
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDelete(treatment)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
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
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Tratamento</DialogTitle>
            <DialogDescription>
              Atualize as informações do tratamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-treatment-name">Nome do Tratamento *</Label>
              <Input
                id="edit-treatment-name"
                value={formData.treatment_name}
                onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
                placeholder="Ex: Limpeza de Pele"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do tratamento..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-cost">Valor (R$)</Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-duration">Duração (minutos) *</Label>
              <Input
                id="edit-duration"
                type="number"
                value={formData.default_duration_minutes}
                onChange={(e) => setFormData({ ...formData, default_duration_minutes: e.target.value })}
                placeholder="60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTreatment(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}