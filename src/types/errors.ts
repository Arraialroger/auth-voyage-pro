/**
 * Type guard to check if error is a PostgreSQL error with code
 */
export interface PostgresError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

/**
 * Type guard to check if error is a Supabase error with specific structure
 */
export interface SupabaseError {
  statusCode?: number;
  message: string;
  errors?: Array<{ message: string }>;
}

/**
 * Type guard functions
 */
export function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PostgresError).code === 'string'
  );
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as SupabaseError).message === 'string'
  );
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isSupabaseError(error)) {
    return error.message;
  }
  
  if (isPostgresError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
}
