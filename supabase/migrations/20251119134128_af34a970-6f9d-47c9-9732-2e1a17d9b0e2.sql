-- Remove unique constraint on contact_phone to allow shared phone numbers
-- This is necessary for families sharing the same contact number
ALTER TABLE public.patients 
DROP CONSTRAINT IF EXISTS patients_contact_phone_key;

-- Create non-unique index for search performance
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone 
ON public.patients(contact_phone);