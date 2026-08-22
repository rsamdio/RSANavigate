import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  User as UserIcon,
  LogOut,
  Users
} from 'lucide-react';
import { AuthorUser, logoutAuthor } from '../../services/firebase';

interface NavbarProps {
  user: AuthorUser | null;
  onOpenAuth: () => void;
  onOpenUserManagement?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenUserManagement
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex items-center gap-6">
        <Link to="/admin" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] p-0.5 shadow-md shadow-blue-900/15 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-[#0c3c60]">
              NAVIGATE Studio
            </span>
            <img src="/rsamdio.webp" alt="RSA MDIO" className="h-5 w-auto object-contain opacity-90 hidden sm:inline-block" />
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Super Admin Creator Management Button */}
        {isSuperAdmin && onOpenUserManagement && (
          <button
            onClick={onOpenUserManagement}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0c3c60] text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Manage Workspace Creators"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Creators</span>
          </button>
        )}

        {/* User Account / Auth */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#0c3c60] flex items-center justify-center text-xs font-bold text-white">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-left">
                <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                {isSuperAdmin && (
                  <span className="text-[9px] uppercase font-extrabold text-[#0c3c60] bg-blue-100/90 px-1.5 py-0.5 rounded border border-blue-200">
                    Admin
                  </span>
                )}
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Signed in as</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
                </div>
                <Link
                  to="/"
                  onClick={() => setUserDropdownOpen(false)}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Public Showcase</span>
                </Link>
                {isSuperAdmin && onOpenUserManagement && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenUserManagement();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Manage Creators</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    await logoutAuthor();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
