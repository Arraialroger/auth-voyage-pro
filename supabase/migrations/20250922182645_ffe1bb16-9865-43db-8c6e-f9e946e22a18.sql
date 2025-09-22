-- Update RLS policies for professionals table to allow CRUD operations

-- Allow authenticated users to insert professionals
CREATE POLICY "Usuários autenticados podem criar profissionais" 
ON public.professionals 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update professionals
CREATE POLICY "Usuários autenticados podem editar profissionais" 
ON public.professionals 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete professionals
CREATE POLICY "Usuários autenticados podem deletar profissionais" 
ON public.professionals 
FOR DELETE 
USING (auth.role() = 'authenticated');