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

/**
 * Apply CPF mask while typing
 */
export const formatCPFMask = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length <= 3) {
    return cleanValue;
  } else if (cleanValue.length <= 6) {
    return cleanValue.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  } else if (cleanValue.length <= 9) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  } else {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  }
};

/**
 * Calculate correct CPF check digits and suggest the correct CPF
 */
export const suggestCorrectCPF = (cpf: string): string | null => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Must have at least 9 digits to calculate check digits
  if (cleanCPF.length < 9) return null;
  
  const first9 = cleanCPF.substring(0, 9);
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(first9.substring(i - 1, i)) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  const digit1 = remainder;
  
  // Calculate second check digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt((first9 + digit1).substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  const digit2 = remainder;
  
  const correctCPF = first9 + digit1 + digit2;
  return formatCPF(correctCPF);
};

/**
 * Remove all non-digit characters from phone
 * Used before saving to database
 */
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Remove all non-digit characters from CPF
 * Used before saving to database
 */
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};
