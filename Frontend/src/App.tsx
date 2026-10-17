import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CitrusDiagnostic from './components/Diagnostic';
import ExpertDashboard from './components/ExpertDashboard';
import DashboardView from './components/DashboardView';
import ValidationView from './components/ValidationView';
import VerificationView from "./components/VerificationView";
import SettingsView from './components/Settings';

// Composant pour protéger l'accès aux routes sécurisées
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Page d'accueil / diagnostic public */}
        <Route path="/" element={<CitrusDiagnostic />} />

        {/* --- Routes Espace Expert (sécurisées) --- */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ExpertDashboard onLogout={handleLogout}>
                <DashboardView />
              </ExpertDashboard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/validation"
          element={
            <ProtectedRoute>
              <ExpertDashboard onLogout={handleLogout}>
                <ValidationView />
              </ExpertDashboard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <ExpertDashboard onLogout={handleLogout}>
                <VerificationView />
              </ExpertDashboard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <ExpertDashboard onLogout={handleLogout}>
                <SettingsView />
              </ExpertDashboard>
            </ProtectedRoute>
          }
        />

        {/* Redirection pour toute route inconnue */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}