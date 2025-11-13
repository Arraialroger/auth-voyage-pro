import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TreatmentPlanItem {
  id: string;
  procedure_description: string;
  tooth_number: number | null;
  estimated_cost: number;
  status: string;
  priority: number;
  notes: string | null;
  treatment?: {
    treatment_name: string;
  };
}

interface TreatmentPlan {
  id: string;
  created_at: string;
  status: string;
  notes: string | null;
  total_cost: number;
  professional: {
    full_name: string;
  };
  items: TreatmentPlanItem[];
}

interface Patient {
  full_name: string;
  contact_phone: string;
  cpf: string | null;
  birth_date: string | null;
}

export const generateTreatmentPlanPDF = async (
  plan: TreatmentPlan,
  patient: Patient
) => {
  const doc = new jsPDF();
  
  // Add logo (if exists in public assets)
  try {
    const logoPath = '/assets/arraial-odonto-logo.png';
    const img = new Image();
    img.src = logoPath;
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        doc.addImage(img, 'PNG', 15, 10, 40, 20);
        resolve(true);
      };
      img.onerror = () => resolve(false); // Continue without logo if error
    });
  } catch (error) {
    // Continue without logo if error
  }

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Plano de Tratamento', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 27, { align: 'center' });

  // Patient Info
  let yPosition = 45;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Paciente', 15, yPosition);
  
  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${patient.full_name}`, 15, yPosition);
  
  yPosition += 5;
  doc.text(`Telefone: ${patient.contact_phone}`, 15, yPosition);
  
  if (patient.cpf) {
    yPosition += 5;
    doc.text(`CPF: ${patient.cpf}`, 15, yPosition);
  }
  
  if (patient.birth_date) {
    yPosition += 5;
    doc.text(`Data de Nascimento: ${format(new Date(patient.birth_date), "dd/MM/yyyy")}`, 15, yPosition);
  }

  // Plan Info
  yPosition += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Plano', 15, yPosition);
  
  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Profissional Responsável: ${plan.professional.full_name}`, 15, yPosition);
  
  yPosition += 5;
  doc.text(`Data de Criação: ${format(new Date(plan.created_at), "dd/MM/yyyy")}`, 15, yPosition);
  
  yPosition += 5;
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    approved: 'Aprovado',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };
  doc.text(`Status: ${statusLabels[plan.status] || plan.status}`, 15, yPosition);
  
  if (plan.notes) {
    yPosition += 5;
    doc.setFont('helvetica', 'italic');
    const splitNotes = doc.splitTextToSize(`Observações: ${plan.notes}`, 180);
    doc.text(splitNotes, 15, yPosition);
    yPosition += (splitNotes.length * 5);
  }

  // Procedures Table
  yPosition += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Procedimentos', 15, yPosition);
  
  yPosition += 5;

  const tableData = plan.items.map((item) => {
    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado'
    };
    
    return [
      item.tooth_number ? `Dente ${item.tooth_number}` : '-',
      item.procedure_description,
      `R$ ${Number(item.estimated_cost).toFixed(2)}`,
      statusLabels[item.status] || item.status,
      item.priority ? `Prioridade ${item.priority}` : '-'
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Dente', 'Procedimento', 'Valor', 'Status', 'Prioridade']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // Total Cost
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Valor Total: R$ ${Number(plan.total_cost).toFixed(2)}`, 15, finalY + 10);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `Plano_Tratamento_${patient.full_name.replace(/\s+/g, '_')}_${format(new Date(plan.created_at), 'ddMMyyyy')}.pdf`;
  doc.save(fileName);
};
