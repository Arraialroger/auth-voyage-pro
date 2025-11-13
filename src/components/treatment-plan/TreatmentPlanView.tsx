import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, FileText, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpDown } from "lucide-react";
import { TreatmentPlanCard } from "./TreatmentPlanCard";
import { CreateTreatmentPlanModal } from "./CreateTreatmentPlanModal";
import { logger } from "@/lib/logger";

interface TreatmentPlanViewProps {
  patientId: string;
}

export const TreatmentPlanView = ({ patientId }: TreatmentPlanViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userProfile = useUserProfile();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  const isReceptionist = userProfile.type === 'receptionist';

  const { data: treatmentPlans, isLoading } = useQuery({
    queryKey: ['treatment-plans', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          professional:professionals(full_name),
          items:treatment_plan_items(
            *,
            treatment:treatments(treatment_name)
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Erro ao carregar planos:', error);
        throw error;
      }
      
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Rascunho', icon: FileText, variant: 'secondary' as const },
      approved: { label: 'Aprovado', icon: CheckCircle2, variant: 'default' as const },
      in_progress: { label: 'Em Andamento', icon: Clock, variant: 'default' as const },
      completed: { label: 'Concluído', icon: CheckCircle2, variant: 'default' as const },
      cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCreatePlan = () => {
    setIsCreateModalOpen(true);
  };

  const handlePlanCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
    setIsCreateModalOpen(false);
  };

  // Filter and sort treatment plans
  const filteredAndSortedPlans = useMemo(() => {
    if (!treatmentPlans) return [];

    // Apply status filter
    let filtered = treatmentPlans;
    if (statusFilter !== "all") {
      filtered = treatmentPlans.filter(plan => plan.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "cost-desc":
          return (Number(b.total_cost) || 0) - (Number(a.total_cost) || 0);
        case "cost-asc":
          return (Number(a.total_cost) || 0) - (Number(b.total_cost) || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [treatmentPlans, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const hasPlans = treatmentPlans && treatmentPlans.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planos de Tratamento</CardTitle>
            <Button onClick={handleCreatePlan}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasPlans ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 bg-secondary/10 rounded-lg">
                <FileText className="h-8 w-8 text-secondary mb-2" />
                <p className="text-2xl font-bold">
                  {treatmentPlans.filter(p => p.status === 'draft').length}
                </p>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-primary/10 rounded-lg">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <p className="text-2xl font-bold">
                  {treatmentPlans.filter(p => p.status === 'in_progress').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                <p className="text-2xl font-bold">
                  {treatmentPlans.filter(p => p.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{treatmentPlans.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Nenhum plano de tratamento cadastrado para este paciente
              </p>
              <Button onClick={handleCreatePlan} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Plans List */}
      {hasPlans && (
        <div className="space-y-4">
          {/* Filters and Sorting */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filtrar por Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Data (Mais Recente)</SelectItem>
                      <SelectItem value="date-asc">Data (Mais Antigo)</SelectItem>
                      <SelectItem value="cost-desc">Custo (Maior)</SelectItem>
                      <SelectItem value="cost-asc">Custo (Menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {statusFilter !== "all" && (
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">
                    {filteredAndSortedPlans.length} {filteredAndSortedPlans.length === 1 ? 'plano encontrado' : 'planos encontrados'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setStatusFilter("all")}
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plans */}
          {filteredAndSortedPlans.length > 0 ? (
            filteredAndSortedPlans.map((plan) => (
              <TreatmentPlanCard
                key={plan.id}
                plan={plan}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['treatment-plans', patientId] })}
                isReceptionist={isReceptionist}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum plano encontrado com o filtro selecionado
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Plan Modal */}
      <CreateTreatmentPlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        patientId={patientId}
        onSuccess={handlePlanCreated}
      />
    </div>
  );
};