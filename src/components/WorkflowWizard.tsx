import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Stethoscope, ArrowRight, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WorkflowWizardProps {
  patientId: string;
  onSelectWorkflow?: (workflow: 'odontogram' | 'plan') => void;
}

export const WorkflowWizard = ({ patientId, onSelectWorkflow }: WorkflowWizardProps) => {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenWizard = localStorage.getItem('hasSeenWorkflowWizard');
    if (!hasSeenWizard) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWorkflowWizard', 'true');
    }
    setOpen(false);
  };

  const handleSelectWorkflow = (workflow: 'odontogram' | 'plan') => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWorkflowWizard', 'true');
    }
    setOpen(false);
    onSelectWorkflow?.(workflow);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bem-vindo ao Prontuário do Paciente</DialogTitle>
          <DialogDescription className="text-base">
            Existem dois fluxos de trabalho principais. Escolha o que melhor se adequa à sua situação:
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 my-4">
          <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleSelectWorkflow('odontogram')}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-6 w-6 text-primary" />
                <CardTitle>Odontograma Primeiro</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Examinar e documentar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Quando usar:</strong> Durante a primeira consulta ou exame clínico
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Examine a boca do paciente</li>
                <li>• Documente o estado de cada dente</li>
                <li>• Registre procedimentos realizados</li>
                <li>• Adicione ao plano conforme necessário</li>
              </ul>
              <Button className="w-full mt-4" onClick={() => handleSelectWorkflow('odontogram')}>
                Começar com Odontograma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => handleSelectWorkflow('plan')}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle>Plano Primeiro</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Planejar tratamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Quando usar:</strong> Quando já conhece o tratamento necessário
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Crie um plano de tratamento</li>
                <li>• Liste procedimentos necessários</li>
                <li>• Defina custos estimados</li>
                <li>• Agende as consultas</li>
              </ul>
              <Button className="w-full mt-4" onClick={() => handleSelectWorkflow('plan')}>
                Começar com Plano
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dontShow" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label 
              htmlFor="dontShow" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Não mostrar novamente
            </Label>
          </div>
          <Button variant="ghost" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
