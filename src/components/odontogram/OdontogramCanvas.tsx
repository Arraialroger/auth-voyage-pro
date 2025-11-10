import { useState } from "react";
import { ToothSVG } from "./ToothSVG";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ToothData {
  tooth_number: number;
  status: string;
}

interface OdontogramCanvasProps {
  teeth: ToothData[];
  onToothClick: (toothNumber: number) => void;
  selectedTooth: number | null;
}

// Numeração FDI: Superior direito (11-18), Superior esquerdo (21-28), Inferior esquerdo (31-38), Inferior direito (41-48)
const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];

export const OdontogramCanvas = ({ teeth, onToothClick, selectedTooth }: OdontogramCanvasProps) => {
  const getToothStatus = (toothNumber: number) => {
    const tooth = teeth.find(t => t.tooth_number === toothNumber);
    return tooth?.status || "higido";
  };

  const renderQuadrant = (quadrant: number[]) => (
    <div className="flex gap-1 items-end">
      {quadrant.map(toothNumber => (
        <ToothSVG
          key={toothNumber}
          toothNumber={toothNumber}
          status={getToothStatus(toothNumber)}
          isSelected={selectedTooth === toothNumber}
          onClick={() => onToothClick(toothNumber)}
        />
      ))}
    </div>
  );

  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* Arcada Superior */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Arcada Superior
          </p>
          <div className="flex justify-center gap-4">
            {renderQuadrant(upperRight)}
            <Separator orientation="vertical" className="h-16 mx-2" />
            {renderQuadrant(upperLeft)}
          </div>
        </div>

        <Separator />

        {/* Arcada Inferior */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Arcada Inferior
          </p>
          <div className="flex justify-center gap-4">
            {renderQuadrant(lowerRight)}
            <Separator orientation="vertical" className="h-16 mx-2" />
            {renderQuadrant(lowerLeft)}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-8 pt-4 border-t">
        <p className="text-sm font-semibold mb-3">Legenda:</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-background border-2 border-foreground" />
            <span>Hígido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span>Cariado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>Obturado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-accent" />
            <span>Tratamento Canal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary" />
            <span>Coroa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-1" />
            <span>Implante</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted opacity-50" />
            <span>Extraído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/70" />
            <span>Fratura</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/20 border border-muted-foreground" />
            <span>Ausente</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
