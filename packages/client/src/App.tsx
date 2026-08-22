import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { AdminUserManagementModal } from './components/admin/AdminUserManagementModal';
import { AuthorUser, subscribeAuthState } from './services/firebase';

const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const StudioEditor = React.lazy(() => import('./components/studio/StudioEditor').then(m => ({ default: m.StudioEditor })));
const PublicTourPlayer = React.lazy(() => import('./components/player/PublicTourPlayer').then(m => ({ default: m.PublicTourPlayer })));
const PublicLandingPage = React.lazy(() => import('./pages/PublicLandingPage').then(m => ({ default: m.PublicLandingPage })));
const AdminAuthPage = React.lazy(() => import('./pages/AdminAuthPage').then(m => ({ default: m.AdminAuthPage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));

const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
  </div>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthorUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  useEffect(() => {
    let initialLoad = true;
    const unsub = subscribeAuthState((u) => {
      setUser(u);
      if (initialLoad) {
        initialLoad = false;
        // Small delay to ensure Firebase has actually initialized
        setTimeout(() => setAuthLoading(false), 300);
      }
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return <LoadingFallback />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ================= 1. Public Landing Page (Showcase of Published Demos) ================= */}
          <Route path="/" element={<PublicLandingPage />} />

          {/* ================= 2. Public Player Routes (Root Vanity Slug & Legacy /view/) ================= */}
          <Route path="/view/:demoId" element={<PublicTourPlayer />} />

          {/* ================= 3. Admin & Creator Authentication Page ================= */}
          <Route
            path="/admin/login"
            element={<AdminAuthPage onSuccess={(u) => setUser(u)} />}
          />

          {/* ================= 4. Protected Visual Studio Editor ================= */}
          <Route
            path="/admin/editor/:demoId"
            element={
              <AdminProtectedRoute user={user}>
                <div className="min-h-screen bg-slate-100 text-slate-900">
                  <StudioEditor />
                  <AdminUserManagementModal
                    isOpen={isUserManagementModalOpen}
                    onClose={() => setIsUserManagementModalOpen(false)}
                  />
                </div>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/studio/:demoId"
            element={<Navigate to="/admin/editor/:demoId" replace />}
          />
          <Route
            path="/studio/:demoId"
            element={<Navigate to="/admin/editor/:demoId" replace />}
          />

          {/* ================= 5. Protected Admin / Creator Workspace Dashboard ================= */}
          <Route
            path="/admin/*"
            element={
              <AdminProtectedRoute user={user}>
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
                  <Navbar
                    user={user}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
                  />
                  <main className="flex-1">
                    <Dashboard
                      user={user}
                      onOpenAuth={() => setIsAuthModalOpen(true)}
                    />
                  </main>

                  <AdminUserManagementModal
                    isOpen={isUserManagementModalOpen}
                    onClose={() => setIsUserManagementModalOpen(false)}
                  />
                </div>
              </AdminProtectedRoute>
            }
          />

          {/* ================= 6. Legal & Policy Pages ================= */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* ================= 7. Clean Root Slug Route (e.g. /my-guide-slug) ================= */}
          <Route path="/:demoId" element={<PublicTourPlayer />} />

          {/* Fallback to Public Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
