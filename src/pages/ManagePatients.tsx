import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Edit, Trash2, ArrowLeft, Search, Upload, Download, FileText, X, Eye, Image, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientAppointmentHistory } from '@/components/PatientAppointmentHistory';
import { logger } from '@/lib/logger';
import { validateCPF, validatePhone, formatCPF, formatPhone, formatCPFMask, suggestCorrectCPF, cleanPhone, cleanCPF } from '@/lib/validators';
import { BLOCK_PATIENT_ID } from '@/lib/constants';
import { useUserProfile } from '@/hooks/useUserProfile';
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
export default function ManagePatients() {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const userProfile = useUserProfile();

  useEffect(() => {
    if (!userProfile.loading && userProfile.type !== 'receptionist') {
      navigate('/agenda', { replace: true });
    }
  }, [userProfile, navigate]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PatientDocument | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
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
  const {
    data: patients,
    isLoading
  } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('patients').select('*').neq('id', BLOCK_PATIENT_ID).order('full_name', {
        ascending: true
      });
      if (error) throw error;
      return data as Patient[];
    }
  });
  const {
    data: patientDocuments
  } = useQuery({
    queryKey: ['patient-documents', editingPatient?.id],
    queryFn: async () => {
      if (!editingPatient?.id) return [];
      const {
        data,
        error
      } = await supabase.from('patient_documents').select('*').eq('patient_id', editingPatient.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data as PatientDocument[];
    },
    enabled: !!editingPatient?.id
  });
  const formatWhatsAppLink = (phone: string, message?: string) => {
    if (!phone) return '#';
    // Remove caracteres especiais
    const cleanPhone = phone.replace(/\D/g, '');
    // Adiciona código do país se não tiver
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Se tiver mensagem, adiciona ao link
    if (message) {
      const encodedMessage = encodeURIComponent(message);
      return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
    }
    return `https://wa.me/${phoneWithCountry}`;
  };
  const CONFIRMATION_MESSAGE = "Olá, aqui é a Manuella da Clínica Arraial Odonto 😊. " + "Gostaria de confirmar sua consulta para garantirmos o seu horário. " + "Se não conseguirmos a confirmação até 4 horas antes, precisaremos liberar " + "a vaga para outro paciente, mas não se preocupe: entraremos em contato " + "para remarcar com você. Você prefere confirmar a consulta ou reagendar para outro horário?";
  const filteredPatients = patients?.filter(patient => patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || patient.contact_phone.includes(searchTerm)) || [];
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };
  const handleUploadDocuments = async () => {
    if (!editingPatient) {
      toast({
        title: "Selecione um paciente",
        description: "Abra um paciente antes de enviar documentos.",
        variant: "destructive"
      });
      return;
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um ou mais arquivos para enviar.",
        variant: "destructive"
      });
      return;
    }
    logger.debug('🔵 Iniciando upload de documentos:', {
      totalFiles: selectedFiles.length,
      patientId: editingPatient.id
    });
    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        logger.debug('📄 Processando arquivo:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${editingPatient.id}/${fileName}`;
        logger.debug('⬆️ Fazendo upload para storage:', filePath);
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.storage.from('medical-documents').upload(filePath, file, {
          contentType: file.type
        });
        if (uploadError) {
          logger.error('❌ Erro no upload do storage:', uploadError);
          throw uploadError;
        }
        logger.debug('✅ Upload storage bem-sucedido:', uploadData);
        logger.debug('💾 Salvando registro no banco de dados...');
        const {
          error: dbError
        } = await supabase.from('patient_documents').insert({
          patient_id: editingPatient.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id || null
        });
        if (dbError) {
          logger.error('❌ Erro ao salvar no banco:', dbError);
          throw dbError;
        }
        logger.debug('✅ Registro salvo no banco de dados');
      }
      toast({
        title: "Documentos enviados com sucesso",
        description: `${selectedFiles.length} documento(s) foram carregados.`
      });
      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      logger.debug('🔄 Revalidando queries de documentos...');
      await queryClient.invalidateQueries({
        queryKey: ['patient-documents', editingPatient.id]
      });
      logger.debug('✅ Upload completo!');
    } catch (error: any) {
      logger.error('❌ Erro ao fazer upload:', error);
      const rawMessage = error?.message as string || '';
      let errorMessage = rawMessage || 'Ocorreu um erro ao fazer upload dos arquivos.';
      // Mensagens mais claras para casos comuns
      const status = (error as any)?.statusCode;
      if (status === 401 || status === 403 || /permission|not authorized|unauthorized/i.test(rawMessage)) {
        errorMessage = 'Permissão negada. Verifique seu papel (Recepcionista ou Profissional) e tente novamente.';
      } else if (status === 409 || /exists|conflict/i.test(rawMessage)) {
        errorMessage = 'Já existe um arquivo com este nome. Tente renomear e enviar novamente.';
      }
      toast({
        title: "Erro ao enviar documentos",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleViewDocument = async (doc: PatientDocument) => {
    try {
      const {
        data,
        error
      } = await supabase.storage.from('medical-documents').download(doc.file_path);
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
      const {
        data,
        error
      } = await supabase.storage.from('medical-documents').download(doc.file_path);
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
      const {
        error: storageError
      } = await supabase.storage.from('medical-documents').remove([doc.file_path]);
      if (storageError) throw storageError;
      const {
        error: dbError
      } = await supabase.from('patient_documents').delete().eq('id', doc.id);
      if (dbError) throw dbError;
      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso."
      });
      queryClient.invalidateQueries({
        queryKey: ['patient-documents', doc.patient_id]
      });
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
    
    // Validate phone
    if (!validatePhone(formData.contact_phone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD (mínimo 10 dígitos).",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    // ✅ Bloquear submit se CPF duplicado detectado
    if (cpfDuplicateError?.exists) {
      toast({
        title: "CPF já cadastrado",
        description: `Este CPF pertence a: ${cpfDuplicateError.patient?.full_name}. Verifique os dados ou edite o paciente existente.`,
        variant: "destructive",
        duration: 8000
      });
      return;
    }
    
    // Validate CPF if provided
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
      setCpfValidationError(suggestion 
        ? `CPF inválido. Você quis dizer ${suggestion}?` 
        : "CPF inválido");
      setCpfSuggestion(suggestion || '');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('patients').insert([{
        full_name: formData.full_name,
        contact_phone: cleanPhone(formData.contact_phone),
        cpf: formData.cpf ? cleanCPF(formData.cpf) : null,
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
        cpf: '',
        birth_date: '',
        medical_history_notes: ''
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['patients']
      });
    } catch (error: any) {
      logger.error('Erro ao criar paciente:', error);
      
      // ✅ Detect PostgreSQL unique constraint violation (error code 23505)
      if (error?.code === '23505') {
        const isDuplicatePhone = error.message?.includes('patients_contact_phone_key');
        const isDuplicateCPF = error.message?.includes('patients_cpf_key');
        
        if (isDuplicatePhone) {
          // Fetch existing patient with duplicate phone
          const cleanedPhone = cleanPhone(formData.contact_phone);
          
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('contact_phone', cleanedPhone)
            .maybeSingle();
          
          toast({
            title: "Telefone já cadastrado",
            description: existingPatient 
              ? `Este telefone já está cadastrado para: ${existingPatient.full_name} (desde ${new Date(existingPatient.created_at).toLocaleDateString('pt-BR')})`
              : "Este telefone já está cadastrado no sistema.",
            variant: "destructive",
            duration: 10000
          });
          return;
        }
        
        if (isDuplicateCPF) {
          // Fetch existing patient with duplicate CPF
          const cleanedCPF = formData.cpf ? cleanCPF(formData.cpf) : '';
          
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('cpf', cleanedCPF)
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
      
      // Generic error for non-duplicate issues
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
    
    // Validate phone
    if (!validatePhone(formData.contact_phone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido com DDD (mínimo 10 dígitos).",
        variant: "destructive"
      });
      return;
    }
    
    // ✅ Block submission if duplicate CPF detected (excluding current patient)
    if (cpfDuplicateError?.exists && cpfDuplicateError.patient?.id !== editingPatient.id) {
      toast({
        title: "CPF já cadastrado",
        description: `Este CPF pertence a: ${cpfDuplicateError.patient?.full_name}. Verifique os dados ou edite o paciente existente.`,
        variant: "destructive",
        duration: 8000
      });
      return;
    }
    
    // Validate CPF if provided
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
      setCpfValidationError(suggestion 
        ? `CPF inválido. Você quis dizer ${suggestion}?` 
        : "CPF inválido");
      setCpfSuggestion(suggestion || '');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('patients').update({
        full_name: formData.full_name,
        contact_phone: cleanPhone(formData.contact_phone),
        cpf: formData.cpf ? cleanCPF(formData.cpf) : null,
        birth_date: formData.birth_date || null,
        medical_history_notes: formData.medical_history_notes || null
      }).eq('id', editingPatient.id);
      if (error) throw error;
      toast({
        title: "Paciente atualizado",
        description: "As informações foram salvas com sucesso."
      });
      setIsEditDialogOpen(false);
      setEditingPatient(null);
      queryClient.invalidateQueries({
        queryKey: ['patients']
      });
    } catch (error: any) {
      logger.error('Erro ao editar paciente:', error);
      
      // Detect PostgreSQL unique constraint violation (error code 23505)
      if (error?.code === '23505') {
        const isDuplicatePhone = error.message?.includes('patients_contact_phone_key');
        const isDuplicateCPF = error.message?.includes('patients_cpf_key');
        
        if (isDuplicatePhone) {
          // Fetch existing patient with duplicate phone (excluding current patient)
          const cleanedPhone = cleanPhone(formData.contact_phone);
          
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('contact_phone', cleanedPhone)
            .neq('id', editingPatient.id)
            .maybeSingle();
          
          toast({
            title: "Telefone já cadastrado",
            description: existingPatient 
              ? `Este telefone já está cadastrado para: ${existingPatient.full_name} (desde ${new Date(existingPatient.created_at).toLocaleDateString('pt-BR')})`
              : "Este telefone já está cadastrado no sistema.",
            variant: "destructive",
            duration: 10000
          });
          return;
        }
        
        if (isDuplicateCPF) {
          // Fetch existing patient with duplicate CPF (excluding current patient)
          const cleanedCPF = formData.cpf ? cleanCPF(formData.cpf) : '';
          
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('full_name, created_at')
            .eq('cpf', cleanedCPF)
            .neq('id', editingPatient.id)
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
      
      // Generic error for non-duplicate issues
      toast({
        title: "Erro ao editar paciente",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive"
      });
    }
  };
  const handleDeletePatient = async (patientId: string) => {
    try {
      const {
        error
      } = await supabase.from('patients').delete().eq('id', patientId);
      if (error) throw error;
      toast({
        title: "Paciente excluído",
        description: "O paciente foi removido do sistema."
      });
      queryClient.invalidateQueries({
        queryKey: ['patients']
      });
    } catch (error) {
      logger.error('Erro ao excluir paciente:', error);
      toast({
        title: "Erro ao excluir paciente",
        description: "Ocorreu um erro ao remover o paciente.",
        variant: "destructive"
      });
    }
  };
  const handlePhoneBlur = async (phone: string) => {
    if (!phone || !validatePhone(phone)) {
      return;
    }

    try {
      const cleanedPhone = cleanPhone(phone);
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('contact_phone', cleanedPhone)
        .maybeSingle();
      
      if (data && !error) {
        // ⚠️ Aviso informativo, NÃO bloqueia submissão
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

  const handlePhoneBlurEdit = async (phone: string) => {
    if (!phone || !validatePhone(phone) || !editingPatient) {
      return;
    }

    try {
      const cleanedPhone = cleanPhone(phone);
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('contact_phone', cleanedPhone)
        .neq('id', editingPatient.id)
        .maybeSingle();
      
      if (data && !error) {
        // ⚠️ Aviso informativo, NÃO bloqueia submissão
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

  // ✅ Validação onBlur para CPF duplicado (modo criação)
  const handleCPFBlur = async (cpf: string) => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      setCpfDuplicateError(null);
      return;
    }

    try {
      const cleanedCPF = cleanCPF(cpf);
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('cpf', cleanedCPF)
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

  // ✅ Validação onBlur para CPF duplicado (modo edição)
  const handleCPFBlurEdit = async (cpf: string) => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11 || !editingPatient) {
      setCpfDuplicateError(null);
      return;
    }

    try {
      const cleanedCPF = cleanCPF(cpf);
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('cpf', cleanedCPF)
        .neq('id', editingPatient.id) // Exclude current patient
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

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setCpfDuplicateError(null);
    setCpfValidationError('');
    setCpfSuggestion('');
    setFormData({
      full_name: patient.full_name,
      contact_phone: patient.contact_phone,
      cpf: patient.cpf || '',
      birth_date: patient.birth_date || '',
      medical_history_notes: patient.medical_history_notes || ''
    });
    setIsEditDialogOpen(true);
  };
  const openCreateDialog = () => {
    setFormData({
      full_name: '',
      contact_phone: '',
      cpf: '',
      birth_date: '',
      medical_history_notes: ''
    });
    setCpfDuplicateError(null);
    setCpfValidationError('');
    setCpfSuggestion('');
    setIsCreateDialogOpen(true);
  };

  // Auto-open edit dialog when coming from Agenda with patientId
  useEffect(() => {
    if (patientIdFromUrl && patients) {
      const patient = patients.find(p => p.id === patientIdFromUrl);
      if (patient) {
        openEditDialog(patient);
      }
    }
  }, [patientIdFromUrl, patients]);
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gerenciar Pacientes
            </h1>
          </div>

          <Button variant="gradient" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Buscar pacientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>

          {/* Create Patient Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                  <Input id="full_name" value={formData.full_name} onChange={e => setFormData({
                  ...formData,
                  full_name: e.target.value
                })} placeholder="Digite o nome completo" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_phone">Telefone *</Label>
                    <Input 
                      id="contact_phone" 
                      value={formData.contact_phone} 
                      onChange={e => {
                        const formatted = formatPhone(e.target.value);
                        setFormData({ ...formData, contact_phone: formatted });
                      }}
                      onBlur={(e) => handlePhoneBlur(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      value={formData.cpf} 
                      onChange={e => {
                        const masked = formatCPFMask(e.target.value);
                        setFormData({...formData, cpf: masked});
                        setCpfDuplicateError(null);
                        setCpfValidationError('');
                        setCpfSuggestion('');
                      }}
                      onBlur={async (e) => {
                        const cpfValue = e.target.value;
                        // Validação de formato CPF
                        if (cpfValue && !validateCPF(cpfValue)) {
                          const suggestion = suggestCorrectCPF(cpfValue);
                          setCpfValidationError(suggestion 
                            ? `CPF inválido. Você quis dizer ${suggestion}?` 
                            : "CPF inválido");
                          setCpfSuggestion(suggestion || '');
                        } else {
                          setCpfValidationError('');
                          setCpfSuggestion('');
                          // ✅ Validação de CPF duplicado
                          await handleCPFBlur(cpfValue);
                        }
                      }}
                      placeholder="000.000.000-00"
                      error={!!cpfValidationError || !!cpfDuplicateError?.exists}
                      errorMessage={cpfValidationError || (cpfDuplicateError?.exists ? `⚠️ CPF já cadastrado para: ${cpfDuplicateError.patient?.full_name}` : undefined)}
                      maxLength={14}
                    />
                    {cpfSuggestion && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0 text-xs text-primary"
                        onClick={() => {
                          setFormData({...formData, cpf: cpfSuggestion});
                          setCpfValidationError('');
                          setCpfSuggestion('');
                        }}
                      >
                        ✓ Aplicar sugestão: {cpfSuggestion}
                      </Button>
                    )}
                    {cpfDuplicateError?.exists && cpfDuplicateError.patient && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          navigate(`/patient/${cpfDuplicateError.patient.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Paciente Existente
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input id="birth_date" type="date" value={formData.birth_date} onChange={e => setFormData({
                  ...formData,
                  birth_date: e.target.value
                })} />
                </div>
                <div>
                  <Label htmlFor="medical_history_notes">Histórico Médico</Label>
                  <Textarea id="medical_history_notes" value={formData.medical_history_notes} onChange={e => setFormData({
                  ...formData,
                  medical_history_notes: e.target.value
                })} placeholder="Informações relevantes do histórico médico..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePatient} disabled={!formData.full_name || !formData.contact_phone}>
                  Criar Paciente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Patients List */}
          {isLoading ? (
            <div className="border rounded-lg p-8 space-y-4">
              <div className="h-10 w-full bg-muted/60 rounded animate-pulse" />
              {[1, 2, 3, 4, 5].map(index => (
                <div key={index} className="h-16 w-full bg-muted/60 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">Nascimento</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF</TableHead>
                      <TableHead className="hidden xl:table-cell">Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map(patient => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.full_name}</TableCell>
                        <TableCell>
                          <a 
                            href={formatWhatsAppLink(patient.contact_phone)} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            {formatPhone(patient.contact_phone)}
                          </a>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.birth_date 
                            ? (() => {
                                try {
                                  const date = new Date(patient.birth_date);
                                  return !isNaN(date.getTime()) 
                                    ? format(date, 'dd/MM/yyyy', { locale: ptBR })
                                    : '-';
                                } catch {
                                  return '-';
                                }
                              })()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {patient.cpf ? formatCPF(patient.cpf) : '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground">
                          {(() => {
                            try {
                              const date = new Date(patient.created_at);
                              return !isNaN(date.getTime())
                                ? format(date, 'dd/MM/yyyy', { locale: ptBR })
                                : '-';
                            } catch {
                              return '-';
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditDialog(patient)}
                                  className="hover:bg-primary/10 hover:text-primary"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
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
                                      {/* Campos básicos em linha horizontal */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                          <Label htmlFor="edit_name">Nome Completo *</Label>
                                          <Input id="edit_name" value={formData.full_name} onChange={e => setFormData(prev => ({
                                    ...prev,
                                    full_name: e.target.value
                                  }))} placeholder="Digite o nome completo" className="mt-2" />
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
                                            onBlur={(e) => handlePhoneBlurEdit(e.target.value)}
                                            placeholder="(00) 00000-0000" 
                                            className="mt-2"
                                          />
                                          {formData.contact_phone && <div className="flex flex-col gap-2 mt-1">
                                              <a href={formatWhatsAppLink(formData.contact_phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors group">
                                                <MessageCircle className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                                <span className="underline-offset-4 group-hover:underline">
                                                  Abrir no WhatsApp
                                                </span>
                                              </a>
                                              
                                              <a href={formatWhatsAppLink(formData.contact_phone, CONFIRMATION_MESSAGE)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 group">
                                                <CheckCircle2 className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                                <span className="underline-offset-4 group-hover:underline">
                                                  Mensagem de Confirmação
                                                </span>
                                              </a>
                                            </div>}
                                        </div>
                                        <div>
                                          <Label htmlFor="edit_cpf">CPF</Label>
                                          <Input 
                                            id="edit_cpf" 
                                            value={formData.cpf} 
                                            onChange={e => {
                                              const masked = formatCPFMask(e.target.value);
                                              setFormData(prev => ({...prev, cpf: masked}));
                                              setCpfDuplicateError(null);
                                              setCpfValidationError('');
                                              setCpfSuggestion('');
                                            }}
                                            onBlur={async (e) => {
                                              const cpfValue = e.target.value;
                                              // Validação de formato CPF
                                              if (cpfValue && !validateCPF(cpfValue)) {
                                                const suggestion = suggestCorrectCPF(cpfValue);
                                                setCpfValidationError(suggestion 
                                                  ? `CPF inválido. Você quis dizer ${suggestion}?` 
                                                  : "CPF inválido");
                                                setCpfSuggestion(suggestion || '');
                                              } else {
                                                setCpfValidationError('');
                                                setCpfSuggestion('');
                                                // ✅ Validação de CPF duplicado
                                                await handleCPFBlurEdit(cpfValue);
                                              }
                                            }}
                                            placeholder="000.000.000-00" 
                                            className="mt-2"
                                            error={!!cpfValidationError || !!cpfDuplicateError?.exists}
                                            errorMessage={cpfValidationError || (cpfDuplicateError?.exists ? `⚠️ CPF já cadastrado para: ${cpfDuplicateError.patient?.full_name}` : undefined)}
                                            maxLength={14}
                                          />
                                          {cpfSuggestion && (
                                            <Button
                                              type="button"
                                              variant="link"
                                              size="sm"
                                              className="mt-1 h-auto p-0 text-xs text-primary"
                                              onClick={() => {
                                                setFormData(prev => ({...prev, cpf: cpfSuggestion}));
                                                setCpfValidationError('');
                                                setCpfSuggestion('');
                                              }}
                                            >
                                              ✓ Aplicar sugestão: {cpfSuggestion}
                                            </Button>
                                          )}
                                          {cpfDuplicateError?.exists && cpfDuplicateError.patient && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="mt-2"
                                              onClick={() => {
                                                setIsEditDialogOpen(false);
                                                navigate(`/patient/${cpfDuplicateError.patient.id}`);
                                              }}
                                            >
                                              <Eye className="h-4 w-4 mr-2" />
                                              Ver Paciente Existente
                                            </Button>
                                          )}
                                        </div>
                                        <div>
                                          <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                                          <Input id="edit_birth_date" type="date" value={formData.birth_date} onChange={e => setFormData(prev => ({
                                    ...prev,
                                    birth_date: e.target.value
                                  }))} className="mt-2" />
                                        </div>
                                      </div>
                                      
                                      {/* Histórico médico em linha separada, largura total */}
                                      <div>
                                        <Label htmlFor="edit_medical_history">Histórico Médico</Label>
                                        <Textarea id="edit_medical_history" value={formData.medical_history_notes} onChange={e => setFormData(prev => ({
                                    ...prev,
                                    medical_history_notes: e.target.value
                                  }))} placeholder="Informações relevantes do histórico médico..." rows={3} className="mt-2" />
                                      </div>
                                    </TabsContent>

                                    {/* Tab: Documentos do Paciente */}
                                    <TabsContent value="documents" className="space-y-6 mt-6">
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="file-upload">Enviar Documentos</Label>
                                          <div className="flex gap-2 mt-2">
                                            <Input id="file-upload" type="file" multiple onChange={handleFileSelect} ref={fileInputRef} className="flex-1" />
                                            <Button onClick={handleUploadDocuments} disabled={isUploading || !selectedFiles}>
                                              {isUploading ? 'Enviando...' : 'Enviar'}
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        <div className="border rounded-lg p-4">
                                          <h4 className="font-semibold mb-3">Documentos Enviados</h4>
                                          {patientDocuments && patientDocuments.length > 0 ? <div className="space-y-2">
                                              {patientDocuments.map(doc => {
                                        const IconComponent = getFileIcon(doc.mime_type);
                                        return <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                      <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                      <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{doc.file_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                          {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                              locale: ptBR
                                            })}
                                                          {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                      <Button variant="ghost" size="icon" onClick={() => handleViewDocument(doc)} title="Visualizar">
                                                        <Eye className="h-4 w-4" />
                                                      </Button>
                                                      <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)} title="Baixar">
                                                        <Download className="h-4 w-4" />
                                                      </Button>
                                                      <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" title="Excluir">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                          </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
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
                                                    </div>
                                                  </div>;
                                      })}
                                            </div> : <p className="text-sm text-muted-foreground text-center py-8">
                                              Nenhum documento enviado ainda.
                                            </p>}
                                        </div>
                                      </div>
                                    </TabsContent>

                                    {/* Tab: Histórico de Consultas */}
                                    <TabsContent value="history" className="mt-6">
                                      <PatientAppointmentHistory patientId={editingPatient?.id || ''} />
                                    </TabsContent>
                                  </div>

                                  <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t border-border/50">
                                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                      Cancelar
                                    </Button>
                                    <Button onClick={handleEditPatient} disabled={!formData.full_name || !formData.contact_phone}>
                                      Salvar Alterações
                                    </Button>
                                  </DialogFooter>
                                </Tabs>
                              </DialogContent>
                            </Dialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir {patient.full_name}? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePatient(patient.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
            {documentPreviewUrl && viewingDocument && <div className="w-full h-full flex items-center justify-center">
                {isImageFile(viewingDocument.mime_type) ? <img src={documentPreviewUrl} alt={viewingDocument.file_name} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md" /> : viewingDocument.mime_type === 'application/pdf' ? <iframe src={documentPreviewUrl} className="w-full h-[60vh] rounded-lg border" title={viewingDocument.file_name} /> : <div className="text-center space-y-4 p-8">
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
                  </div>}
              </div>}
          </div>
          
          <DialogFooter className="p-6 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={closeDocumentPreview}>
              Fechar
            </Button>
            {viewingDocument && <Button onClick={() => handleDownloadDocument(viewingDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}