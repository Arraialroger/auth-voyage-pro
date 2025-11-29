import { cn } from "@/lib/utils";

interface ToothFaceSelectorProps {
  selectedFaces: string[];
  onFaceToggle: (face: string) => void;
  toothNumber: number;
}

const faceLabels: Record<string, string> = {
  oclusal: "O",
  mesial: "M",
  distal: "D",
  vestibular: "V",
  lingual: "L",
};

const faceFullLabels: Record<string, string> = {
  oclusal: "Oclusal",
  mesial: "Mesial",
  distal: "Distal",
  vestibular: "Vestibular",
  lingual: "Lingual/Palatina",
};

export const ToothFaceSelector = ({
  selectedFaces,
  onFaceToggle,
  toothNumber,
}: ToothFaceSelectorProps) => {
  // Determinar se é quadrante esquerdo (dentes 21-28 e 31-38)
  // Para quadrante esquerdo, mesial fica à direita e distal à esquerda
  const isLeftQuadrant = toothNumber >= 21 && toothNumber <= 28 || toothNumber >= 31 && toothNumber <= 38;
  
  const leftFace = isLeftQuadrant ? "distal" : "mesial";
  const rightFace = isLeftQuadrant ? "mesial" : "distal";

  const getFaceStyle = (face: string) => {
    const isSelected = selectedFaces.includes(face);
    return cn(
      "absolute transition-all duration-200 flex items-center justify-center font-bold text-xs cursor-pointer border-2",
      isSelected
        ? "bg-primary text-primary-foreground border-primary shadow-md"
        : "bg-muted hover:bg-muted/80 text-muted-foreground border-border hover:border-primary/50"
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Diagrama visual do dente */}
      <div className="relative w-32 h-32">
        {/* Vestibular - Topo */}
        <button
          type="button"
          onClick={() => onFaceToggle("vestibular")}
          className={cn(
            getFaceStyle("vestibular"),
            "top-0 left-1/2 -translate-x-1/2 w-16 h-8 rounded-t-lg"
          )}
          title={faceFullLabels.vestibular}
        >
          V
        </button>

        {/* Face Esquerda (Mesial ou Distal dependendo do quadrante) */}
        <button
          type="button"
          onClick={() => onFaceToggle(leftFace)}
          className={cn(
            getFaceStyle(leftFace),
            "left-0 top-1/2 -translate-y-1/2 w-8 h-16 rounded-l-lg"
          )}
          title={faceFullLabels[leftFace]}
        >
          {faceLabels[leftFace]}
        </button>

        {/* Oclusal - Centro */}
        <button
          type="button"
          onClick={() => onFaceToggle("oclusal")}
          className={cn(
            getFaceStyle("oclusal"),
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-md z-10"
          )}
          title={faceFullLabels.oclusal}
        >
          O
        </button>

        {/* Face Direita (Distal ou Mesial dependendo do quadrante) */}
        <button
          type="button"
          onClick={() => onFaceToggle(rightFace)}
          className={cn(
            getFaceStyle(rightFace),
            "right-0 top-1/2 -translate-y-1/2 w-8 h-16 rounded-r-lg"
          )}
          title={faceFullLabels[rightFace]}
        >
          {faceLabels[rightFace]}
        </button>

        {/* Lingual - Base */}
        <button
          type="button"
          onClick={() => onFaceToggle("lingual")}
          className={cn(
            getFaceStyle("lingual"),
            "bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 rounded-b-lg"
          )}
          title={faceFullLabels.lingual}
        >
          L
        </button>
      </div>

      {/* Legenda das faces selecionadas */}
      {selectedFaces.length > 0 ? (
        <p className="text-xs text-muted-foreground text-center">
          {selectedFaces.map((f) => faceFullLabels[f]).join(", ")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Clique nas faces afetadas
        </p>
      )}

      {/* Indicador de quadrante */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        {isLeftQuadrant ? "← Distal | Mesial →" : "← Mesial | Distal →"}
      </p>
    </div>
  );
};
