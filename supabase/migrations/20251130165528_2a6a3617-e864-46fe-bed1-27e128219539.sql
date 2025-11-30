-- Rename 'draft' to 'awaiting_payment' in treatment_plan_status_enum
ALTER TYPE treatment_plan_status_enum RENAME VALUE 'draft' TO 'awaiting_payment';