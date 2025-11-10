import { cn } from "@/lib/utils";

interface ToothSVGProps {
  toothNumber: number;
  status: string;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  higido: "fill-background stroke-foreground",
  cariado: "fill-destructive stroke-destructive-foreground",
  obturado: "fill-primary stroke-primary-foreground",
  extraido: "fill-muted stroke-muted-foreground opacity-50",
  tratamento_canal: "fill-accent stroke-accent-foreground",
  coroa: "fill-secondary stroke-secondary-foreground",
  implante: "fill-chart-1 stroke-foreground",
  ausente: "fill-muted/20 stroke-muted-foreground opacity-30",
  fratura: "fill-destructive/70 stroke-destructive",
};

export const ToothSVG = ({ toothNumber, status, isSelected, onClick }: ToothSVGProps) => {
  const isPosterior = toothNumber % 10 >= 4 && toothNumber % 10 <= 8;
  
  return (
    <div 
      className={cn(
        "relative cursor-pointer transition-all hover:scale-110",
        isSelected && "ring-2 ring-primary rounded-lg"
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
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-foreground">
        {toothNumber}
      </span>
    </div>
  );
};
