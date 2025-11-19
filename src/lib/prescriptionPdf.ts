import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDigitalSignature, generateQRCodeDataURL, calculateAge } from './pdfHelpers';

interface PrescriptionItemData {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  item_order: number;
}

interface PrescriptionData {
  id: string;
  prescription_type: 'simple' | 'controlled' | 'special';
  created_at: string;
  general_instructions: string | null;
  professional: {
    full_name: string;
    specialization: string;
    contact_phone: string | null;
    professional_registry: string | null;
    registry_uf: string | null;
    clinic_name: string | null;
    clinic_address: string | null;
    clinic_phone: string | null;
    clinic_cnpj: string | null;
  };
  patient: {
    full_name: string;
    birth_date: string | null;
    contact_phone: string;
  };
  prescription_items: PrescriptionItemData[];
}

export const generatePrescriptionPDF = async (prescription: PrescriptionData) => {
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

  // Tipo-specific header styling
  yPosition = 20;
  if (prescription.prescription_type === 'controlled') {
    // Yellow warning band for controlled prescriptions
    doc.setFillColor(255, 235, 59);
    doc.rect(0, yPosition, pageWidth, 15, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('⚠️ RECEITA DE CONTROLE ESPECIAL', pageWidth / 2, yPosition + 9, { align: 'center' });
    yPosition += 18;
  } else if (prescription.prescription_type === 'special') {
    // Red warning band for special prescriptions
    doc.setFillColor(244, 67, 54);
    doc.rect(0, yPosition, pageWidth, 15, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('⚠️ MEDICAMENTO ESPECIAL', pageWidth / 2, yPosition + 9, { align: 'center' });
    yPosition += 18;
  } else {
    yPosition += 15;
  }

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITUÁRIO MÉDICO', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${format(new Date(prescription.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Professional Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PROFISSIONAL', 15, yPosition);
  yPosition += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Profissional: ${prescription.professional.full_name}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Especialização: ${prescription.professional.specialization}`, 15, yPosition);
  yPosition += 5;
  
  if (prescription.professional.professional_registry && prescription.professional.registry_uf) {
    const registryType = prescription.professional.specialization.includes('Dentista') || prescription.professional.specialization.includes('Ortodontista') ? 'CRO' : 'CRM';
    doc.text(`${registryType}: ${prescription.professional.professional_registry} - ${prescription.professional.registry_uf}`, 15, yPosition);
    yPosition += 5;
  }
  
  if (prescription.professional.contact_phone) {
    doc.text(`Telefone: ${prescription.professional.contact_phone}`, 15, yPosition);
    yPosition += 5;
  }

  // Clinic Info
  if (prescription.professional.clinic_name) {
    yPosition += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA CLÍNICA', 15, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(prescription.professional.clinic_name, 15, yPosition);
    yPosition += 5;
    
    if (prescription.professional.clinic_address) {
      const addressLines = doc.splitTextToSize(prescription.professional.clinic_address, 180);
      doc.text(addressLines, 15, yPosition);
      yPosition += (addressLines.length * 5);
    }
    
    if (prescription.professional.clinic_phone) {
      doc.text(`Tel: ${prescription.professional.clinic_phone}`, 15, yPosition);
      yPosition += 5;
    }
    
    if (prescription.professional.clinic_cnpj) {
      doc.text(`CNPJ: ${prescription.professional.clinic_cnpj}`, 15, yPosition);
      yPosition += 5;
    }
  }

  // Patient Info
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PACIENTE', 15, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${prescription.patient.full_name}`, 15, yPosition);
  yPosition += 5;
  
  if (prescription.patient.birth_date) {
    const age = calculateAge(prescription.patient.birth_date);
    doc.text(`Data de Nascimento: ${format(new Date(prescription.patient.birth_date), 'dd/MM/yyyy')} (${age} anos)`, 15, yPosition);
    yPosition += 5;
  }
  
  doc.text(`Telefone: ${prescription.patient.contact_phone}`, 15, yPosition);
  yPosition += 10;

  // Prescription table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PRESCRIÇÃO', 15, yPosition);
  yPosition += 5;

  const tableData = prescription.prescription_items
    .sort((a, b) => a.item_order - b.item_order)
    .map((item) => [
      item.medication_name,
      item.dosage,
      item.frequency,
      item.duration,
      item.instructions || '-'
    ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Medicamento', 'Dosagem', 'Frequência', 'Duração', 'Instruções']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 55 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // General instructions
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 10;
  yPosition = finalY + 10;
  
  if (prescription.general_instructions) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUÇÕES GERAIS:', 15, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const instructionsLines = doc.splitTextToSize(prescription.general_instructions, 180);
    doc.text(instructionsLines, 15, yPosition);
    yPosition += (instructionsLines.length * 5) + 5;
  }

  // Digital signature
  const signatureData = await generateDigitalSignature({
    id: prescription.id,
    patient_name: prescription.patient.full_name,
    professional_name: prescription.professional.full_name,
    created_at: prescription.created_at,
    type: prescription.prescription_type,
  });

  const qrCodeUrl = await generateQRCodeDataURL(
    `${window.location.origin}/validate?hash=${signatureData}&type=prescription`
  );

  // Signature section
  yPosition += 10;
  doc.setDrawColor(0);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DIGITAL:', 15, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Hash SHA-256:', 15, yPosition);
  yPosition += 4;
  
  // Quebrar hash em múltiplas linhas (32 caracteres por linha)
  const hashLine1 = signatureData.substring(0, 32);
  const hashLine2 = signatureData.substring(32, 64);
  doc.setFont('helvetica', 'italic');
  doc.text(hashLine1, 15, yPosition);
  yPosition += 3;
  doc.text(hashLine2, 15, yPosition);
  
  // QR Code
  doc.addImage(qrCodeUrl, 'PNG', pageWidth - 35, yPosition - 25, 25, 25);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Escaneie para validar', pageWidth - 32, yPosition + 3);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount} | Documento gerado eletronicamente em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `Receita_${prescription.patient.full_name.replace(/\s+/g, '_')}_${format(new Date(prescription.created_at), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
  
  return signatureData;
};
