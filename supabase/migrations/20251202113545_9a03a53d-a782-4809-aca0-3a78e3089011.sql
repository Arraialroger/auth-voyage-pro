-- Remover tabela time_blocks e enum block_type_enum
DROP TABLE IF EXISTS public.time_blocks;
DROP TYPE IF EXISTS public.block_type_enum;

-- Remover registros especiais de bloqueio (se existirem)
DELETE FROM public.treatments WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM public.patients WHERE id = '00000000-0000-0000-0000-000000000001';