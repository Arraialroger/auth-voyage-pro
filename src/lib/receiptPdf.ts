import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDigitalSignature, generateQRCodeDataURL, formatCPF } from './pdfHelpers';
import { VALIDATION_BASE_URL } from './constants';
import { Payment, PAYMENT_METHOD_LABELS } from '@/types/payment';

interface ReceiptData {
  payment: Payment;
  patient: {
    full_name: string;
    cpf: string | null;
    contact_phone: string;
  };
  clinic: {
    name: string;
    address: string;
    phone: string;
    cnpj: string;
  };
}

export const generateReceiptPDF = async (data: ReceiptData): Promise<string> => {
  const { payment, patient, clinic } = data;
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

  yPosition += 25;

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Clinic Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ESTABELECIMENTO', 15, yPosition);
  yPosition += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(clinic.name, 15, yPosition);
  yPosition += 5;
  
  if (clinic.address) {
    const addressLines = doc.splitTextToSize(clinic.address, 180);
    doc.text(addressLines, 15, yPosition);
    yPosition += (addressLines.length * 5);
  }
  
  if (clinic.phone) {
    doc.text(`Tel: ${clinic.phone}`, 15, yPosition);
    yPosition += 5;
  }
  
  if (clinic.cnpj) {
    doc.text(`CNPJ: ${clinic.cnpj}`, 15, yPosition);
    yPosition += 5;
  }

  // Patient Info
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PACIENTE', 15, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${patient.full_name}`, 15, yPosition);
  yPosition += 5;
  
  if (patient.cpf) {
    doc.text(`CPF: ${formatCPF(patient.cpf)}`, 15, yPosition);
    yPosition += 5;
  }
  
  doc.text(`Telefone: ${patient.contact_phone}`, 15, yPosition);
  yPosition += 12;

  // Payment Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DETALHES DO PAGAMENTO', 15, yPosition);
  yPosition += 8;

  // Payment date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data do pagamento: ${format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}`, 15, yPosition);
  yPosition += 5;

  // Installment info
  if (payment.total_installments > 1) {
    doc.text(`Parcela: ${payment.installment_number} de ${payment.total_installments}`, 15, yPosition);
    yPosition += 5;
  }

  // Treatment plan
  if (payment.treatment_plan?.title) {
    doc.text(`Plano de Tratamento: ${payment.treatment_plan.title}`, 15, yPosition);
    yPosition += 5;
  }

  yPosition += 5;

  // Payment methods table
  const methodsData = payment.entries?.map((entry) => [
    PAYMENT_METHOD_LABELS[entry.payment_method],
    `R$ ${entry.amount.toFixed(2)}`
  ]) || [];

  if (methodsData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Forma de Pagamento', 'Valor']],
      body: methodsData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  // Totals
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Subtotal
  doc.text(`Subtotal: R$ ${payment.subtotal.toFixed(2)}`, pageWidth - 70, yPosition);
  yPosition += 5;
  
  // Discount
  if (payment.discount_amount > 0) {
    const discountText = payment.discount_type === 'percentage' && payment.discount_value
      ? `Desconto (${payment.discount_value}%): -R$ ${payment.discount_amount.toFixed(2)}`
      : `Desconto: -R$ ${payment.discount_amount.toFixed(2)}`;
    doc.setTextColor(34, 139, 34); // Green color for discount
    doc.text(discountText, pageWidth - 70, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;
  }
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL PAGO: R$ ${payment.total_amount.toFixed(2)}`, pageWidth - 70, yPosition);
  yPosition += 15;

  // Notes
  if (payment.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', 15, yPosition);
    yPosition += 5;
    
    doc.setFont('helvetica', 'italic');
    const notesLines = doc.splitTextToSize(payment.notes, 180);
    doc.text(notesLines, 15, yPosition);
    yPosition += (notesLines.length * 5) + 10;
  }

  // Digital signature
  const signatureData = await generateDigitalSignature({
    id: payment.id,
    patient_name: patient.full_name,
    professional_name: clinic.name,
    created_at: payment.created_at,
    type: 'receipt',
  });

  const qrCodeUrl = await generateQRCodeDataURL(
    `${VALIDATION_BASE_URL}/validate?hash=${signatureData}&type=receipt`
  );

  // Signature section
  yPosition += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DIGITAL:', 15, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Hash SHA-256:', 15, yPosition);
  yPosition += 4;
  
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
  const fileName = `Recibo_${patient.full_name.replace(/\s+/g, '_')}_${format(new Date(payment.payment_date), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
  
  return signatureData;
};
