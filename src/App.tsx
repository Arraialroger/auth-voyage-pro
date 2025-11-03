import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Loader2 } from "lucide-react";

// Lazy loading com retry automático para páginas principais
const Agenda = lazyWithRetry(() => import("./pages/Agenda"));
const Administration = lazyWithRetry(() => import("./pages/Administration"));
const ManagePatients = lazyWithRetry(() => import("./pages/ManagePatients"));
const ManageProfessionals = lazyWithRetry(() => import("./pages/ManageProfessionals"));
const ManageTreatments = lazyWithRetry(() => import("./pages/ManageTreatments"));
const ManageWaitingList = lazyWithRetry(() => import("./pages/ManageWaitingList"));
const PatientDetails = lazyWithRetry(() => import("./pages/PatientDetails"));

// Componente de loading aprimorado para Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-8">
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <OfflineIndicator />
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/agenda" element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            } />
            <Route path="/patient/:patientId" element={
              <ProtectedRoute>
                <PatientDetails />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <Administration />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/patients" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <ManagePatients />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/professionals" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <ManageProfessionals />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/treatments" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <ManageTreatments />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/waiting-list" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist', 'professional']}>
                  <ManageWaitingList />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
         </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
