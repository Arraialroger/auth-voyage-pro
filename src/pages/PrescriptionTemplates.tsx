import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, ArrowLeft, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreateTemplateModal } from '@/components/prescription/CreateTemplateModal';
import { EditTemplateModal } from '@/components/prescription/EditTemplateModal';
import { TemplateCard } from '@/components/prescription/TemplateCard';

interface Template {
  id: string;
  template_name: string;
  description: string | null;
  prescription_type: 'simple' | 'controlled' | 'special';
  is_shared: boolean;
  professional_id: string;
  general_instructions: string | null;
  created_at: string;
  prescription_template_items: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    item_order: number;
  }>;
}

export default function PrescriptionTemplates() {
  const navigate = useNavigate();
  const { professionalId, type: userType } = useUserProfile();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (professionalId || userType === 'receptionist') {
      fetchTemplates();
    }
  }, [professionalId, userType]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('prescription_templates')
        .select(`
          *,
          prescription_template_items (*)
        `);

      // Filtro baseado no tipo de usuário
      if (userType === 'professional' && professionalId) {
        query = query.or(`professional_id.is.null,professional_id.eq.${professionalId}`);
      }
      // Recepcionistas veem todos (RLS já filtra adequadamente)

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('prescription_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Template excluído com sucesso',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (template: Template) => {
    // Determinar o professional_id para o novo template
    const newTemplateProfessionalId = userType === 'professional' 
      ? professionalId 
      : null; // Recepcionistas criam templates genéricos

    try {
      // Criar cópia do template
      const { data: newTemplate, error: templateError } = await supabase
        .from('prescription_templates')
        .insert({
          template_name: `${template.template_name} (Cópia)`,
          description: template.description,
          prescription_type: template.prescription_type,
          is_shared: false, // Templates duplicados sempre começam como não compartilhados
          professional_id: newTemplateProfessionalId,
          general_instructions: template.general_instructions,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Copiar itens do template
      const itemsWithNewId = template.prescription_template_items.map((item) => ({
        template_id: newTemplate.id,
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        item_order: item.item_order,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_template_items')
        .insert(itemsWithNewId);

      if (itemsError) throw itemsError;

      toast({
        title: 'Sucesso',
        description: 'Template duplicado com sucesso',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível duplicar o template',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditModalOpen(true);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.prescription_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Templates de Receitas
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/agenda')}
              className="border-border/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="simple">Simples</SelectItem>
                <SelectItem value="controlled">Controlada</SelectItem>
                <SelectItem value="special">Especial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro template de receita'}
              </p>
              {!searchTerm && filterType === 'all' && (
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  isOwner={userType === 'receptionist' || template.professional_id === professionalId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateTemplateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchTemplates}
      />

      {selectedTemplate && (
        <EditTemplateModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onSuccess={fetchTemplates}
        />
      )}
    </div>
  );
}
