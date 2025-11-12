import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OdontogramView } from '@/components/odontogram/OdontogramView';
import { TreatmentPlanView } from '@/components/treatment-plan/TreatmentPlanView';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Upload, Download, FileText, Image, Trash2, Eye, MessageCircle, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PatientAppointmentHistory } from '@/components/PatientAppointmentHistory';
import { logger } from '@/lib/logger';
import { formatCPF, formatPhone } from '@/lib/validators';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  full_name: string;
  contact_phone: string;
  cpf: string | null;
  birth_date: string | null;
  medical_history_notes: string | null;
  created_at: string;
}

interface PatientDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export default function PatientDetails() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userProfile = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [medicalNotes, setMedicalNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PatientDocument | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

  const isReceptionist = userProfile.type === 'receptionist';

  // Fetch patient data
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) throw new Error('Patient ID is required');
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      setMedicalNotes(data.medical_history_notes || '');
      return data as Patient;
    },
    enabled: !!patientId
  });

  // Fetch patient documents
  const { data: patientDocuments } = useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientDocument[];
    },
    enabled: !!patientId
  });

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const handleSaveMedicalNotes = async () => {
    if (!patientId) return;
    
    try {
      const { error } = await supabase
        .from('patients')
        .update({ medical_history_notes: medicalNotes })
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Anotações salvas",
        description: "As anotações médicas foram atualizadas com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    } catch (error) {
      logger.error('Erro ao salvar anotações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as anotações.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUploadDocuments = async () => {
    if (!patientId || !selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um ou mais arquivos para enviar.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${patientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('medical-documents')
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('patient_documents')
          .insert({
            patient_id: patientId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user?.id || null
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Documentos enviados",
        description: `${selectedFiles.length} documento(s) foram carregados.`
      });

      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
    } catch (error: any) {
      logger.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro ao enviar documentos",
        description: error?.message || "Ocorreu um erro ao fazer upload dos arquivos.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = async (doc: PatientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .download(doc.file_path);
      
      if (error) throw error;

      const url = URL.createObjectURL(data);
      setDocumentPreviewUrl(url);
      setViewingDocument(doc);
      setIsDocumentPreviewOpen(true);
    } catch (error) {
      logger.error('Erro ao visualizar documento:', error);
      toast({
        title: "Erro ao visualizar documento",
        description: "Não foi possível carregar o documento.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (doc: PatientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .download(doc.file_path);
      
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Erro ao baixar documento:', error);
      toast({
        title: "Erro ao baixar documento",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: PatientDocument) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('medical-documents')
        .remove([doc.file_path]);
      
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', doc.id);
      
      if (dbError) throw dbError;

      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
    } catch (error) {
      logger.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro ao excluir documento",
        description: "Não foi possível remover o arquivo.",
        variant: "destructive"
      });
    }
  };

  const closeDocumentPreview = () => {
    setIsDocumentPreviewOpen(false);
    setViewingDocument(null);
    if (documentPreviewUrl) {
      URL.revokeObjectURL(documentPreviewUrl);
      setDocumentPreviewUrl(null);
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return FileText;
    if (mimeType.startsWith('image/')) return Image;
    return FileText;
  };

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Paciente não encontrado</p>
          <Button onClick={() => navigate('/agenda')}>Voltar para Agenda</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/agenda')} className="hover:bg-accent/80">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-xl font-semibold">{patient.full_name}</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(formatWhatsAppLink(patient.contact_phone), '_blank')}
              className="border-success text-success hover:bg-success hover:text-success-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
            <TabsTrigger value="treatment-plan">Plano de Tratamento</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          {/* Tab 1: Informações */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input value={patient.full_name} disabled className="bg-muted/50" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={formatPhone(patient.contact_phone)} disabled className="bg-muted/50" />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={patient.cpf ? formatCPF(patient.cpf) : 'Não informado'} disabled className="bg-muted/50" />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input 
                      value={patient.birth_date ? format(new Date(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informada'} 
                      disabled 
                      className="bg-muted/50" 
                    />
                  </div>
                </div>
                {!isReceptionist && (
                  <p className="text-xs text-muted-foreground">
                    Apenas recepcionistas podem editar dados pessoais
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anotações Médicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Adicione anotações médicas sobre o paciente..."
                  rows={8}
                  className="min-h-[200px] resize-y"
                />
                <Button onClick={handleSaveMedicalNotes} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Anotações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Odontograma */}
          <TabsContent value="odontogram">
            <OdontogramView patientId={patientId!} />
          </TabsContent>

          {/* Tab 3: Plano de Tratamento */}
          <TabsContent value="treatment-plan">
            <TreatmentPlanView patientId={patientId!} />
          </TabsContent>

          {/* Tab 4: Histórico */}
          <TabsContent value="history">
            <PatientAppointmentHistory patientId={patientId!} />
          </TabsContent>

          {/* Tab 5: Documentos */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload de Documentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedFiles && selectedFiles.length > 0
                          ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                          : 'Clique para selecionar arquivos'}
                      </p>
                    </div>
                  </Label>
                </div>
                {selectedFiles && selectedFiles.length > 0 && (
                  <Button onClick={handleUploadDocuments} disabled={isUploading} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Enviando...' : 'Enviar Documentos'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos do Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                {!patientDocuments || patientDocuments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum documento encontrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {patientDocuments.map((doc) => {
                      const Icon = getFileIcon(doc.mime_type);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isReceptionist && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O documento será permanentemente removido.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteDocument(doc)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Document Preview Dialog */}
      <Dialog open={isDocumentPreviewOpen} onOpenChange={closeDocumentPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {viewingDocument && documentPreviewUrl && (
              isImageFile(viewingDocument.mime_type) ? (
                <img src={documentPreviewUrl} alt={viewingDocument.file_name} className="w-full h-auto" />
              ) : (
                <iframe
                  src={documentPreviewUrl}
                  className="w-full h-[70vh]"
                  title={viewingDocument.file_name}
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
