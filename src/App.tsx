import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy loading para páginas principais
const Agenda = lazy(() => import("./pages/Agenda"));
const Administration = lazy(() => import("./pages/Administration"));
const ManagePatients = lazy(() => import("./pages/ManagePatients"));
const ManageProfessionals = lazy(() => import("./pages/ManageProfessionals"));
const ManageTreatments = lazy(() => import("./pages/ManageTreatments"));
const ManageWaitingList = lazy(() => import("./pages/ManageWaitingList"));
const Financial = lazy(() => import("./pages/Financial"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));

// Componente de loading para Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-background p-8">
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <ManageWaitingList />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/financial" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['receptionist']}>
                  <Financial />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
         </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
