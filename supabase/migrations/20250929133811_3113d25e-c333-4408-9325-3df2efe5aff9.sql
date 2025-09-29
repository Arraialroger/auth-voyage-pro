-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-documents', 'medical-documents', false);

-- Create table for patient documents
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for patient_documents table
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view documents
CREATE POLICY "Equipe autenticada pode ver documentos de pacientes" 
ON public.patient_documents 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
  )) OR 
  (EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ))
);

-- Allow authenticated staff to insert documents
CREATE POLICY "Equipe autenticada pode inserir documentos" 
ON public.patient_documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated staff to delete documents
CREATE POLICY "Equipe autenticada pode deletar documentos" 
ON public.patient_documents 
FOR DELETE 
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles 
    WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
  )) OR 
  (EXISTS (
    SELECT 1 FROM professionals 
    WHERE professionals.user_id = auth.uid()
  ))
);

-- Create storage policies for medical-documents bucket
-- Allow authenticated users to view files
CREATE POLICY "Equipe autenticada pode ver documentos médicos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-documents' AND 
  (
    (EXISTS (
      SELECT 1 FROM staff_profiles 
      WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
    )) OR 
    (EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.user_id = auth.uid()
    ))
  )
);

-- Allow authenticated users to upload files
CREATE POLICY "Equipe autenticada pode fazer upload de documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-documents' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files
CREATE POLICY "Equipe autenticada pode deletar documentos médicos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'medical-documents' AND 
  (
    (EXISTS (
      SELECT 1 FROM staff_profiles 
      WHERE staff_profiles.user_id = auth.uid() AND staff_profiles.role = 'receptionist'
    )) OR 
    (EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.user_id = auth.uid()
    ))
  )
);