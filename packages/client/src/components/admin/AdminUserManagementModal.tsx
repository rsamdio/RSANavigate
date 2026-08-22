import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  UserPlus,
  Trash2,
  Users,
  Check,
  Copy,
  RefreshCw,
  Key,
  Search,
  Lock,
  AlertTriangle
} from 'lucide-react';
import {
  AuthorUser,
  UserRole,
  fetchUsersFromFirestore,
  callSetUserRole,
  deleteUserFromFirestore
} from '../../services/firebase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const [users, setUsers] = useState<AuthorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New user form state
  const [inputIdentifier, setInputIdentifier] = useState('');
  const [inputRole, setInputRole] = useState<UserRole>('creator');
  const [inputName, setInputName] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Revoke confirmation state
  const [userToRevoke, setUserToRevoke] = useState<AuthorUser | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchUsersFromFirestore();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleRoleChange = async (targetUid: string, newRole: UserRole, email?: string | null, displayName?: string | null) => {
    setUpdatingUid(targetUid);
    try {
      const success = await callSetUserRole(targetUid, newRole, email || undefined, displayName || undefined);
      if (success) {
        setUsers((prev) =>
          prev.map((u) => (u.uid === targetUid ? { ...u, role: newRole } : u))
        );
        setActionFeedback(`Updated role to ${newRole === 'super_admin' ? 'Super Admin' : 'Creator'}`);
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        setActionFeedback('Failed to update role');
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setActionFeedback('Role update failed');
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleAddOrPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputIdentifier.trim().toLowerCase();
    if (!clean) return;

    setLoading(true);
    try {
      const isEmail = clean.includes('@');
      const targetUid = isEmail ? `uid_${clean.replace(/[^a-zA-Z0-9]/g, '_')}` : clean;
      const email = isEmail ? clean : undefined;

      const success = await callSetUserRole(targetUid, inputRole, email, inputName || undefined);
      if (success) {
        setActionFeedback(`Granted ${inputRole === 'super_admin' ? 'Super Admin' : 'Creator'} access to ${clean}`);
        setInputIdentifier('');
        setInputName('');
        await loadUsers();
      } else {
        setActionFeedback('Failed to grant access');
      }
    } catch (err) {
      console.error(err);
      setActionFeedback('Failed to provision user');
    } finally {
      setLoading(false);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const executeRevoke = async () => {
    if (!userToRevoke) return;
    setRevoking(true);
    try {
      const success = await deleteUserFromFirestore(userToRevoke.uid);
      if (success) {
        setUsers((prev) => prev.filter((u) => u.uid !== userToRevoke.uid));
        setActionFeedback(`Access revoked for ${userToRevoke.email || userToRevoke.displayName || userToRevoke.uid}`);
        setUserToRevoke(null);
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        setActionFeedback('Failed to revoke user access');
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setActionFeedback('Error revoking user');
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setRevoking(false);
    }
  };

  const superAdmins = users.filter((u) => u.role === 'super_admin');
  const creators = users.filter((u) => u.role === 'creator');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0c3c60] flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Workspace Creator & Admin Management
              </h3>
              <p className="text-xs text-slate-500">
                Pre-authorize members who can create and manage walkthrough guides
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={loading}
              title="Refresh User List"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 px-6 py-3 bg-slate-100/60 border-b border-slate-200 text-center">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
            <span className="text-xl font-black text-[#0c3c60] block">{superAdmins.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Super Admins</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
            <span className="text-xl font-black text-emerald-700 block">{creators.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authorized Creators</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Feedback banner */}
          {actionFeedback && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-semibold text-[#0c3c60] flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Add / Grant Role Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#0c3c60]" />
              Provision New Creator or Admin Access
            </span>
            <form onSubmit={handleAddOrPromote} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  required
                  value={inputIdentifier}
                  onChange={(e) => setInputIdentifier(e.target.value)}
                  placeholder="Enter email (e.g. member@rotaractsouthasia.org)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-3">
                <CustomSelect
                  value={inputRole}
                  onChange={(val) => setInputRole(val as UserRole)}
                  options={[
                    { value: 'creator', label: 'Creator' },
                    { value: 'super_admin', label: 'Super Admin' }
                  ]}
                  buttonClassName="w-full justify-between"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-full py-2 bg-[#0c3c60] hover:bg-[#092d48] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Grant Access</span>
                </button>
              </div>
            </form>
          </div>

          {/* Search and Member List */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Authorized Workspace Members ({users.length})
              </span>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            {loading && users.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                Loading members...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl">
                {searchQuery ? 'No members matching search query.' : 'No authorized creators configured yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isCurrentUpdating = updatingUid === u.uid;
                  const isCopied = copiedUid === u.uid;
                  const isSuperAdmin = u.role === 'super_admin';

                  return (
                    <div
                      key={u.uid}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0c3c60] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                            {(u.displayName || u.email || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {u.displayName || u.email?.split('@')[0] || 'Authorized Member'}
                            </span>
                            {isSuperAdmin ? (
                              <span className="text-[9px] font-extrabold text-[#0c3c60] bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 uppercase flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Super Admin
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
                                Creator
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span className="truncate max-w-[180px]">{u.email}</span>
                            <span>•</span>
                            <button
                              onClick={() => handleCopyUid(u.uid)}
                              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                              title="Copy UID"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isSuperAdmin ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[#0c3c60] text-xs font-bold">
                            <Shield className="w-3.5 h-3.5 text-[#0c3c60]" />
                            <span>Super Admin</span>
                          </div>
                        ) : (
                          <>
                            <CustomSelect
                              value={u.role || 'creator'}
                              disabled={isCurrentUpdating}
                              onChange={(val) =>
                                handleRoleChange(u.uid, val as UserRole, u.email, u.displayName)
                              }
                              options={[
                                { value: 'creator', label: 'Creator' },
                                { value: 'super_admin', label: 'Promote to Super Admin' }
                              ]}
                            />

                            <button
                              onClick={() => setUserToRevoke(u)}
                              disabled={isCurrentUpdating}
                              title="Revoke Access"
                              className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Changes take effect immediately across all workspace operations.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {userToRevoke && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 leading-tight">Revoke Creator Access</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to revoke access for{' '}
                  <strong className="text-slate-800">{userToRevoke.email || userToRevoke.displayName || userToRevoke.uid}</strong>?
                  They will no longer be able to access the Studio.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToRevoke(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeRevoke}
                disabled={revoking}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {revoking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Revoke</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
