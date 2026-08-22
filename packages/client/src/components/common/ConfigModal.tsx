import React, { useState } from 'react';
import { X, Cloud, Database, Key, CheckCircle, Save, HelpCircle, ShieldCheck } from 'lucide-react';
import { getFirebaseConfig, saveFirebaseConfig, getR2Config, saveR2Config } from '../../services/configService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<'r2' | 'firebase'>('r2');
  const [r2Config, setR2Config] = useState(getR2Config());
  const [fbConfig, setFbConfig] = useState(getFirebaseConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveR2Config(r2Config);
    saveFirebaseConfig(fbConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cloud Infrastructure Configuration</h2>
              <p className="text-xs text-slate-500">100% Free-Tier: Firebase Auth/Firestore + Cloudflare R2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/30 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('r2')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'r2'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cloudflare R2 (S3 Storage)</span>
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Firebase (Auth & Firestore)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {activeTab === 'r2' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  Cloudflare R2 provides 10GB free storage and <strong>$0.00 egress fees</strong>. DOM snapshots and published <code className="bg-blue-100/80 px-1 py-0.5 rounded text-blue-900 font-mono">manifest.json</code> static bundles will be served directly from your R2 bucket / CDN.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  value={r2Config.accountId}
                  onChange={(e) => setR2Config({ ...r2Config, accountId: e.target.value })}
                  placeholder="e.g. 7c9a8b123456789abcdef0123456789a"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    value={r2Config.accessKeyId}
                    onChange={(e) => setR2Config({ ...r2Config, accessKeyId: e.target.value })}
                    placeholder="R2 Access Key"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    value={r2Config.secretAccessKey}
                    onChange={(e) => setR2Config({ ...r2Config, secretAccessKey: e.target.value })}
                    placeholder="R2 Secret Key"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    R2 Bucket Name
                  </label>
                  <input
                    type="text"
                    value={r2Config.bucketName}
                    onChange={(e) => setR2Config({ ...r2Config, bucketName: e.target.value })}
                    placeholder="interactive-demos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Public Domain / Dev URL
                  </label>
                  <input
                    type="text"
                    value={r2Config.publicUrl}
                    onChange={(e) => setR2Config({ ...r2Config, publicUrl: e.target.value })}
                    placeholder="https://pub-xxx.r2.dev or custom CDN"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Cloud Firestore holds private draft state for authors. Public viewers do not read from Firestore. Leave empty to use the built-in local simulator.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={fbConfig.apiKey}
                    onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    placeholder="demo-tour-platform"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={fbConfig.authDomain}
                    onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                    placeholder="project-id.firebaseapp.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={fbConfig.appId}
                    onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">Settings persist locally in your browser workspace.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
