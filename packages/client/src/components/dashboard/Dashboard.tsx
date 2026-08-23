import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Layers,
  Globe,
  Play,
  Edit3,
  Copy,
  Trash2,
  Share2,
  Download,
  MoreVertical,
  Table as TableIcon,
  LayoutGrid,
  Check,
  Code,
  Compass,
  Video,
  FileText,
  RefreshCw,
  Tag,
  AlertCircle,
  Puzzle,
  Filter,
  ArrowUpDown,
  Bookmark,
  ChevronRight
} from 'lucide-react';
import { DemoDocument } from '@serverless-tour/common';
import {
  createDemo,
  deleteDemo,
  duplicateDemo,
  publishDemo,
  subscribeDemos,
  updateDemo
} from '../../services/demoService';
import { AuthorUser } from '../../services/firebase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { LabelInput } from '../common/LabelInput';

interface DashboardProps {
  user: AuthorUser | null;
  onOpenAuth: () => void;
}

type ViewMode = 'table' | 'grid';
type SortField = 'updatedAt' | 'createdAt' | 'steps' | 'title';
type SortOrder = 'asc' | 'desc';

export const Dashboard: React.FC<DashboardProps> = ({ user, onOpenAuth }) => {
  const navigate = useNavigate();
  const [demos, setDemos] = useState<DemoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortOption, setSortOption] = useState<string>('updatedAt-desc');
  
  // Selection state for batch operations
  const [selectedDemoIds, setSelectedDemoIds] = useState<Set<string>>(new Set());

  // Extension status
  const [hasExtension, setHasExtension] = useState<boolean>(false);
  const [checkingExtension, setCheckingExtension] = useState(false);

  // Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isCreateManualModalOpen, setIsCreateManualModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareDemo, setActiveShareDemo] = useState<DemoDocument | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  
  // Dynamic Label Form States
  const [recordMode, setRecordMode] = useState<'new' | 'append'>('new');
  const [selectedAppendDemoId, setSelectedAppendDemoId] = useState<string>('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordLabels, setRecordLabels] = useState<string[]>(['Rotary Guide']);
  const [recordTargetUrl, setRecordTargetUrl] = useState('https://my.rotary.org');

  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualLabels, setManualLabels] = useState<string[]>(['Rotary Guide']);
  const [creating, setCreating] = useState(false);
  
  // Publishing & Menu state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishProgressText, setPublishProgressText] = useState('');
  const [activeMenuDemoId, setActiveMenuDemoId] = useState<string | null>(null);

  // Confirmation Modal states
  const [demoToPublish, setDemoToPublish] = useState<DemoDocument | null>(null);
  const [demoToDelete, setDemoToDelete] = useState<DemoDocument | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Listen for extension detection ping
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_EXTENSION_INSTALLED') {
        setHasExtension(true);
        setCheckingExtension(false);
      }
    };
    window.addEventListener('message', handleMessage);

    // Initial check
    window.postMessage({ type: 'NAVIGATE_STUDIO_CHECK_EXTENSION' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkExtensionPresence = () => {
    setCheckingExtension(true);
    window.postMessage({ type: 'NAVIGATE_STUDIO_CHECK_EXTENSION' }, '*');
    setTimeout(() => {
      setCheckingExtension(false);
    }, 600);
  };

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeDemos(user?.uid, (list) => {
      setDemos(list);
      setLoading(false);

      // Broadcast authoritative walkthrough list to Chrome Extension & cache
      try {
        const demoSummaries = list.map((d) => ({
          id: d.id,
          title: d.title || 'Untitled Walkthrough',
          stepCount: d.stepOrder?.length || 0,
          isPublished: !!d.isPublished,
          updatedAt: d.updatedAt || Date.now()
        }));
        window.postMessage({ type: 'NAVIGATE_STUDIO_SYNC_DEMOS', demos: demoSummaries }, '*');
        localStorage.setItem('navigate_studio_demos_cache', JSON.stringify(demoSummaries));
      } catch (e) {
        // Safe fallback
      }
    });
    return () => unsub();
  }, [user]);

  // Close active row menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenuDemoId) setActiveMenuDemoId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuDemoId]);

  // Dynamic Workspace Labels extracted from all existing demos
  const allWorkspaceLabels = useMemo(() => {
    const labelCounts = new Map<string, number>();
    demos.forEach((d) => {
      d.tags?.forEach((t) => {
        const clean = t.trim();
        if (clean) {
          labelCounts.set(clean, (labelCounts.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(labelCounts.keys()).sort();
  }, [demos]);

  // Options for Label Filter CustomSelect
  const labelFilterOptions: SelectOption[] = useMemo(() => {
    const base: SelectOption[] = [
      { value: 'all', label: 'All Labels' }
    ];
    allWorkspaceLabels.forEach((lbl) => {
      const count = demos.filter((d) => d.tags?.includes(lbl)).length;
      base.push({
        value: lbl,
        label: lbl,
        badge: `${count}`
      });
    });
    return base;
  }, [allWorkspaceLabels, demos]);

  // Options for Sort CustomSelect
  const sortOptions: SelectOption[] = [
    { value: 'updatedAt-desc', label: 'Recently Updated' },
    { value: 'createdAt-desc', label: 'Newest Created' },
    { value: 'steps-desc', label: 'Most Steps' },
    { value: 'title-asc', label: 'Title (A-Z)' }
  ];

  // Filter and sort demos
  const filteredAndSortedDemos = useMemo(() => {
    const [sortField, sortOrder] = sortOption.split('-') as [SortField, SortOrder];

    return demos
      .filter((demo) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          demo.title.toLowerCase().includes(query) ||
          (demo.description && demo.description.toLowerCase().includes(query)) ||
          demo.tags?.some((t) => t.toLowerCase().includes(query)) ||
          demo.id.toLowerCase().includes(query);

        if (!matchesQuery) return false;

        if (statusFilter === 'published' && !demo.isPublished) return false;
        if (statusFilter === 'draft' && demo.isPublished) return false;

        if (selectedLabel !== 'all') {
          if (!demo.tags || !demo.tags.includes(selectedLabel)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (sortField) {
          case 'updatedAt':
            valA = a.updatedAt || a.createdAt || 0;
            valB = b.updatedAt || b.createdAt || 0;
            break;
          case 'createdAt':
            valA = a.createdAt || 0;
            valB = b.createdAt || 0;
            break;
          case 'steps':
            valA = a.stepOrder?.length || 0;
            valB = b.stepOrder?.length || 0;
            break;
          case 'title':
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            break;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [demos, searchQuery, statusFilter, selectedLabel, sortOption]);

  const publishedCount = demos.filter((d) => d.isPublished).length;
  const draftCount = demos.length - publishedCount;

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedDemoIds.size === filteredAndSortedDemos.length) {
      setSelectedDemoIds(new Set());
    } else {
      setSelectedDemoIds(new Set(filteredAndSortedDemos.map((d) => d.id)));
    }
  };

  const toggleSelectDemo = (id: string) => {
    const next = new Set(selectedDemoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDemoIds(next);
  };

  const handleStartRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let targetDemoId = '';
      if (recordMode === 'append') {
        if (!selectedAppendDemoId) {
          alert('Please select an existing walkthrough to append steps to.');
          setCreating(false);
          return;
        }
        targetDemoId = selectedAppendDemoId;
      } else {
        if (!recordTitle.trim()) {
          setCreating(false);
          return;
        }
        const created = await createDemo(
          recordTitle.trim(),
          `Recorded walkthrough for ${recordTargetUrl.trim()}`,
          user?.uid || 'creator_local',
          user?.email || ''
        );
        if (recordLabels.length > 0) {
          await updateDemo(created.id, { tags: recordLabels });
        }
        targetDemoId = created.id;
      }

      setIsRecordModalOpen(false);
      setRecordTitle('');

      // Open target URL in a new tab for recording
      const targetUrl = recordTargetUrl.startsWith('http')
        ? recordTargetUrl
        : `https://${recordTargetUrl}`;
      window.open(targetUrl, '_blank');
      
      // Navigate creator directly to the editor
      navigate(`/admin/editor/${targetDemoId}`);
    } catch (err) {
      console.error('Failed to prepare demo for recording:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    setCreating(true);
    try {
      const created = await createDemo(
        manualTitle.trim(),
        manualDescription.trim(),
        user?.uid || 'creator_local',
        user?.email || ''
      );
      if (manualLabels.length > 0) {
        await updateDemo(created.id, { tags: manualLabels });
      }
      setIsCreateManualModalOpen(false);
      setManualTitle('');
      setManualDescription('');
      navigate(`/admin/editor/${created.id}`);
    } catch (err) {
      console.error('Failed to create demo:', err);
    } finally {
      setCreating(false);
    }
  };

  const openRecordOrInstall = () => {
    window.postMessage({ type: 'NAVIGATE_STUDIO_CHECK_EXTENSION' }, '*');
    if (hasExtension) {
      setIsRecordModalOpen(true);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const requestPublish = (demo: DemoDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDemoToPublish(demo);
  };

  const executePublish = async () => {
    if (!demoToPublish) return;
    setPublishingId(demoToPublish.id);
    setPublishProgress(10);
    setPublishProgressText('Initializing compilation...');
    try {
      await publishDemo(demoToPublish.id, (percent, msg) => {
        setPublishProgress(percent);
        setPublishProgressText(msg);
      });
      setPublishProgress(100);
      setPublishProgressText('Published successfully!');
      setTimeout(() => {
        setPublishingId(null);
        setDemoToPublish(null);
      }, 500);
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Publishing failed. Please try again.');
      setPublishingId(null);
      setDemoToPublish(null);
    }
  };

  const handleDuplicate = async (demoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const dup = await duplicateDemo(demoId);
      setActiveMenuDemoId(null);
      navigate(`/admin/editor/${dup.id}`);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleToggleFeatured = async (demo: DemoDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateDemo(demo.id, { isFeatured: !demo.isFeatured });
      setActiveMenuDemoId(null);
    } catch (err) {
      console.error('Failed to toggle featured state:', err);
    }
  };

  const requestDelete = (demo: DemoDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDemoToDelete(demo);
  };

  const executeDelete = async () => {
    if (!demoToDelete) return;
    await deleteDemo(demoToDelete.id);
    setActiveMenuDemoId(null);
    const next = new Set(selectedDemoIds);
    next.delete(demoToDelete.id);
    setSelectedDemoIds(next);
    setDemoToDelete(null);
  };

  const executeBatchDelete = async () => {
    if (selectedDemoIds.size === 0) return;
    for (const id of selectedDemoIds) {
      await deleteDemo(id);
    }
    setSelectedDemoIds(new Set());
    setIsBatchDeleteConfirmOpen(false);
  };

  const openShareModal = (demo: DemoDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveShareDemo(demo);
    setIsShareModalOpen(true);
    setCopiedLink(false);
    setCopiedEmbed(false);
  };

  const getPublicUrl = (demoOrId: DemoDocument | string) => {
    if (typeof demoOrId === 'string') {
      const found = demos.find((d) => d.id === demoOrId || d.slug === demoOrId);
      const slug = found?.slug || demoOrId;
      return `${window.location.origin}/${slug}`;
    }
    return `${window.location.origin}/${demoOrId.slug || demoOrId.id}`;
  };

  const getEmbedCode = (demoOrId: DemoDocument | string) => {
    const url = getPublicUrl(demoOrId);
    return `<iframe src="${url}" width="100%" height="600" frameborder="0" allow="fullscreen" style="border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);"></iframe>`;
  };

  const copyToClipboard = (text: string, type: 'link' | 'embed') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 p-6 md:p-10 max-w-7xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ========================================================================= */}
      {/* 1. Stat Summary Cards */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Guides */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Walkthroughs</p>
              <p className="text-2xl md:text-3xl font-extrabold text-[#0c3c60] mt-1">{demos.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0c3c60] flex items-center justify-center border border-blue-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Interactive member walkthroughs in studio
          </p>
        </div>

        {/* Published Guides */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Live & Published</p>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-700 mt-1">{publishedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Live on Public Portal</span>
          </p>
        </div>

        {/* Draft Guides */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Drafts In Progress</p>
              <p className="text-2xl md:text-3xl font-extrabold text-amber-700 mt-1">{draftCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Under preparation in Studio</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Control Toolbar (Search, Filter, Actions) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, labels, or description..."
              className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0c3c60] rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-[#0c3c60] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({demos.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live ({publishedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'draft'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200" />
              <span>Drafts ({draftCount})</span>
            </button>
          </div>

          {/* Dynamic Label CustomSelect */}
          <div className="shrink-0">
            <CustomSelect
              value={selectedLabel}
              onChange={setSelectedLabel}
              options={labelFilterOptions}
              placeholder="Filter by Label"
            />
          </div>

          {/* Sort CustomSelect */}
          <div className="shrink-0">
            <CustomSelect
              value={sortOption}
              onChange={setSortOption}
              options={sortOptions}
              placeholder="Sort by"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#0c3c60] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0c3c60] text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download & Install Chrome Extension"
            >
              <Puzzle className="w-3.5 h-3.5 text-[#0c3c60]" />
              <span>Extension Setup</span>
            </button>

            <button
              onClick={openRecordOrInstall}
              className="px-4 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Record Walkthrough</span>
            </button>
          </div>
        </div>

        {/* Batch Selection Banner */}
        {selectedDemoIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold text-[#0c3c60] ml-2">
              {selectedDemoIds.size} {selectedDemoIds.size === 1 ? 'guide' : 'guides'} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDemoIds(new Set())}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Deselect
              </button>
              <button
                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. Walkthrough Data Presentation (Table / Grid) */}
      {/* ========================================================================= */}
      {filteredAndSortedDemos.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-3xl shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0c3c60] mx-auto flex items-center justify-center border border-blue-100">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery ? 'No matching walkthroughs found' : 'No walkthrough guides created yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery
                ? `No guides match your search "${searchQuery}". Try clearing filters or search terms.`
                : 'Click "Record Walkthrough" above to capture interactive steps directly with the NAVIGATE extension.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedLabel('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={openRecordOrInstall}
                className="px-5 py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Record First Walkthrough</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedDemos.length > 0 &&
                      selectedDemoIds.size === filteredAndSortedDemos.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#0c3c60] focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Guide Title</th>
                <th className="py-3.5 px-4 w-28">Status</th>
                <th className="py-3.5 px-4 w-24">Steps</th>
                <th className="py-3.5 px-4">Labels</th>
                <th className="py-3.5 px-4 w-28">Updated</th>
                <th className="py-3.5 px-4 w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedDemos.map((demo) => {
                const stepCount = demo.stepOrder?.length || 0;
                const isSelected = selectedDemoIds.has(demo.id);
                const isPublishing = publishingId === demo.id;

                return (
                  <tr
                    key={demo.id}
                    className={`hover:bg-blue-50/25 transition-colors group ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDemo(demo.id)}
                        className="rounded border-slate-300 text-[#0c3c60] focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Title & Description */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        {demo.coverImageUrl ? (
                          <img
                            src={demo.coverImageUrl}
                            alt=""
                            className="w-10 h-8 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0c3c60] flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors">
                            <Compass className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/editor/${demo.id}`)}
                              className="font-bold text-slate-900 hover:text-[#0c3c60] text-xs md:text-sm text-left transition-colors cursor-pointer block line-clamp-1"
                            >
                              {demo.title || 'Untitled Walkthrough'}
                            </button>
                            {demo.isFeatured && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-[#0c3c60] bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md shrink-0">
                                <Bookmark className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                <span>Featured</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                            {demo.description || 'Interactive guide walkthrough'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {demo.isPublished ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Live</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>

                    {/* Step Count */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                        {stepCount}
                      </span>
                    </td>

                    {/* Labels */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {demo.tags && demo.tags.length > 0 ? (
                          demo.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-bold text-[#0c3c60] bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100/80"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No labels</span>
                        )}
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                      {formatRelativeTime(demo.updatedAt || demo.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open in Studio */}
                        <button
                          onClick={() => navigate(`/admin/editor/${demo.id}`)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#0c3c60] hover:text-white text-[#0c3c60] font-bold transition-all border border-blue-200 cursor-pointer"
                          title="Open Studio Editor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Standalone Player */}
                        <button
                          onClick={() => window.open(`/${demo.slug || demo.id}`, '_blank')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                          title="Preview Public Player"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Share */}
                        <button
                          onClick={(e) => openShareModal(demo, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                          title="Share Link & Embed"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuDemoId(activeMenuDemoId === demo.id ? null : demo.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuDemoId === demo.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-fade-in text-left"
                            >
                              <button
                                onClick={(e) => handleDuplicate(demo.id, e)}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Duplicate</span>
                              </button>
                              <button
                                onClick={(e) => handleToggleFeatured(demo, e)}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${demo.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                                <span>{demo.isFeatured ? 'Remove from Featured' : 'Feature on Homepage'}</span>
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                onClick={(e) => requestDelete(demo, e)}
                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedDemos.map((demo) => {
            const stepCount = demo.stepOrder?.length || 0;
            return (
              <div
                key={demo.id}
                className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-200 flex flex-col group"
              >
                {/* Banner */}
                <div className="h-36 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 border-b border-slate-100 relative flex flex-col justify-between overflow-hidden">
                  {demo.coverImageUrl ? (
                    <img
                      src={demo.coverImageUrl}
                      alt={demo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : null}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-t from-black/40 via-transparent to-black/20">
                    <div className="flex justify-between items-start z-10">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                          demo.isPublished
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-amber-500 text-white border-amber-400'
                        }`}
                      >
                        {demo.isPublished ? '● Live' : '○ Draft'}
                      </span>

                      <button
                        onClick={(e) => openShareModal(demo, e)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-600 border border-slate-200 shadow-2xs cursor-pointer backdrop-blur-xs"
                        title="Share & Embed"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="z-10 flex items-center gap-1.5 flex-wrap">
                      {demo.isFeatured && (
                        <span className="text-[10px] font-extrabold text-[#0c3c60] bg-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                          <Bookmark className="w-3 h-3 fill-[#0c3c60]" /> Featured
                        </span>
                      )}
                      {demo.tags?.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold text-slate-900 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs backdrop-blur-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0c3c60] transition-colors line-clamp-1">
                      {demo.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {demo.description || 'Interactive guide walkthrough.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/admin/editor/${demo.id}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-[#0c3c60] hover:text-white text-[#0c3c60] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-200 hover:border-transparent"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Open Studio</span>
                    </button>

                    <button
                      onClick={() => window.open(`/${demo.slug || demo.id}`, '_blank')}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
                      title="Preview Player"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Record Walkthrough Modal */}
      {/* ========================================================================= */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0c3c60] flex items-center justify-center border border-blue-100">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Record New Walkthrough</h2>
                  <p className="text-xs text-slate-500">Record step-by-step guidance directly from any website</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartRecording} className="p-6 space-y-4">
              {/* Mode Switcher: New vs Append */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRecordMode('new')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    recordMode === 'new'
                      ? 'bg-white text-[#0c3c60] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Walkthrough</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordMode('append');
                    if (!selectedAppendDemoId && demos.length > 0) {
                      setSelectedAppendDemoId(demos[0].id);
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    recordMode === 'append'
                      ? 'bg-white text-[#0c3c60] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Append to Existing</span>
                </button>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-[#0c3c60] shrink-0" />
                  <span className="text-[11px] text-slate-700 font-medium">Need to set up the Chrome extension?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setIsInstallModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-[#0c3c60] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <span>Download ZIP & Guide</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {recordMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Walkthrough Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                      placeholder="e.g. How to Submit Club Goals in My Rotary"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Labels & Tags
                    </label>
                    <LabelInput
                      labels={recordLabels}
                      onChange={setRecordLabels}
                      availableLabels={allWorkspaceLabels}
                      placeholder="Type label & press Enter to add..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Existing Walkthrough to Append *
                  </label>
                  {demos.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      No existing walkthroughs available. Switch to "Create New Walkthrough".
                    </p>
                  ) : (
                    <select
                      value={selectedAppendDemoId}
                      onChange={(e) => setSelectedAppendDemoId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      {demos.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.stepOrder?.length || 0} {d.stepOrder?.length === 1 ? 'step' : 'steps'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Starting Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={recordTargetUrl}
                  onChange={(e) => setRecordTargetUrl(e.target.value)}
                  placeholder="https://my.rotary.org"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The recorder widget will appear on this page to capture your clicks and views.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setIsCreateManualModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0c3c60] cursor-pointer"
                >
                  Create manually instead
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || (recordMode === 'append' && !selectedAppendDemoId)}
                    className="px-5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{creating ? 'Preparing...' : recordMode === 'append' ? 'Launch & Append Steps' : 'Launch & Start Recording'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Install Extension Modal (1-Click Download & Setup) */}
      {/* ========================================================================= */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0c3c60] flex items-center justify-center border border-blue-100">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Install NAVIGATE Recorder</h2>
                  <p className="text-xs text-slate-500">Zero-friction browser extension setup</p>
                </div>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-[#0c3c60]">NAVIGATE Extension Package</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">Ready for Chrome, Brave, and Edge browsers</p>
                </div>
                <a
                  href="/navigate-recorder-extension.zip"
                  download="navigate-recorder-extension.zip"
                  className="px-4 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.ZIP)</span>
                </a>
              </div>

              {/* 3 Steps */}
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#0c3c60] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Download & Extract ZIP</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Click the button above and extract the downloaded zip to a folder on your computer.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#0c3c60] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Open Extension Settings</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">In your browser, visit <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">chrome://extensions</code> and enable <strong>Developer mode</strong> (top-right toggle).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#0c3c60] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Load Unpacked</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Click <strong>Load unpacked</strong> and select the extracted extension folder.</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsInstallModalOpen(false);
                    setIsCreateManualModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0c3c60] cursor-pointer"
                >
                  Create manual guide without extension
                </button>

                <button
                  onClick={checkExtensionPresence}
                  disabled={checkingExtension}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0c3c60] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingExtension ? 'animate-spin' : ''}`} />
                  <span>{checkingExtension ? 'Checking...' : 'Check Status'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. Manual Create Modal (Fallback) */}
      {/* ========================================================================= */}
      {isCreateManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Walkthrough Manually</h2>
                <p className="text-xs text-slate-500 mt-0.5">Build steps and interactive callouts inside the Studio Editor</p>
              </div>
              <button
                onClick={() => setIsCreateManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Walkthrough Title *
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. My Rotary Dues Payment Guide"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Labels & Tags
                </label>
                <LabelInput
                  labels={manualLabels}
                  onChange={setManualLabels}
                  availableLabels={allWorkspaceLabels}
                  placeholder="Type label & press Enter..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Briefly describe what this walkthrough demonstrates..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#0c3c60] focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creating ? 'Creating...' : 'Open in Studio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Share & Embed Modal */}
      {/* ========================================================================= */}
      {isShareModalOpen && activeShareDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Share Walkthrough</h2>
                <p className="text-xs text-slate-500 mt-0.5">Distribute via standalone link or embed into any webpage.</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Standalone Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Direct Player Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPublicUrl(activeShareDemo.id)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-700 focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(getPublicUrl(activeShareDemo.id), 'link')}
                    className="px-3.5 py-2 rounded-xl bg-[#0c3c60] hover:bg-[#092d48] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Responsive Embed Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Responsive Embed Iframe
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={getEmbedCode(activeShareDemo.id)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none resize-none"
                />
                <button
                  onClick={() => copyToClipboard(getEmbedCode(activeShareDemo.id), 'embed')}
                  className="mt-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed HTML'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. Publish Confirmation Modal & Progress */}
      {/* ========================================================================= */}
      {demoToPublish && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0c3c60] shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {publishingId === demoToPublish.id ? 'Publishing Guide...' : 'Ready to Go Live?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5">
                  {publishingId === demoToPublish.id
                    ? (publishProgressText || 'Packaging walkthrough...')
                    : <>Publish <strong>"{demoToPublish.title}"</strong> to the public guide portal for Rotaractors to view.</>}
                </p>
              </div>
            </div>

            {publishingId === demoToPublish.id && (
              <div className="mt-5 mb-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5 px-0.5">
                  <span>Compilation Progress</span>
                  <span className="font-mono text-[#0c3c60]">{publishProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden border border-slate-200 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0c3c60] to-blue-600 transition-all duration-300 shadow-xs"
                    style={{ width: `${Math.max(8, publishProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {publishingId !== demoToPublish.id ? (
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setDemoToPublish(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executePublish}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0c3c60] hover:bg-[#092d48] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Go Live Now</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                <span>Screen is locked during upload</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. Delete Confirmation Modal */}
      {/* ========================================================================= */}
      {demoToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">Delete Walkthrough</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Are you sure you want to permanently delete <strong>"{demoToDelete.title}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDemoToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. Batch Delete Confirmation Modal */}
      {/* ========================================================================= */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">Batch Delete</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Are you sure you want to permanently delete <strong>{selectedDemoIds.size}</strong> selected walkthroughs?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeBatchDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedDemoIds.size} Items</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
