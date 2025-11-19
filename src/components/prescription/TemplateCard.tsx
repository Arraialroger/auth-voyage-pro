import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Copy, Trash2, Share2, Lock, FileText, Building2 } from 'lucide-react';
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

interface Template {
  id: string;
  template_name: string;
  description: string | null;
  prescription_type: 'simple' | 'controlled' | 'special';
  is_shared: boolean;
  professional_id: string | null;
  prescription_template_items: Array<{
    id: string;
    medication_name: string;
  }>;
}

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (templateId: string) => void;
  isOwner: boolean;
}

const prescriptionTypeLabels = {
  simple: 'Simples',
  controlled: 'Controlada',
  special: 'Especial',
};

const prescriptionTypeColors = {
  simple: 'bg-blue-100 text-blue-700 border-blue-200',
  controlled: 'bg-amber-100 text-amber-700 border-amber-200',
  special: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const TemplateCard = ({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  isOwner,
}: TemplateCardProps) => {
  const isGenericTemplate = !template.professional_id;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-border/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {template.template_name}
            </CardTitle>
            {template.description && (
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {isGenericTemplate && (
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                <Building2 className="h-3 w-3 mr-1" />
                Clínica
              </Badge>
            )}
            
            {template.is_shared && !isGenericTemplate && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                <Share2 className="h-3 w-3 mr-1" />
                Compartilhado
              </Badge>
            )}
            
            {!template.is_shared && !isGenericTemplate && (
              <Badge variant="outline">
                <Lock className="h-3 w-3 mr-1" />
                Pessoal
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações */}
        <div className="space-y-2">
          <Badge className={prescriptionTypeColors[template.prescription_type]}>
            {prescriptionTypeLabels[template.prescription_type]}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {template.prescription_template_items.length}{' '}
            {template.prescription_template_items.length === 1 ? 'medicamento' : 'medicamentos'}
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(template)}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(template)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o template "{template.template_name}"?
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(template.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
