import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDigitalSignature, generateQRCodeDataURL, formatDateFull, formatCPF } from './pdfHelpers';

interface CertificateData {
  id: string;
  certificate_type: 'attendance' | 'medical_leave' | 'fitness';
  reason: string;
  start_date: string;
  end_date: string | null;
  days_count: number | null;
  cid_10_code: string | null;
  additional_notes: string | null;
  created_at: string;
  professional: {
    full_name: string;
    specialization: string;
    professional_registry: string | null;
    registry_uf: string | null;
    clinic_name: string | null;
    clinic_address: string | null;
    clinic_phone: string | null;
    clinic_cnpj: string | null;
  };
  patient: {
    full_name: string;
    cpf: string | null;
  };
}

export const generateCertificatePDF = async (certificate: CertificateData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 15;

  // Add logo
  try {
    const logoPath = '/assets/arraial-odonto-logo.png';
    const img = new Image();
    img.src = logoPath;
    
    await new Promise((resolve) => {
      img.onload = () => {
        doc.addImage(img, 'PNG', 15, yPosition, 40, 20);
        resolve(true);
      };
      img.onerror = () => resolve(false);
    });
  } catch (error) {
    // Continue without logo
  }

  yPosition = 45;

  // Title based on type
  let title = '';
  switch (certificate.certificate_type) {
    case 'attendance':
      title = 'ATESTADO DE COMPARECIMENTO';
      break;
    case 'medical_leave':
      title = 'ATESTADO MÉDICO DE AFASTAMENTO';
      break;
    case 'fitness':
      title = 'ATESTADO DE APTIDÃO FÍSICA';
      break;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 25;

  // Clinic info header (if available)
  if (certificate.professional.clinic_name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(certificate.professional.clinic_name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    
    if (certificate.professional.clinic_address) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(certificate.professional.clinic_address, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    }
    
    if (certificate.professional.clinic_phone) {
      doc.text(`Tel: ${certificate.professional.clinic_phone}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    }
    
    if (certificate.professional.clinic_cnpj) {
      doc.text(`CNPJ: ${certificate.professional.clinic_cnpj}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
  }

  yPosition += 10;

  // Certificate body text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  let bodyText = '';
  const patientName = certificate.patient.full_name;
  const cpfText = certificate.patient.cpf ? `, CPF: ${formatCPF(certificate.patient.cpf)}` : '';
  
  switch (certificate.certificate_type) {
    case 'attendance': {
      const startTime = format(new Date(certificate.start_date), 'HH:mm');
      const endTime = certificate.end_date ? format(new Date(certificate.end_date), 'HH:mm') : startTime;
      const dateText = formatDateFull(new Date(certificate.start_date));
      
      bodyText = `Atesto para os devidos fins que o(a) Sr(a). ${patientName}${cpfText}, esteve em consulta médica nesta data (${dateText}) no horário de ${startTime} às ${endTime} para ${certificate.reason}.`;
      break;
    }
    
    case 'medical_leave': {
      const startDateText = format(new Date(certificate.start_date), 'dd/MM/yyyy');
      const endDateText = certificate.end_date ? format(new Date(certificate.end_date), 'dd/MM/yyyy') : startDateText;
      const daysText = certificate.days_count ? `${certificate.days_count} ${certificate.days_count === 1 ? 'dia' : 'dias'}` : 'período determinado';
      
      bodyText = `Atesto que o(a) paciente ${patientName}${cpfText}, necessita afastar-se de suas atividades pelo período de ${daysText}, do dia ${startDateText} ao dia ${endDateText}, devido a ${certificate.reason}.`;
      
      if (certificate.cid_10_code) {
        bodyText += `\n\nCID-10: ${certificate.cid_10_code}`;
      }
      break;
    }
    
    case 'fitness': {
      bodyText = `Atesto que o(a) paciente ${patientName}${cpfText}, encontra-se APTO(A) para a prática de ${certificate.reason}.`;
      break;
    }
  }

  const bodyLines = doc.splitTextToSize(bodyText, 170);
  doc.text(bodyLines, pageWidth / 2, yPosition, { align: 'justify', maxWidth: 170 });
  yPosition += (bodyLines.length * 6) + 10;

  // Additional notes
  if (certificate.additional_notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Observações:', 20, yPosition);
    yPosition += 6;
    
    const notesLines = doc.splitTextToSize(certificate.additional_notes, 170);
    doc.text(notesLines, 20, yPosition);
    yPosition += (notesLines.length * 5) + 10;
  }

  // Location and date
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const locationDate = `Arraial do Cabo, ${formatDateFull(new Date(certificate.created_at))}.`;
  doc.text(locationDate, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 25;

  // Professional signature section
  doc.setDrawColor(0);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text(certificate.professional.full_name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(certificate.professional.specialization, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  if (certificate.professional.professional_registry && certificate.professional.registry_uf) {
    const registryType = certificate.professional.specialization.includes('Dentista') || certificate.professional.specialization.includes('Ortodontista') ? 'CRO' : 'CRM';
    doc.text(`${registryType}: ${certificate.professional.professional_registry} - ${certificate.professional.registry_uf}`, pageWidth / 2, yPosition, { align: 'center' });
  }

  // Digital signature
  const signatureData = await generateDigitalSignature({
    id: certificate.id,
    patient_name: certificate.patient.full_name,
    professional_name: certificate.professional.full_name,
    created_at: certificate.created_at,
    type: certificate.certificate_type,
  });

  const qrCodeUrl = await generateQRCodeDataURL(
    `${window.location.origin}/validate?hash=${signatureData}&type=certificate`
  );

  // QR Code and hash
  yPosition += 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DIGITAL:', 20, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Hash SHA-256:', 20, yPosition);
  yPosition += 4;
  
  // Quebrar hash em múltiplas linhas (32 caracteres por linha)
  const hashLine1 = signatureData.substring(0, 32);
  const hashLine2 = signatureData.substring(32, 64);
  doc.setFont('helvetica', 'italic');
  doc.text(hashLine1, 20, yPosition);
  yPosition += 3;
  doc.text(hashLine2, 20, yPosition);
  
  doc.addImage(qrCodeUrl, 'PNG', pageWidth - 40, yPosition - 20, 25, 25);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Escaneie para', pageWidth - 37, yPosition + 8);
  doc.text('validar documento', pageWidth - 37, yPosition + 11);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento gerado eletronicamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  // Save PDF
  const fileName = `Atestado_${certificate.certificate_type}_${certificate.patient.full_name.replace(/\s+/g, '_')}_${format(new Date(certificate.created_at), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
  
  return signatureData;
};
