-- Corrigir função run_sql para incluir search_path
CREATE OR REPLACE FUNCTION public.run_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT to_json(t) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
END;
$function$;