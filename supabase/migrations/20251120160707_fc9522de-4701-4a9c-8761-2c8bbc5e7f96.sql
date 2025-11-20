-- Remove registros órfãos de staff_profiles onde user_id é NULL
-- Esses registros causam erro na edge function list-receptionists
DELETE FROM staff_profiles 
WHERE role = 'receptionist' 
  AND user_id IS NULL;