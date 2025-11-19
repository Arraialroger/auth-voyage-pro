import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Generates a SHA-256 digital signature hash for a document
 */
export async function generateDigitalSignature(data: {
  id: string;
  patient_name: string;
  professional_name: string;
  created_at: string;
  type: string;
}): Promise<string> {
  const dataString = JSON.stringify({
    id: data.id,
    patient: data.patient_name,
    professional: data.professional_name,
    created_at: data.created_at,
    type: data.type,
  });
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generates a QR code data URL for document validation
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 100,
    margin: 1,
  });
}

/**
 * Calculates age from birth date
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Formats a date to Brazilian Portuguese full text
 */
export function formatDateFull(date: Date): string {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formats CPF to standard Brazilian format (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  // Remove tudo que não é dígito
  const cleaned = cpf.replace(/\D/g, '');
  
  // Aplica a máscara 000.000.000-00
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  return cpf; // Retorna original se não tiver 11 dígitos
}
