import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import NotFound from "./pages/NotFound";
import Administration from "./pages/Administration";
import ManagePatients from "./pages/ManagePatients";
import ManageProfessionals from "./pages/ManageProfessionals";
import ManageTreatments from "./pages/ManageTreatments";
import ManageWaitingList from "./pages/ManageWaitingList";
import Financial from "./pages/Financial";

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/agenda" element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Administration />
              </ProtectedRoute>
            } />
            <Route path="/admin/patients" element={
              <ProtectedRoute>
                <ManagePatients />
              </ProtectedRoute>
            } />
            <Route path="/admin/professionals" element={
              <ProtectedRoute>
                <ManageProfessionals />
              </ProtectedRoute>
            } />
            <Route path="/admin/treatments" element={
              <ProtectedRoute>
                <ManageTreatments />
              </ProtectedRoute>
            } />
            <Route path="/admin/waiting-list" element={
              <ProtectedRoute>
                <ManageWaitingList />
              </ProtectedRoute>
            } />
            <Route path="/admin/financial" element={
              <ProtectedRoute>
                <Financial />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
         </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
