import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Edit, Trash2, ArrowLeft, Search, Upload, Download, FileText, X, Eye, Image, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  id: string;
  full_name: string;
  contact_phone: string;
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

export default function ManagePatients() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PatientDocument | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    contact_phone: '',
    birth_date: '',
    medical_history_notes: ''
  });

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data as Patient[];
    }
  });

  const { data: patientDocuments } = useQuery({
    queryKey: ['patient-documents', editingPatient?.id],
    queryFn: async () => {
      if (!editingPatient?.id) return [];
      
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', editingPatient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientDocument[];
    },
    enabled: !!editingPatient?.id
  });

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    // Remove caracteres especiais
    const cleanPhone = phone.replace(/\D/g, '');
    // Adiciona código do país se não tiver
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const filteredPatients = patients?.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.contact_phone.includes(searchTerm)
  ) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUploadDocuments = async () => {
    if (!selectedFiles || !editingPatient) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `patient-documents/${editingPatient.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('patient_documents')
          .insert({
            patient_id: editingPatient.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Documentos enviados com sucesso",
        description: `${selectedFiles.length} documento(s) foram carregados.`
      });

      setSelectedFiles(null);
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro ao enviar documentos",
        description: "Ocorreu um erro ao fazer upload dos arquivos.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = async (doc: PatientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setDocumentPreviewUrl(url);
      setViewingDocument(doc);
      setIsDocumentPreviewOpen(true);
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
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
        .from('patient-documents')
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
      console.error('Erro ao baixar documento:', error);
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
        .from('patient-documents')
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

      queryClient.invalidateQueries({ queryKey: ['patient-documents'] });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
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
    if (mimeType === 'application/pdf') return FileText;
    return FileText;
  };

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') || false;
  };

  const handleCreatePatient = async () => {
    if (!formData.full_name || !formData.contact_phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .insert([{
          full_name: formData.full_name,
          contact_phone: formData.contact_phone,
          birth_date: formData.birth_date || null,
          medical_history_notes: formData.medical_history_notes || null
        }]);

      if (error) throw error;

      toast({
        title: "Paciente criado com sucesso",
        description: `${formData.full_name} foi adicionado ao sistema.`
      });

      setFormData({
        full_name: '',
        contact_phone: '',
        birth_date: '',
        medical_history_notes: ''
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      toast({
        title: "Erro ao criar paciente",
        description: "Ocorreu um erro ao salvar os dados.",
        variant: "destructive"
      });
    }
  };

  const handleEditPatient = async () => {
    if (!editingPatient || !formData.full_name || !formData.contact_phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          full_name: formData.full_name,
          contact_phone: formData.contact_phone,
          birth_date: formData.birth_date || null,
          medical_history_notes: formData.medical_history_notes || null
        })
        .eq('id', editingPatient.id);

      if (error) throw error;

      toast({
        title: "Paciente atualizado",
        description: "As informações foram salvas com sucesso."
      });

      setIsEditDialogOpen(false);
      setEditingPatient(null);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Erro ao editar paciente:', error);
      toast({
        title: "Erro ao editar paciente",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Paciente excluído",
        description: "O paciente foi removido do sistema."
      });

      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      toast({
        title: "Erro ao excluir paciente",
        description: "Ocorreu um erro ao remover o paciente.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name,
      contact_phone: patient.contact_phone,
      birth_date: patient.birth_date || '',
      medical_history_notes: patient.medical_history_notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      full_name: '',
      contact_phone: '',
      birth_date: '',
      medical_history_notes: ''
    });
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="hover:bg-accent/80"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">Gerenciar Pacientes</h1>
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
        <div className="space-y-6">
          {/* Search and Create */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar pacientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Paciente</DialogTitle>
                  <DialogDescription>
                    Adicione as informações do novo paciente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Telefone *</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="medical_history_notes">Histórico Médico</Label>
                    <Textarea
                      id="medical_history_notes"
                      value={formData.medical_history_notes}
                      onChange={(e) => setFormData({ ...formData, medical_history_notes: e.target.value })}
                      placeholder="Informações relevantes do histórico médico..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreatePatient}
                    disabled={!formData.full_name || !formData.contact_phone}
                  >
                    Criar Paciente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Patients List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="border rounded-lg p-6 space-y-4 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-6 w-3/4 bg-muted/60 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-muted/60 rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted/60 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-muted/60 rounded animate-pulse" />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <div className="h-8 w-8 bg-muted/60 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-muted/60 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredPatients.map((patient, index) => (
                <Card 
                  key={patient.id} 
                  className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/20 shadow-soft hover:shadow-elegant group animate-scale-in transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {patient.full_name}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <a
                        href={formatWhatsAppLink(patient.contact_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group"
                      >
                        <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="underline-offset-4 group-hover:underline">
                          {patient.contact_phone}
                        </span>
                      </a>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {patient.birth_date && (
                      <div className="text-sm">
                        <span className="font-medium">Nascimento: </span>
                        {(() => {
                          try {
                            const date = new Date(patient.birth_date);
                            return !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                          } catch {
                            return 'Data inválida';
                          }
                        })()}
                      </div>
                    )}
                    {patient.medical_history_notes && (
                      <div className="text-sm">
                        <span className="font-medium">Histórico: </span>
                        <span className="text-muted-foreground line-clamp-2">
                          {patient.medical_history_notes}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Cadastrado em {(() => {
                        try {
                          const date = new Date(patient.created_at);
                          return !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                        } catch {
                          return 'Data inválida';
                        }
                      })()}
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(patient)}
                            className="hover:border-info hover:text-info hover:bg-info/10 transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] w-full p-0 gap-0">
                          <div className="flex flex-col h-full">
                            <DialogHeader className="p-6 pb-4 border-b border-border/50">
                              <DialogTitle className="text-xl">Editar Paciente</DialogTitle>
                              <DialogDescription>
                                Atualize as informações do paciente abaixo.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                              <div className="space-y-6">
                                {/* Campos básicos em linha horizontal */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div>
                                    <Label htmlFor="edit_name">Nome Completo *</Label>
                                    <Input
                                      id="edit_name"
                                      value={formData.full_name}
                                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                      placeholder="Digite o nome completo"
                                      className="mt-2"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit_phone">Telefone *</Label>
                                    <Input
                                      id="edit_phone"
                                      value={formData.contact_phone}
                                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                      placeholder="(11) 99999-9999"
                                      className="mt-2"
                                    />
                                    {formData.contact_phone && (
                                      <a
                                        href={formatWhatsAppLink(formData.contact_phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mt-1 group"
                                      >
                                        <MessageCircle className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                        <span className="underline-offset-4 group-hover:underline">
                                          Abrir no WhatsApp
                                        </span>
                                      </a>
                                    )}
                                  </div>
                                  <div>
                                    <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                                    <Input
                                      id="edit_birth_date"
                                      type="date"
                                      value={formData.birth_date}
                                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                                      className="mt-2"
                                    />
                                  </div>
                                </div>

                                {/* Textarea do histórico médico em largura total */}
                                <div>
                                  <Label htmlFor="edit_medical_history">Histórico Médico</Label>
                                  <Textarea
                                    id="edit_medical_history"
                                    value={formData.medical_history_notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, medical_history_notes: e.target.value }))}
                                    placeholder="Informações relevantes do histórico médico..."
                                    className="mt-2 min-h-[150px] resize-none"
                                  />
                                </div>

                                {/* Seção de documentos em largura total */}
                                <div className="space-y-4 border-t pt-4">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <Label className="text-base font-medium">Documentos Médicos</Label>
                                  </div>

                                  {/* Upload Section */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id="document-upload"
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleFileSelect}
                                        className="flex-1"
                                      />
                                      <Button 
                                        onClick={handleUploadDocuments}
                                        disabled={!selectedFiles || isUploading}
                                        size="sm"
                                        className="shrink-0"
                                      >
                                        {isUploading ? (
                                          "Enviando..."
                                        ) : (
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

                                  {/* Documents List */}
                                  <div className="max-h-48 overflow-y-auto space-y-2">
                                    {patientDocuments?.map((doc) => {
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
                                              <p className="text-sm font-medium truncate hover:text-primary transition-colors">{doc.file_name}</p>
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
                                              className="h-8 w-8 p-0 text-primary hover:text-primary"
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
                                    {(!patientDocuments || patientDocuments.length === 0) && (
                                      <div className="text-center py-4 text-sm text-muted-foreground">
                                        Nenhum documento encontrado
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <DialogFooter className="p-6 pt-4 border-t border-border/50">
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button 
                                onClick={handleEditPatient}
                                disabled={!formData.full_name || !formData.contact_phone}
                              >
                                Salvar Alterações
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:border-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o paciente <strong>{patient.full_name}</strong>? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePatient(patient.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredPatients.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca.'
                  : 'Clique no botão "Novo Paciente" para cadastrar o primeiro paciente.'
                }
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Document Preview Modal */}
      <Dialog open={isDocumentPreviewOpen} onOpenChange={closeDocumentPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-full p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingDocument?.file_name}
            </DialogTitle>
            <DialogDescription>
              Visualização do documento • {viewingDocument?.file_size && `${Math.round(viewingDocument.file_size / 1024)} KB`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-6">
            {documentPreviewUrl && viewingDocument && (
              <div className="w-full h-full flex items-center justify-center">
                {isImageFile(viewingDocument.mime_type) ? (
                  <img 
                    src={documentPreviewUrl} 
                    alt={viewingDocument.file_name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                  />
                ) : viewingDocument.mime_type === 'application/pdf' ? (
                  <iframe
                    src={documentPreviewUrl}
                    className="w-full h-[60vh] rounded-lg border"
                    title={viewingDocument.file_name}
                  />
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Visualização não disponível</h3>
                      <p className="text-muted-foreground mb-4">
                        Este tipo de arquivo não pode ser visualizado diretamente no navegador.
                      </p>
                      <Button onClick={() => handleDownloadDocument(viewingDocument)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Arquivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={closeDocumentPreview}>
              Fechar
            </Button>
            {viewingDocument && (
              <Button onClick={() => handleDownloadDocument(viewingDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}