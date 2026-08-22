import React, { useState, useEffect } from 'react';
import { Compass, Play, Square, ExternalLink, Sparkles, CheckCircle2, ShieldCheck, Video, HelpCircle } from 'lucide-react';

export const Popup: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [demoTitle, setDemoTitle] = useState<string>('');
  const [stepCount, setStepCount] = useState<number>(0);
  const [demoId, setDemoId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (res) => {
        if (res && res.session) {
          setIsRecording(res.session.isRecording);
          setDemoTitle(res.session.demoTitle || '');
          setStepCount(res.session.stepCount || 0);
          setDemoId(res.session.demoId || null);
        }
      });
    }
  }, []);

  const handleStartRecording = () => {
    const newDemoId = `demo_rec_${Date.now().toString(36)}`;
    const title = demoTitle.trim() || 'My Rotary Walkthrough';
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          type: 'START_RECORDING',
          demoId: newDemoId,
          demoTitle: title
        },
        (res) => {
          if (res && res.success) {
            setIsRecording(true);
            setDemoId(newDemoId);
            setStepCount(0);
            window.close();
          }
        }
      );
    }
  };

  const handleStopRecording = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
        setIsRecording(false);
        handleOpenStudio();
      });
    }
  };

  const handleOpenStudio = () => {
    const baseUrl = import.meta.env.VITE_STUDIO_URL || 'http://localhost:3000';
    const url = demoId ? `${baseUrl}/admin/editor/${demoId}` : `${baseUrl}/admin`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="w-[340px] min-h-[420px] bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e40af] p-0.5 shadow-md shadow-blue-900/15">
              <div className="w-full h-full bg-[#0c3c60] rounded-[10px] flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold text-[#0c3c60] tracking-tight">NAVIGATE</h1>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                  Recorder
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Rotaract South Asia MDIO</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              isRecording
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rose-600' : 'bg-emerald-600'}`} />
            {isRecording ? 'Recording' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 p-4 flex flex-col justify-between space-y-4">
        {isRecording ? (
          <div className="space-y-4">
            {/* Recording Active Status Card */}
            <div className="p-4 bg-white border border-rose-200/80 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Captured Steps</span>
                <span className="text-base font-extrabold font-mono text-[#0c3c60] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                  {stepCount}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                🎯 <strong>Live capture active:</strong> Click on interactive elements, buttons, or links on the target webpage to capture steps.
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleStopRecording}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer hover:scale-102"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish & Open Studio</span>
              </button>

              <button
                onClick={handleOpenStudio}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
              >
                <span>Studio Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Guide Name Input */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Walkthrough Title
              </label>
              <input
                type="text"
                value={demoTitle}
                onChange={(e) => setDemoTitle(e.target.value)}
                placeholder="e.g. Club Finance & Invoice Download"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Feature Tip */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-[11px] text-slate-700 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-snug">
                The extension records full DOM snapshots, layout styles, and click targets for seamless replay.
              </span>
            </div>

            {/* Launch Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleStartRecording}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer hover:scale-102"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Walkthrough Recording</span>
              </button>

              <button
                onClick={handleOpenStudio}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <span>Open Studio Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Zero-Database Edge</span>
          </span>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
