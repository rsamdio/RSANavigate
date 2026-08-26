import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Play,
  Square,
  ExternalLink,
  ShieldCheck,
  Plus,
  Layers,
  ChevronDown,
  Check,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import { APP_PRODUCTION_URL } from '@serverless-tour/common';

interface TourSummary {
  id: string;
  title: string;
  stepCount: number;
  isPublished?: boolean;
  updatedAt?: number;
}

export const Popup: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [demoTitle, setDemoTitle] = useState<string>('');
  const [stepCount, setStepCount] = useState<number>(0);
  const [demoId, setDemoId] = useState<string | null>(null);

  // New vs. Append Mode
  const [mode, setMode] = useState<'new' | 'append'>('new');
  const [availableTours, setAvailableTours] = useState<TourSummary[]>([]);
  const [selectedAppendId, setSelectedAppendId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchTours = (forcePurge = false) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    // 1. Get current recording state
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (res) => {
      if (res && res.session) {
        setIsRecording(res.session.isRecording);
        setDemoTitle(res.session.demoTitle || '');
        setStepCount(res.session.stepCount || 0);
        setDemoId(res.session.demoId || null);
      }
    });

    const updateFromToursList = (toursList: TourSummary[], activeId?: string | null) => {
      // Filter out legacy ghost test recordings
      const cleanTours = toursList.filter(
        (t) =>
          t.title &&
          !t.title.startsWith('New Web Recording') &&
          !t.title.startsWith('New Walkthrough')
      );
      const finalTours = cleanTours.length > 0 ? cleanTours : toursList;
      setAvailableTours(finalTours);

      setSelectedAppendId((prev) => {
        if (activeId && finalTours.some((t) => t.id === activeId)) return activeId;
        if (prev && finalTours.some((t) => t.id === prev)) return prev;
        return finalTours.length > 0 ? finalTours[0].id : '';
      });
    };

    // 2. Query all open tabs in browser to find active Studio instance first
    let foundLiveStudio = false;
    if (chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({}, (tabs) => {
        if (tabs) {
          for (const tab of tabs) {
            if (
              tab.id &&
              tab.url &&
              (tab.url.includes('navigate.rsamdio.org') ||
                tab.url.includes('localhost') ||
                tab.url.includes('netlify.app'))
            ) {
              try {
                chrome.tabs.sendMessage(tab.id, { type: 'GET_IN_PAGE_STUDIO_DEMOS' }, (tabRes) => {
                  if (chrome.runtime.lastError) return;
                  if (tabRes && tabRes.success && Array.isArray(tabRes.demos)) {
                    foundLiveStudio = true;
                    updateFromToursList(tabRes.demos, tabRes.activeDemo?.id);
                    chrome.storage.local.set({ studioDemos: tabRes.demos });
                  }
                });
              } catch (e) {
                // Ignore
              }
            }
          }
        }

        // 3. If no live studio tab responded immediately, query background storage
        setTimeout(() => {
          if (!foundLiveStudio) {
            chrome.runtime.sendMessage({ type: 'LIST_RECORDED_DEMOS', forcePurge }, (res) => {
              if (res && Array.isArray(res.tours)) {
                updateFromToursList(res.tours, res.activeDemoId);
              }
            });
          }
        }, 120);
      });
    } else {
      chrome.runtime.sendMessage({ type: 'LIST_RECORDED_DEMOS', forcePurge }, (res) => {
        if (res && Array.isArray(res.tours)) {
          updateFromToursList(res.tours, res.activeDemoId);
        }
      });
    }
  };

  useEffect(() => {
    fetchTours();

    // Close custom dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSyncWithStudio = () => {
    setIsSyncing(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CLEAR_GHOST_RECORDINGS' }, () => {
        fetchTours(true);
        setTimeout(() => setIsSyncing(false), 500);
      });
    } else {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleStartRecording = () => {
    const isAppend = mode === 'append' && !!selectedAppendId;
    const targetDemoId = isAppend ? selectedAppendId : `demo_rec_${Date.now().toString(36)}`;
    const targetTitle = isAppend
      ? (availableTours.find((t) => t.id === selectedAppendId)?.title || demoTitle)
      : (demoTitle.trim() || 'My Rotary Walkthrough');

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          type: 'START_RECORDING',
          demoId: targetDemoId,
          demoTitle: targetTitle,
          isAppend
        },
        (res) => {
          if (res && res.success) {
            setIsRecording(true);
            setDemoId(targetDemoId);
            setStepCount(res.session?.stepCount || 0);
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
    const baseUrl = import.meta.env.VITE_STUDIO_URL || APP_PRODUCTION_URL;
    const url = demoId ? `${baseUrl}/admin/editor/${demoId}?source=extension` : `${baseUrl}/admin`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const selectedTour = availableTours.find((t) => t.id === selectedAppendId) || availableTours[0];

  return (
    <div className="w-[340px] min-h-[440px] bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none">
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
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <span>Studio Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Mode Switcher: New vs Append */}
            <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/80">
              <button
                type="button"
                onClick={() => {
                  setMode('new');
                  setIsDropdownOpen(false);
                }}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  mode === 'new'
                    ? 'bg-white text-[#0c3c60] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>New Guide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('append');
                  if (availableTours.length > 0 && !selectedAppendId) {
                    setSelectedAppendId(availableTours[0].id);
                  }
                }}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  mode === 'append'
                    ? 'bg-white text-[#0c3c60] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Append Steps</span>
              </button>
            </div>

            {mode === 'new' ? (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Walkthrough Title
                </label>
                <input
                  type="text"
                  value={demoTitle}
                  onChange={(e) => setDemoTitle(e.target.value)}
                  placeholder="e.g. Create your MyRotary Account"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Select Target Walkthrough
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncWithStudio}
                    title="Sync with Studio"
                    className="text-[10px] font-semibold text-[#0c3c60] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                {availableTours.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                    <p className="text-[11px] text-slate-500">
                      No walkthroughs found. Open Studio to sync your existing guides.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenStudio}
                      className="text-[11px] font-bold text-[#0c3c60] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Studio Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Custom Styled Select Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      className={`w-full bg-slate-50 hover:bg-slate-100/80 border text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isDropdownOpen
                          ? 'border-[#0c3c60] ring-2 ring-blue-100 bg-white'
                          : 'border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Bookmark className="w-3.5 h-3.5 text-[#0c3c60] shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {selectedTour?.title || 'Select a walkthrough...'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedTour && (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {selectedTour.stepCount} {selectedTour.stepCount === 1 ? 'step' : 'steps'}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Custom Dropdown Popover */}
                    {isDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                        {availableTours.map((t) => {
                          const isSelected =
                            selectedAppendId === t.id ||
                            (!selectedAppendId && availableTours[0]?.id === t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedAppendId(t.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/90 text-[#0c3c60]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Bookmark
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected ? 'text-[#0c3c60]' : 'text-slate-400'
                                  }`}
                                />
                                <span className={`truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                  {t.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {t.stepCount} steps
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#0c3c60] shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feature Tip */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-[11px] text-slate-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0c3c60] shrink-0 mt-0.5" />
              <span className="leading-snug">
                {mode === 'append'
                  ? 'Newly recorded steps will be appended to the selected walkthrough timeline.'
                  : 'The recorder captures your actions and page views step by step for interactive replay.'}
              </span>
            </div>

            {/* Launch Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleStartRecording}
                disabled={mode === 'append' && !selectedAppendId}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer hover:scale-102"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{mode === 'append' ? 'Record & Append Steps' : 'Start Walkthrough Recording'}</span>
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
            <span>RSA MDIO Studio</span>
          </span>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
