import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ValidationResult {
  isValid: boolean;
  patientName?: string;
  professionalName?: string;
  createdAt?: string;
  documentType?: string;
}

const ValidateDocument = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const hash = searchParams.get("hash");
  const type = searchParams.get("type");

  useEffect(() => {
    const validateDocument = async () => {
      if (!hash || !type) {
        setResult({ isValid: false });
        setLoading(false);
        return;
      }

      try {
        if (type === "prescription") {
          const { data, error } = await supabase
            .from("prescriptions")
            .select(`
              signature_hash,
              created_at,
              prescription_type,
              patients!inner(full_name),
              professionals!inner(full_name)
            `)
            .eq("signature_hash", hash)
            .maybeSingle();

          if (error) throw error;

          if (data && data.signature_hash === hash) {
            setResult({
              isValid: true,
              patientName: data.patients.full_name,
              professionalName: data.professionals.full_name,
              createdAt: data.created_at,
              documentType: `Receita ${
                data.prescription_type === "simple"
                  ? "Simples"
                  : data.prescription_type === "controlled"
                  ? "de Controle Especial"
                  : "Especial"
              }`,
            });
          } else {
            setResult({ isValid: false });
          }
        } else if (type === "certificate") {
          const { data, error } = await supabase
            .from("medical_certificates")
            .select(`
              signature_hash,
              created_at,
              certificate_type,
              patients!inner(full_name),
              professionals!inner(full_name)
            `)
            .eq("signature_hash", hash)
            .maybeSingle();

          if (error) throw error;

          if (data && data.signature_hash === hash) {
            setResult({
              isValid: true,
              patientName: data.patients.full_name,
              professionalName: data.professionals.full_name,
              createdAt: data.created_at,
              documentType: `Atestado de ${
                data.certificate_type === "attendance"
                  ? "Comparecimento"
                  : data.certificate_type === "medical_leave"
                  ? "Afastamento"
                  : "Aptidão Física"
              }`,
            });
          } else {
            setResult({ isValid: false });
          }
        } else {
          setResult({ isValid: false });
        }
      } catch (error) {
        console.error("Validation error:", error);
        setResult({ isValid: false });
      } finally {
        setLoading(false);
      }
    };

    validateDocument();
  }, [hash, type]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Validando documento...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/arraial-odonto-logo.png"
              alt="Arraial Odonto"
              className="h-16 w-auto"
              onError={(e) => {
                e.currentTarget.src = "/assets/new-arraial-odonto-logo.png";
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Validação de Documento Digital</CardTitle>
          </div>
          <CardDescription className="text-base">
            Sistema de verificação de autenticidade de documentos médicos
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {result?.isValid ? (
            <>
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <AlertDescription className="ml-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-sm font-semibold">
                      DOCUMENTO AUTÊNTICO
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4 bg-muted/30 p-6 rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  Informações do Documento
                </h3>

                <div className="grid gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border pb-2">
                    <span className="font-medium text-muted-foreground min-w-[140px]">
                      Tipo:
                    </span>
                    <span className="text-foreground">{result.documentType}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border pb-2">
                    <span className="font-medium text-muted-foreground min-w-[140px]">
                      Paciente:
                    </span>
                    <span className="text-foreground">{result.patientName}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border pb-2">
                    <span className="font-medium text-muted-foreground min-w-[140px]">
                      Profissional:
                    </span>
                    <span className="text-foreground">{result.professionalName}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-medium text-muted-foreground min-w-[140px]">
                      Data de Emissão:
                    </span>
                    <span className="text-foreground">
                      {result.createdAt &&
                        format(new Date(result.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                    </span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm text-muted-foreground">
                  Este documento foi gerado digitalmente e possui assinatura digital válida.
                  A autenticidade foi verificada em{" "}
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <Alert variant="destructive" className="border-destructive bg-destructive/10">
                <XCircle className="h-5 w-5" />
                <AlertDescription className="ml-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-sm font-semibold">
                      DOCUMENTO INVÁLIDO
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-4 bg-muted/30 p-6 rounded-lg">
                <h3 className="font-semibold text-lg text-destructive">
                  Documento não encontrado ou inválido
                </h3>
                <p className="text-sm text-muted-foreground">
                  O código de verificação fornecido não corresponde a nenhum documento em nosso
                  sistema, ou o documento pode ter sido adulterado.
                </p>
                <p className="text-sm text-muted-foreground">
                  Possíveis razões:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                  <li>Link de validação incorreto ou incompleto</li>
                  <li>Documento falsificado ou alterado</li>
                  <li>QR Code danificado ou ilegível</li>
                </ul>
              </div>

              <Alert>
                <AlertDescription className="text-sm text-muted-foreground">
                  Em caso de dúvidas, entre em contato diretamente com a clínica para verificar a
                  autenticidade deste documento.
                </AlertDescription>
              </Alert>
            </>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Sistema de validação digital desenvolvido por Arraial Odonto
              <br />
              {format(new Date(), "yyyy")} © Todos os direitos reservados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidateDocument;
