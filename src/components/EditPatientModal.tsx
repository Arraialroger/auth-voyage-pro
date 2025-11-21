import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Upload, Download, X, Eye, Image, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PatientAppointmentHistory } from '@/components/PatientAppointmentHistory';
import { logger } from '@/lib/logger';
import { validateCPF, validatePhone, formatPhone, formatCPFMask, suggestCorrectCPF, cleanPhone, cleanCPF } from '@/lib/validators';
import { format } from 'date-fns';

interface EditPatientModalProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

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

export function EditPatientModal({ patientId, open, onOpenChange, onSave }: EditPatientModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    contact_phone: '',
    cpf: '',
    birth_date: '',
    medical_history_notes: ''
  });
  const [cpfValidationError, setCpfValidationError] = useState<string>('');
  const [cpfSuggestion, setCpfSuggestion] = useState<string>('');
  const [cpfDuplicateError, setCpfDuplicateError] = useState<{
    exists: boolean;
    patient?: { full_name: string; created_at: string; id: string };
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PatientDocument | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

  const CONFIRMATION_MESSAGE = "Olá, aqui é a Manuella da Clínica Arraial Odonto 😊. " +
    "Gostaria de confirmar sua consulta para garantirmos o seu horário. " +
    "Se não conseguirmos a confirmação até 4 horas antes, precisaremos liberar " +
    "a vaga para outro paciente, mas não se preocupe: entraremos em contato " +
    "para remarcar com você. Você prefere confirmar a consulta ou reagendar para outro horário?";

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data as Patient;
    },
    enabled: !!patientId && open
  });

  // Fetch patient documents
  const { data: patientDocuments } = useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PatientDocument[];
    },
    enabled: !!patientId && open
  });

  // Load patient data into form
  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name,
        contact_phone: patient.contact_phone,
        cpf: patient.cpf || '',
        birth_date: patient.birth_date || '',
        medical_history_notes: patient.medical_history_notes || ''
      });
      setCpfDuplicateError(null);
      setCpfValidationError('');
      setCpfSuggestion('');
    }
  }, [patient]);

  const formatWhatsAppLink = (phone: string, message?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    if (message) {
      const encodedMessage = encodeURIComponent(message);
      return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
    }
    return `https://wa.me/${phoneWithCountry}`;
  };

  const handlePhoneBlur = async (phone: string) => {
    if (!phone || !validatePhone(phone) || !patient) return;

    try {
      const cleanedPhone = cleanPhone(phone);
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('contact_phone', cleanedPhone)
        .neq('id', patient.id)
        .maybeSingle();

      if (data) {
        toast({
          title: "⚠️ Telefone compartilhado",
          description: `Este número também pertence a: ${data.full_name}`,
          variant: "default",
          duration: 5000
        });
      }
    } catch (error) {
      logger.error('Erro ao verificar telefone:', error);
    }
  };

  const handleCPFBlur = async (cpf: string) => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11 || !patient) {
      setCpfDuplicateError(null);
      return;
    }

    try {
      const cleanedCPF = cleanCPF(cpf);
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('cpf', cleanedCPF)
        .neq('id', patient.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCpfDuplicateError({ exists: true, patient: data });
      } else {
        setCpfDuplicateError(null);
      }
    } catch (error) {
      logger.error('Erro ao verificar CPF:', error);
      setCpfDuplicateError(null);
    }
  };

  const handleSavePatient = async () => {
    if (!patient || !formData.full_name || !formData.contact_phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!validatePhone(formData.contact_phone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD (mínimo 10 dígitos).",
        variant: "destructive"
      });
      return;
    }

    if (cpfDuplicateError?.exists && cpfDuplicateError.patient?.id !== patient.id) {
      toast({
        title: "CPF já cadastrado",
        description: `Este CPF pertence a: ${cpfDuplicateError.patient?.full_name}. Verifique os dados ou edite o paciente existente.`,
        variant: "destructive",
        duration: 8000
      });
      return;
    }

    if (formData.cpf && !validateCPF(formData.cpf)) {
      const suggestion = suggestCorrectCPF(formData.cpf);
      toast({
        title: "CPF inválido",
        description: suggestion
          ? `O CPF digitado é inválido. Você quis dizer ${suggestion}?`
          : "Digite um CPF válido no formato XXX.XXX.XXX-XX.",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          full_name: formData.full_name,
          contact_phone: cleanPhone(formData.contact_phone),
          cpf: formData.cpf ? cleanCPF(formData.cpf) : null,
          birth_date: formData.birth_date || null,
          medical_history_notes: formData.medical_history_notes || null
        })
        .eq('id', patient.id);

      if (error) throw error;

      toast({
        title: "Paciente atualizado",
        description: "As informações foram salvas com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      if (onSave) onSave();
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Erro ao editar paciente:', error);
      
      if (error?.code === '23505') {
        const isDuplicateCPF = error.message?.includes('patients_cpf_key');
        if (isDuplicateCPF) {
          const cleanedCPF = formData.cpf ? cleanCPF(formData.cpf) : '';
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('cpf', cleanedCPF)
            .neq('id', patient.id)
            .maybeSingle();

          toast({
            title: "CPF já cadastrado",
            description: existingPatient
              ? `Este CPF já está cadastrado para: ${existingPatient.full_name} (desde ${new Date(existingPatient.created_at).toLocaleDateString('pt-BR')})`
              : "Este CPF já está cadastrado no sistema.",
            variant: "destructive",
            duration: 10000
          });
          return;
        }
      }

      toast({
        title: "Erro ao editar paciente",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUploadDocuments = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
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
        title: "Documentos enviados com sucesso",
        description: `${selectedFiles.length} documento(s) foram carregados.`
      });

      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
    } catch (error: any) {
      logger.error('❌ Erro ao fazer upload:', error);
      toast({
        title: "Erro ao enviar documentos",
        description: "Não foi possível fazer upload dos arquivos.",
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

      queryClient.invalidateQueries({ queryKey: ['patient-documents', doc.patient_id] });
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

  if (patientLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-full flex flex-col min-h-0">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-xl">Editar Paciente</DialogTitle>
            <DialogDescription>
              Visualize e atualize as informações do paciente.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3 shrink-0">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
              {/* Tab: Informações do Paciente */}
              <TabsContent value="info" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="edit_name">Nome Completo *</Label>
                    <Input
                      id="edit_name"
                      value={formData.full_name}
                      onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Digite o nome completo"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_phone">Telefone *</Label>
                    <Input
                      id="edit_phone"
                      value={formData.contact_phone}
                      onChange={e => {
                        const formatted = formatPhone(e.target.value);
                        setFormData(prev => ({ ...prev, contact_phone: formatted }));
                      }}
                      onBlur={e => handlePhoneBlur(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="mt-2"
                    />
                    {formData.contact_phone && (
                      <div className="flex flex-col gap-2 mt-1">
                        <a
                          href={formatWhatsAppLink(formData.contact_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group"
                        >
                          <MessageCircle className="h-3 w-3 group-hover:scale-110 transition-transform" />
                          <span className="underline-offset-4 group-hover:underline">
                            Abrir no WhatsApp
                          </span>
                        </a>
                        <a
                          href={formatWhatsAppLink(formData.contact_phone, CONFIRMATION_MESSAGE)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 group"
                        >
                          <CheckCircle2 className="h-3 w-3 group-hover:scale-110 transition-transform" />
                          <span className="underline-offset-4 group-hover:underline">
                            Mensagem de Confirmação
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit_cpf">CPF</Label>
                    <Input
                      id="edit_cpf"
                      value={formData.cpf}
                      onChange={e => {
                        const masked = formatCPFMask(e.target.value);
                        setFormData(prev => ({ ...prev, cpf: masked }));
                        setCpfDuplicateError(null);
                        setCpfValidationError('');
                        setCpfSuggestion('');
                      }}
                      onBlur={async e => {
                        const cpfValue = e.target.value;
                        if (cpfValue && !validateCPF(cpfValue)) {
                          const suggestion = suggestCorrectCPF(cpfValue);
                          setCpfValidationError(suggestion
                            ? `CPF inválido. Você quis dizer ${suggestion}?`
                            : "CPF inválido");
                          setCpfSuggestion(suggestion || '');
                        } else {
                          setCpfValidationError('');
                          setCpfSuggestion('');
                          await handleCPFBlur(cpfValue);
                        }
                      }}
                      placeholder="000.000.000-00"
                      className="mt-2"
                      maxLength={14}
                    />
                    {cpfValidationError && (
                      <p className="text-sm text-destructive mt-1">{cpfValidationError}</p>
                    )}
                    {cpfDuplicateError?.exists && (
                      <p className="text-sm text-destructive mt-1">
                        ⚠️ CPF já cadastrado para: {cpfDuplicateError.patient?.full_name}
                      </p>
                    )}
                    {cpfSuggestion && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0 text-xs text-primary"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, cpf: cpfSuggestion }));
                          setCpfValidationError('');
                          setCpfSuggestion('');
                        }}
                      >
                        ✓ Aplicar sugestão: {cpfSuggestion}
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                    <Input
                      id="edit_birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit_medical_history">Histórico Médico</Label>
                  <Textarea
                    id="edit_medical_history"
                    value={formData.medical_history_notes}
                    onChange={e => setFormData(prev => ({ ...prev, medical_history_notes: e.target.value }))}
                    placeholder="Informações relevantes do histórico médico..."
                    className="mt-2 min-h-[150px] resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documents" className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Documentos Médicos</Label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="document-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="flex-1"
                      ref={fileInputRef}
                    />
                    <Button
                      onClick={handleUploadDocuments}
                      disabled={!selectedFiles || isUploading}
                      size="sm"
                      className="shrink-0"
                    >
                      {isUploading ? "Enviando..." : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                  {selectedFiles && (
                    <div className="text-sm text-muted-foreground">
                      {selectedFiles.length} arquivo(s) selecionado(s)
                    </div>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {patientDocuments?.map(doc => {
                    const FileIcon = getFileIcon(doc.mime_type);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                      >
                        <div
                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                              {doc.file_size && ` • ${Math.round(doc.file_size / 1024)} KB`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="h-8 w-8 p-0"
                            title="Visualizar documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-8 w-8 p-0"
                            title="Baixar documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Excluir documento"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!patientDocuments || patientDocuments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum documento cadastrado
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="history" className="mt-6">
                <PatientAppointmentHistory patientId={patientId} />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePatient}
              disabled={!formData.full_name || !formData.contact_phone}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={isDocumentPreviewOpen} onOpenChange={closeDocumentPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {documentPreviewUrl && viewingDocument && (
              isImageFile(viewingDocument.mime_type) ? (
                <img
                  src={documentPreviewUrl}
                  alt={viewingDocument.file_name}
                  className="max-w-full h-auto"
                />
              ) : (
                <iframe
                  src={documentPreviewUrl}
                  className="w-full h-[70vh]"
                  title="Visualização do documento"
                />
              )
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDocumentPreview}>
              Fechar
            </Button>
            <Button onClick={() => viewingDocument && handleDownloadDocument(viewingDocument)}>
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
