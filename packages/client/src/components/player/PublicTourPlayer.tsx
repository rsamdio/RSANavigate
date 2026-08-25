import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize,
  Minimize,
  Share2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Compass,
  ArrowLeft,
  Play,
  Pause,
  HelpCircle,
  Info,
  Hand,
  Plus,
  Star,
  Clock,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  TourManifest,
  StepManifest,
  StepAction,
  DOMSnapshot,
  FocusBackdropType,
  TargetHighlightType,
  rehydrateIframeSnapshot,
  computeTooltipPosition,
  computeBeaconPosition,
  findElementInSnapshot,
  simulateTypingInElement
} from '@serverless-tour/common';
import { loadPublicTourManifest, getDOMSnapshot } from '../../services/demoService';
import { updatePageMetadata, resetToDefaultMetadata } from '../../utils/seo';

interface LiveTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  isVisible: boolean;
}

export const PublicTourPlayer: React.FC = () => {
  const { demoId } = useParams<{ demoId: string }>();

  // State
  const [manifest, setManifest] = useState<TourManifest | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentSnapshot, setCurrentSnapshot] = useState<DOMSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [liveTargetRect, setLiveTargetRect] = useState<LiveTargetRect | null>(null);

  // Timer state
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState<boolean>(false);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelTypingRef = useRef<(() => void) | null>(null);

  // 1. Fetch static manifest (ZERO-DATABASE EXECUTION)
  useEffect(() => {
    if (!demoId) return;

    async function loadManifest() {
      setLoading(true);
      setError(null);
      try {
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        const data = await loadPublicTourManifest(demoId!, isPreview);
        setManifest(data);
        setCurrentStepIndex(0);

        // Dynamically set page metadata: "(Walkthrough title) | NAVIGATE | Rotaract South Asia MDIO"
        updatePageMetadata({
          walkthroughTitle: data.title,
          description: data.description,
          url: window.location.href,
          ogImage: data.coverImageUrl
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load tour manifest');
      } finally {
        setLoading(false);
      }
    }

    loadManifest();

    return () => {
      resetToDefaultMetadata();
    };
  }, [demoId]);

  const activeStep: StepManifest | null =
    manifest && manifest.steps ? manifest.steps[currentStepIndex] || null : null;

  // Real-time dynamic target tracking on scroll & resize inside the iframe
  const updateTargetCoordinates = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep) {
      setLiveTargetRect(null);
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Get the iframe's own position in the outer page (accounts for the top header/progress bar)
    const iframeRect = iframe.getBoundingClientRect();
    const iframeOffsetTop = iframeRect.top;
    const iframeOffsetLeft = iframeRect.left;

    const scrollY = iframe.contentWindow?.scrollY || 0;
    const scrollX = iframe.contentWindow?.scrollX || 0;

    // Guard: never track body/html — their rects drift on every scroll event
    const isBodyTarget = !activeStep.targetSelector ||
      activeStep.targetSelector === 'body' ||
      activeStep.targetSelector === 'html';

    if (!isBodyTarget) {
      const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);

      if (targetEl && targetEl !== doc.body && targetEl !== doc.documentElement) {
        const rect = targetEl.getBoundingClientRect();
        setLiveTargetRect({
          top: rect.top + iframeOffsetTop,
          left: rect.left + iframeOffsetLeft,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom + iframeOffsetTop,
          right: rect.right + iframeOffsetLeft,
          isVisible: rect.top > -rect.height && rect.top < (iframe.clientHeight || window.innerHeight)
        });
        return;
      }
    }

    // Coordinate fallback: stored page-absolute coords, subtract current scroll, add iframe page offset
    const coords = activeStep.targetCoordinates;
    if (coords && coords.x !== undefined && coords.width && coords.width < 800 && coords.height && coords.height < 300) {
      const top = coords.y - scrollY + iframeOffsetTop;
      const left = coords.x - scrollX + iframeOffsetLeft;
      setLiveTargetRect({
        top,
        left,
        width: coords.width,
        height: coords.height,
        bottom: top + coords.height,
        right: left + coords.width,
        isVisible: true
      });
    } else {
      // No valid specific element target — clear so no tooltip drifts
      setLiveTargetRect(null);
    }
  }, [activeStep]);

  // 2. Load step snapshot, apply privacy/text modifications, and rehydrate iframe
  useEffect(() => {
    if (!manifest || !activeStep) return;

    setStepError(null);

    // Clean up prior typing animation
    if (cancelTypingRef.current) {
      cancelTypingRef.current();
      cancelTypingRef.current = null;
    }

    let isActive = true;

    async function loadSnapshot() {
      try {
        const snap = await getDOMSnapshot(activeStep!.snapshotUrl, manifest?.demoId || demoId);
        if (!isActive) return;
        
        if (snap) {
          setCurrentSnapshot(snap);
          if (iframeRef.current) {
            // Combine global demo modifications + step-specific modifications
            const allModifications = [
              ...(manifest?.globalDomModifications || []),
              ...(activeStep?.domModifications || [])
            ];

            const doc = await rehydrateIframeSnapshot(iframeRef.current, snap, {
              disableNavigation: true,
              modifications: allModifications
            });

            // 60fps tracking engine for buttery smooth sticky positioning during scroll/resize
            let running = true;
            const tick = () => {
              if (!running) return;
              updateTargetCoordinates();
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(tick);
            };
            
            // Give iframe a moment to settle, then start the tracking loop
            setTimeout(() => {
              scrollToTarget();
              updateTargetCoordinates();
              rafRef.current = requestAnimationFrame(tick);
            }, 100);

            // Handle Simulated Input Typing if configured
            if (activeStep?.inputAction?.textToType) {
              const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
              if (targetEl && (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA')) {
                cancelTypingRef.current = simulateTypingInElement(
                  targetEl as HTMLInputElement,
                  activeStep.inputAction.textToType,
                  activeStep.inputAction.typingSpeedMs || 50
                );
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load step snapshot:', err);
        setStepError('Failed to load this step. Please try navigating to the next one.');
      }
    }

    loadSnapshot();

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cancelTypingRef.current) {
        cancelTypingRef.current();
        cancelTypingRef.current = null;
      }
    };
  }, [activeStep?.stepId, activeStep?.snapshotUrl, manifest?.globalDomModifications, updateTargetCoordinates]);

  // 3. Auto-Play Timer Hook
  useEffect(() => {
    if (!activeStep?.autoAdvanceSeconds || isCompleted || isAutoPlayPaused) {
      setTimerRemaining(null);
      return;
    }

    let remaining = activeStep.autoAdvanceSeconds;
    setTimerRemaining(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setTimerRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleNextStep();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStep?.stepId, activeStep?.autoAdvanceSeconds, isCompleted, isAutoPlayPaused]);

  // Window resize listener
  useEffect(() => {
    window.addEventListener('resize', updateTargetCoordinates);
    return () => window.removeEventListener('resize', updateTargetCoordinates);
  }, [updateTargetCoordinates]);

  // Scroll iframe smoothly to target element
  const scrollToTarget = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activeStep) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWin = iframe.contentWindow;
    if (!doc || !iframeWin) return;

    const targetEl = findElementInSnapshot(doc, activeStep.targetSelector, activeStep.targetCoordinates);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else if (activeStep.targetCoordinates) {
      // Fallback: scroll to coordinates if element not found by selector
      const coords = activeStep.targetCoordinates;
      const y = Math.max(0, coords.y - iframeWin.innerHeight / 2 + (coords.height || 0) / 2);
      const x = Math.max(0, coords.x - iframeWin.innerWidth / 2 + (coords.width || 0) / 2);
      iframeWin.scrollTo({ top: y, left: x, behavior: 'smooth' });
    }
  }, [activeStep]);

  // Step advancement
  const handleNextStep = () => {
    if (!manifest) return;

    if (currentStepIndex < manifest.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 }
      });
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  // Custom Action Execution (Branching / Jumps / External Links)
  const handleExecuteAction = (action: StepAction) => {
    if (action.actionType === 'next') {
      handleNextStep();
    } else if (action.actionType === 'prev') {
      handlePrevStep();
    } else if (action.actionType === 'jumpToStep' && action.targetStepId) {
      const targetIndex = manifest?.steps.findIndex((s) => s.stepId === action.targetStepId);
      if (targetIndex !== undefined && targetIndex >= 0) {
        setCurrentStepIndex(targetIndex);
      } else {
        handleNextStep();
      }
    } else if (action.actionType === 'openUrl' && action.url) {
      window.open(action.url, '_blank');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, manifest, isFullscreen]);

  // Calculate live Tooltip position relative to full viewport
  const viewportSize = { width: window.innerWidth || 1280, height: window.innerHeight || 800 };
  const targetRectForTooltip = liveTargetRect || {
    top: 200,
    left: 200,
    width: 200,
    height: 60,
    bottom: 260,
    right: 400,
    isVisible: true
  };

  const isModalMode = activeStep?.stepType === 'modal';
  const isBeaconOnlyMode = activeStep?.stepType === 'beacon';
  const showTooltip = !isBeaconOnlyMode && !isModalMode;

  const focusBackdrop: FocusBackdropType =
    activeStep?.focusBackdrop ||
    (activeStep?.showSpotlight || activeStep?.stepType === 'spotlight' ? 'dim' : 'none');

  const targetHighlight: TargetHighlightType =
    activeStep?.targetHighlight || (focusBackdrop !== 'none' ? 'solid' : 'none');

  const showBeacon =
    activeStep?.stepType === 'beacon' ||
    (activeStep?.stepType === 'tooltip' && activeStep?.showBeacon === true);

  // Beacon icon rendering helper
  const renderBeaconIcon = (iconName?: string) => {
    switch (iconName) {
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5" />;
      case 'info':
        return <Info className="w-3.5 h-3.5" />;
      case 'hand':
        return <Hand className="w-3.5 h-3.5" />;
      case 'plus':
        return <Plus className="w-3.5 h-3.5" />;
      case 'star':
        return <Star className="w-3.5 h-3.5" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />;
    }
  };

  const tooltipPosition = computeTooltipPosition(
    targetRectForTooltip,
    viewportSize,
    activeStep?.placement || 'bottom',
    { width: 340, height: 190 },
    16,
    activeStep?.beaconConfig?.alignment
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl w-80">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#0c3c60] flex items-center justify-center animate-spin mb-2">
            <Compass className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">Loading Interactive Walkthrough...</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden relative">
             <div className="absolute top-0 left-0 h-full bg-[#0c3c60] rounded-full w-1/2 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Guide Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">{error || 'This interactive guide is unavailable.'}</p>
          <Link
            to="/"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-semibold shadow-md shadow-blue-900/20"
          >
            Return to NAVIGATE Portal
          </Link>
        </div>
      </div>
    );
  }

  const themeColor = activeStep?.themeColor || '#0c3c60';

  return (
    <div
      ref={playerContainerRef}
      className="relative w-full h-screen overflow-hidden bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]"
      style={{
        '--theme-color': themeColor
      } as React.CSSProperties}
    >
      {/* 3.2 Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 z-50">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${((currentStepIndex) / manifest.totalSteps) * 100}%`,
            backgroundColor: themeColor
          }}
        />
      </div>

      {/* 1. Full-Bleed Native Website Canvas (100% Viewport, Zero Frames) */}
      <iframe
        ref={iframeRef}
        title="Interactive Guide"
        className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        sandbox="allow-same-origin allow-popups"
      />

      {/* Step Error Overlay */}
      {stepError && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center border border-red-200">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Step Load Error</h3>
            <p className="text-xs text-slate-600 mb-4">{stepError}</p>
            <button
              onClick={handleNextStep}
              className="px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800"
            >
              Skip Step
            </button>
          </div>
        </div>
      )}

      {/* 2.1 Backdrop Focus Overlay (Dim or Frosted Blur with SVG Cutout Hole) */}
      {focusBackdrop !== 'none' && liveTargetRect && !isCompleted && !isModalMode && (
        <div className="fixed inset-0 pointer-events-none z-10 animate-fade-in overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="player-spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(0, liveTargetRect.left - 6)}
                  y={Math.max(0, liveTargetRect.top - 6)}
                  width={liveTargetRect.width + 12}
                  height={liveTargetRect.height + 12}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              </mask>
            </defs>
          </svg>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mask: 'url(#player-spotlight-mask)',
              WebkitMask: 'url(#player-spotlight-mask)',
              backdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
              WebkitBackdropFilter: focusBackdrop === 'blur' ? 'blur(8px) brightness(0.7)' : undefined,
              backgroundColor: focusBackdrop === 'blur' ? 'rgba(12, 30, 50, 0.4)' : 'rgba(15, 23, 42, 0.55)'
            }}
          />
        </div>
      )}

      {/* 2.2 Target Outline / Highlight Box (Customizable Border without Beacon) */}
      {targetHighlight !== 'none' && liveTargetRect && !isCompleted && !isModalMode && (
        <div className="fixed inset-0 pointer-events-none z-10 animate-fade-in">
          <div
            className={`absolute ${
              targetHighlight === 'ring' ? 'animate-pulse' : ''
            } ${
              targetHighlight === 'bubble'
                ? 'rounded-2xl'
                : targetHighlight === 'glow'
                ? 'rounded-xl'
                : targetHighlight === 'dashed'
                ? 'rounded-lg'
                : 'rounded-xl'
            }`}
            style={{
              top: `${Math.max(0, liveTargetRect.top - (targetHighlight === 'bubble' ? 8 : 6))}px`,
              left: `${Math.max(0, liveTargetRect.left - (targetHighlight === 'bubble' ? 8 : 6))}px`,
              width: `${liveTargetRect.width + (targetHighlight === 'bubble' ? 16 : 12)}px`,
              height: `${liveTargetRect.height + (targetHighlight === 'bubble' ? 16 : 12)}px`,
              border:
                targetHighlight === 'dashed'
                  ? `2.5px dashed ${themeColor}`
                  : targetHighlight === 'ring'
                  ? `2px solid ${themeColor}`
                  : targetHighlight === 'bubble'
                  ? `2.5px solid ${themeColor}`
                  : targetHighlight === 'glow'
                  ? `1.5px solid ${themeColor}99`
                  : `2.5px solid ${themeColor}`,
              backgroundColor:
                targetHighlight === 'bubble'
                  ? `${themeColor}0d`
                  : targetHighlight === 'glow'
                  ? `${themeColor}15`
                  : undefined,
              boxShadow:
                targetHighlight === 'ring'
                  ? `0 0 0 4px ${themeColor}33, 0 0 16px ${themeColor}44`
                  : targetHighlight === 'glow'
                  ? `0 0 20px 4px ${themeColor}55, inset 0 0 12px ${themeColor}22`
                  : targetHighlight === 'bubble'
                  ? `0 4px 14px ${themeColor}25`
                  : undefined
            }}
          />
        </div>
      )}

      {/* 3. Floating Sticky Hotspot Beacon (Live-Glued to Element on Scroll) */}
      {showBeacon && liveTargetRect && !isCompleted && (() => {
          const alignment = activeStep?.beaconConfig?.alignment || 'center';
          const beaconStyle = activeStep?.beaconConfig?.style || 'pulse';
          const beaconColor = activeStep?.beaconConfig?.color || '#0c3c60';

          const { x: targetX } = computeBeaconPosition(liveTargetRect, alignment);
          const beaconLeft = targetX - 16;

          return (
            <div
              onClick={handleNextStep}
              className="fixed z-20 cursor-pointer group"
              style={{
                top: `${liveTargetRect.top + liveTargetRect.height / 2 - 16}px`,
                left: `${beaconLeft}px`
              }}
              title="Click target element to advance"
            >
              <div className="relative">
                {beaconStyle === 'pulse' && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ background: beaconColor }}
                  />
                )}
                <div
                  className={`relative w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg transition-transform ${beaconStyle !== 'dot' ? 'group-hover:scale-125' : ''} ring-4 ring-white/80`}
                  style={{
                    background: beaconColor,
                    boxShadow: `0 0 16px ${beaconColor}`
                  }}
                >
                  {renderBeaconIcon(activeStep?.beaconConfig?.icon)}
                </div>
              </div>
            </div>
          );
      })()}

      {/* 4. Floating Sticky Tooltip Callout and Connector (Glued to Live Element Position) */}
      {showTooltip && activeStep && !isModalMode && liveTargetRect && !isCompleted && (() => {
          const themeColor = activeStep.themeColor || '#0c3c60';
          const cardStyle = activeStep.cardStyle || 'solid';

          return (
            <>
              {/* Connector SVG Line between Tooltip and Target/Beacon */}
              {(() => {
                const alignment = activeStep.beaconConfig?.alignment || 'center';
                const { x: targetX, y: targetY } = computeBeaconPosition(liveTargetRect, alignment);

                return (
                  <svg className="fixed inset-0 w-full h-full pointer-events-none z-20">
                    <line
                      x1={tooltipPosition.left + 165} // center of tooltip width (330/2)
                      y1={tooltipPosition.top + 95}   // center of tooltip approx height
                      x2={targetX}
                      y2={targetY}
                      stroke={themeColor}
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      opacity="0.8"
                    />
                  </svg>
                );
              })()}

              {/* Tooltip Card */}
              <div
                className="fixed z-30"
              style={{
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                width: '340px'
              }}
            >
              <div
                className={`relative rounded-2xl p-5 shadow-2xl transition-all border ${
                  cardStyle === 'glass'
                    ? 'bg-white/90 backdrop-blur-md border-white/60 shadow-blue-900/10'
                    : cardStyle === 'dark'
                    ? 'bg-slate-900 text-white border-slate-800 shadow-2xl'
                    : cardStyle === 'outline'
                    ? 'bg-white border-2 text-slate-900 shadow-lg'
                    : 'bg-white border-slate-200 shadow-xl'
                }`}
                style={{
                  borderColor: cardStyle === 'outline' ? themeColor : undefined,
                  borderTop: cardStyle === 'solid' ? `4px solid ${themeColor}` : undefined
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="invisible">
                    {/* Step counter removed for cleaner UI */}
                  </div>

                  {timerRemaining !== null && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{timerRemaining}s</span>
                    </div>
                  )}
                </div>

                <h3
                  className={`font-bold text-base tracking-tight leading-snug ${
                    cardStyle === 'dark' ? 'text-white' : 'text-slate-900'
                  } ${
                    activeStep.textAlign === 'center'
                      ? 'text-center'
                      : activeStep.textAlign === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {activeStep.title}
                </h3>
                <p
                  className={`text-xs mt-2 leading-relaxed ${
                    cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  } ${
                    activeStep.textAlign === 'center'
                      ? 'text-center'
                      : activeStep.textAlign === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {activeStep.description}
                </p>

                {/* Custom Multi-Action Buttons / Branching */}
                {activeStep.actions && activeStep.actions.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                    {activeStep.actions.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => handleExecuteAction(act)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 hover:scale-105 ${
                          act.style === 'secondary'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : act.style === 'outline'
                            ? 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                            : 'text-white shadow-sm'
                        }`}
                        style={{
                          background: act.style === 'primary' ? themeColor : undefined
                        }}
                      >
                        <span>{act.label}</span>
                        {act.actionType === 'openUrl' ? (
                          <ExternalLink className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : manifest.showStepProgress === false ? (
                  <div
                    className={`mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 ${
                      activeStep.buttonLayout === 'full'
                        ? 'flex-col w-full'
                        : activeStep.buttonLayout === 'center'
                        ? 'justify-center'
                        : activeStep.buttonLayout === 'left'
                        ? 'justify-start'
                        : 'justify-between'
                    }`}
                  >
                    {activeStep.showBackButton && (
                      <button
                        onClick={handlePrevStep}
                        className={`px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-[11px] font-bold border border-slate-200 bg-slate-50 cursor-pointer transition-colors ${
                          activeStep.buttonLayout === 'full' ? 'w-full text-center' : ''
                        }`}
                      >
                        {activeStep.backButtonText || 'Back'}
                      </button>
                    )}
                    <button
                      onClick={handleNextStep}
                      className={`px-4 py-2 rounded-xl text-white text-[11px] font-bold shadow-sm text-center cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 ${
                        activeStep.buttonLayout === 'full' ? 'w-full' : ''
                      }`}
                      style={{ background: themeColor }}
                    >
                      {activeStep.buttonText || (currentStepIndex === manifest.totalSteps - 1 ? 'Finish Guide' : 'Next Step')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            </>
          );
        })()}

      {/* 5. Centered Announcement / Modal Mode */}
      {isModalMode && activeStep && !isCompleted && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center">
            {/* Step counter removed from modal mode */}

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeStep.title}
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {activeStep.description}
            </p>

            {/* Custom Multi-Action Buttons for Modal */}
            {activeStep.actions && activeStep.actions.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {activeStep.actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => handleExecuteAction(act)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 ${
                      act.style === 'secondary'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : act.style === 'outline'
                        ? 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                        : 'bg-[#0c3c60] hover:bg-[#092b45] text-white shadow-lg shadow-blue-900/20'
                    }`}
                  >
                    <span>{act.label}</span>
                    {act.actionType === 'openUrl' ? <ExternalLink className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex items-center justify-center gap-3">
                {activeStep.showBackButton && currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                >
                  <span>{activeStep.buttonText || 'Continue Walkthrough'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Sleek Floating Top Bar (Title, Audio, & Tools Overlay) */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Branding & Guide Title Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2 shadow-lg shadow-slate-900/5 flex items-center gap-3 pointer-events-auto">
          <Link
            to="/"
            className="w-8 h-8 rounded-xl bg-[#0c3c60] text-white flex items-center justify-center shadow-sm hover:bg-[#092b45] transition-colors"
            title="Return to NAVIGATE Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight line-clamp-1 max-w-xs sm:max-w-md">
              {manifest.title}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Step {currentStepIndex + 1} of {manifest.totalSteps} • Rotaract South Asia MDIO
            </p>
          </div>
        </div>

        {/* Right: Share, Fullscreen Controls */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedShare(true);
              setTimeout(() => setCopiedShare(false), 1500);
            }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Share Guide Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 7. Sleek Floating Bottom Control Pill (Only if showStepProgress !== false) */}
      {manifest.showStepProgress !== false && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-5 py-2.5 shadow-2xl shadow-slate-900/15 flex items-center gap-4">
          <button
            disabled={currentStepIndex === 0}
            onClick={handlePrevStep}
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-25 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {manifest.steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-[#0c3c60]'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Jump to Step ${idx + 1}`}
              />
            ))}
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-500">
            {Math.round(((currentStepIndex + 1) / manifest.totalSteps) * 100)}%
          </span>

          <button
            onClick={handleNextStep}
            className="px-4 py-1.5 rounded-full bg-[#0c3c60] hover:bg-[#092b45] text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-900/20 transition-all cursor-pointer hover:scale-105"
          >
            <span>{currentStepIndex === manifest.totalSteps - 1 ? 'Finish' : 'Next'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      )}

      {/* 8. Completion Celebration Modal */}
      {isCompleted && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Guide Completed!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You have completed all {manifest.totalSteps} steps in the{' '}
              <strong className="text-slate-800">{manifest.title}</strong> walkthrough.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleRestart}
                className="w-full py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092b45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Walkthrough</span>
              </button>

              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Return to NAVIGATE Portal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
