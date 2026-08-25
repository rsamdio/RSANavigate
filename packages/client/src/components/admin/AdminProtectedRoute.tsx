import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Clock, LogOut, Compass, ArrowLeft } from 'lucide-react';
import { AuthorUser, logoutAuthor } from '../../services/firebase';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface AdminProtectedRouteProps {
  user: AuthorUser | null;
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ user, children }) => {
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  if (!user) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${target}`} replace />;
  }

  const isAuthorized = user.role === 'super_admin' || user.role === 'creator';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-extrabold text-slate-900">Access Denied</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account (<strong className="text-slate-900">{user.email}</strong>) does not have permission to access the NAVIGATE Studio. Access is restricted to authorized creators.
          </p>

          <div className="pt-4 flex flex-col gap-2">
            <Link
              to="/"
              className="w-full py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Guides</span>
            </Link>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Double Confirmation Logout Modal */}
        <LogoutConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={async () => {
            await logoutAuthor();
          }}
          userEmail={user.email}
          displayName={user.displayName}
        />
      </div>
    );
  }

  return <>{children}</>;
};
