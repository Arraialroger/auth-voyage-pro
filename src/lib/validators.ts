/**
 * Validation utilities for Brazilian data formats
 */

/**
 * Validate Brazilian CPF format
 * Accepts formats: XXX.XXX.XXX-XX or XXXXXXXXXXX
 */
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  // Remove non-digits
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Must have exactly 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate check digits
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

/**
 * Validate Brazilian phone number
 * Accepts formats with or without country code (55)
 * Minimum 10 digits (DDD + number), maximum 13 digits (55 + DDD + 9 digits)
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Must have between 10 and 13 digits
  // 10-11: DDD + number (with or without 9)
  // 12-13: Country code + DDD + number
  if (cleanPhone.length < 10 || cleanPhone.length > 13) return false;
  
  // If starts with 55, must have at least 12 digits
  if (cleanPhone.startsWith('55') && cleanPhone.length < 12) return false;
  
  return true;
};

/**
 * Format CPF for display
 */
export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return cpf;
  
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Format phone for display
 */
export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    // (XX) XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    // (XX) 9XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
    // +55 (XX) XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '+$1 ($2) $3-$4');
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    // +55 (XX) 9XXXX-XXXX
    return cleanPhone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
  }
  
  return phone;
};
