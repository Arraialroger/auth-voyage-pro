import { cn } from "@/lib/utils";

interface ToothSVGProps {
  toothNumber: number;
  status: string;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  higido: "fill-white stroke-gray-800",
  cariado: "fill-red-600 stroke-red-800",
  obturado: "fill-blue-400 stroke-blue-600",
  extraido: "fill-gray-400 stroke-gray-600 opacity-70",
  tratamento_canal: "fill-purple-500 stroke-purple-700",
  coroa: "fill-yellow-400 stroke-yellow-600",
  implante: "fill-orange-500 stroke-orange-700",
  ausente: "fill-gray-200 stroke-gray-400 opacity-50",
  fratura: "fill-gray-800 stroke-black",
};

export const ToothSVG = ({ toothNumber, status, isSelected, onClick }: ToothSVGProps) => {
  const isPosterior = toothNumber % 10 >= 4 && toothNumber % 10 <= 8;
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-110",
        isSelected && "ring-2 ring-primary rounded-lg p-1"
      )}
      onClick={onClick}
    >
      <svg 
        width="40" 
        height="60" 
        viewBox="0 0 40 60"
        className={cn(
          "transition-all",
          statusColors[status] || statusColors.higido
        )}
      >
        {isPosterior ? (
          // Dente posterior (molar/pré-molar) - forma mais quadrada
          <path d="M 10 10 Q 5 15 5 25 L 5 45 Q 5 55 10 55 L 30 55 Q 35 55 35 45 L 35 25 Q 35 15 30 10 Z" 
                strokeWidth="2" />
        ) : (
          // Dente anterior (incisivo/canino) - forma mais estreita
          <path d="M 15 5 Q 12 10 12 20 L 10 50 Q 10 58 20 58 Q 30 58 30 50 L 28 20 Q 28 10 25 5 Z" 
                strokeWidth="2" />
        )}
      </svg>
      <span className="text-[10px] font-bold text-white bg-gray-800 dark:bg-gray-700 px-1.5 py-0.5 rounded min-w-[20px] text-center">
        {toothNumber}
      </span>
    </div>
  );
};
