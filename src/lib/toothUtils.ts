// Utilidades para informações dos dentes

export interface ToothInfo {
  number: number;
  name: string;
  quadrant: 'superior-direito' | 'superior-esquerdo' | 'inferior-esquerdo' | 'inferior-direito';
  quadrantLabel: string;
  type: 'incisivo' | 'canino' | 'pre-molar' | 'molar';
  typeLabel: string;
  position: 'superior' | 'inferior';
  side: 'direito' | 'esquerdo';
}

// Mapeamento completo dos dentes permanentes (FDI)
const toothNames: Record<number, { name: string; type: ToothInfo['type'] }> = {
  // Quadrante Superior Direito (11-18)
  11: { name: 'Incisivo Central', type: 'incisivo' },
  12: { name: 'Incisivo Lateral', type: 'incisivo' },
  13: { name: 'Canino', type: 'canino' },
  14: { name: 'Primeiro Pré-Molar', type: 'pre-molar' },
  15: { name: 'Segundo Pré-Molar', type: 'pre-molar' },
  16: { name: 'Primeiro Molar', type: 'molar' },
  17: { name: 'Segundo Molar', type: 'molar' },
  18: { name: 'Terceiro Molar (Siso)', type: 'molar' },
  // Quadrante Superior Esquerdo (21-28)
  21: { name: 'Incisivo Central', type: 'incisivo' },
  22: { name: 'Incisivo Lateral', type: 'incisivo' },
  23: { name: 'Canino', type: 'canino' },
  24: { name: 'Primeiro Pré-Molar', type: 'pre-molar' },
  25: { name: 'Segundo Pré-Molar', type: 'pre-molar' },
  26: { name: 'Primeiro Molar', type: 'molar' },
  27: { name: 'Segundo Molar', type: 'molar' },
  28: { name: 'Terceiro Molar (Siso)', type: 'molar' },
  // Quadrante Inferior Esquerdo (31-38)
  31: { name: 'Incisivo Central', type: 'incisivo' },
  32: { name: 'Incisivo Lateral', type: 'incisivo' },
  33: { name: 'Canino', type: 'canino' },
  34: { name: 'Primeiro Pré-Molar', type: 'pre-molar' },
  35: { name: 'Segundo Pré-Molar', type: 'pre-molar' },
  36: { name: 'Primeiro Molar', type: 'molar' },
  37: { name: 'Segundo Molar', type: 'molar' },
  38: { name: 'Terceiro Molar (Siso)', type: 'molar' },
  // Quadrante Inferior Direito (41-48)
  41: { name: 'Incisivo Central', type: 'incisivo' },
  42: { name: 'Incisivo Lateral', type: 'incisivo' },
  43: { name: 'Canino', type: 'canino' },
  44: { name: 'Primeiro Pré-Molar', type: 'pre-molar' },
  45: { name: 'Segundo Pré-Molar', type: 'pre-molar' },
  46: { name: 'Primeiro Molar', type: 'molar' },
  47: { name: 'Segundo Molar', type: 'molar' },
  48: { name: 'Terceiro Molar (Siso)', type: 'molar' },
};

export const getToothInfo = (toothNumber: number): ToothInfo => {
  const firstDigit = Math.floor(toothNumber / 10);
  const toothData = toothNames[toothNumber] || { name: 'Desconhecido', type: 'molar' as const };

  let quadrant: ToothInfo['quadrant'];
  let quadrantLabel: string;
  let position: ToothInfo['position'];
  let side: ToothInfo['side'];

  switch (firstDigit) {
    case 1:
      quadrant = 'superior-direito';
      quadrantLabel = 'Superior Direito';
      position = 'superior';
      side = 'direito';
      break;
    case 2:
      quadrant = 'superior-esquerdo';
      quadrantLabel = 'Superior Esquerdo';
      position = 'superior';
      side = 'esquerdo';
      break;
    case 3:
      quadrant = 'inferior-esquerdo';
      quadrantLabel = 'Inferior Esquerdo';
      position = 'inferior';
      side = 'esquerdo';
      break;
    case 4:
      quadrant = 'inferior-direito';
      quadrantLabel = 'Inferior Direito';
      position = 'inferior';
      side = 'direito';
      break;
    default:
      quadrant = 'superior-direito';
      quadrantLabel = 'Desconhecido';
      position = 'superior';
      side = 'direito';
  }

  const typeLabels: Record<ToothInfo['type'], string> = {
    incisivo: 'Incisivo',
    canino: 'Canino',
    'pre-molar': 'Pré-Molar',
    molar: 'Molar',
  };

  return {
    number: toothNumber,
    name: toothData.name,
    quadrant,
    quadrantLabel,
    type: toothData.type,
    typeLabel: typeLabels[toothData.type],
    position,
    side,
  };
};

export const getToothFullDescription = (toothNumber: number): string => {
  const info = getToothInfo(toothNumber);
  return `${info.name} ${info.quadrantLabel}`;
};

export const statusLabels: Record<string, string> = {
  higido: 'Hígido',
  cariado: 'Cariado',
  obturado: 'Obturado',
  extraido: 'Extraído',
  tratamento_canal: 'Tratamento de Canal',
  coroa: 'Coroa',
  implante: 'Implante',
  ausente: 'Ausente',
  fratura: 'Fratura',
};

export const getStatusLabel = (status: string): string => {
  return statusLabels[status] || status;
};
