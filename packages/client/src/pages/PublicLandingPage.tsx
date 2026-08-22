import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Play,
  Search,
  Zap,
  Share2,
  ExternalLink,
  ChevronRight,
  User,
  Calendar,
  Tag,
  BookOpen,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  X
} from 'lucide-react';
import { DemoDocument } from '@serverless-tour/common';
import { getDemos, loadPublicCatalog } from '../services/demoService';

export const PublicLandingPage: React.FC = () => {
  const [publishedDemos, setPublishedDemos] = useState<DemoDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [copiedDemoId, setCopiedDemoId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1. Try static Edge CDN catalog (Zero-Database $0.00 cost)
      const edgeCatalog = await loadPublicCatalog();
      if (edgeCatalog && edgeCatalog.length > 0) {
        setPublishedDemos(edgeCatalog);
        return;
      }
      // 2. Fallback: local/Firestore store
      const all = await getDemos();
      const published = all.filter((d) => d.isPublished !== false);
      setPublishedDemos(published);
    }
    load();
  }, []);

  // Dynamically extract unique labels from published walkthroughs
  const dynamicLabels = useMemo(() => {
    const labels = new Set<string>();
    publishedDemos.forEach((d) => {
      d.tags?.forEach((t) => {
        const clean = t.trim();
        if (clean) labels.add(clean);
      });
    });
    return Array.from(labels).sort();
  }, [publishedDemos]);

  const filteredDemos = useMemo(() => {
    return publishedDemos.filter((demo) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        demo.title.toLowerCase().includes(query) ||
        (demo.description && demo.description.toLowerCase().includes(query)) ||
        demo.tags?.some((t) => t.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (selectedLabel !== 'all') {
        if (!demo.tags || !demo.tags.includes(selectedLabel)) {
          return false;
        }
      }

      return true;
    });
  }, [publishedDemos, searchQuery, selectedLabel]);

  const featuredDemo = useMemo(() => {
    return publishedDemos.find((d) => d.isFeatured && d.title?.trim()) || null;
  }, [publishedDemos]);

  const handleCopyLink = (identifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/${identifier}`);
    setCopiedDemoId(identifier);
    setTimeout(() => setCopiedDemoId(null), 2000);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recent Guide';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Portal Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 md:px-12 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] p-0.5 shadow-md shadow-blue-900/15 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-[#0c3c60]">NAVIGATE</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200/80">
                  RSA MDIO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Interactive Guide Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 text-xs font-semibold text-slate-600">
              <Link to="/" className="text-[#0c3c60] font-bold">
                Home
              </Link>
              <a
                href="https://rsamdio.org"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 transition-colors"
              >
                About RSA MDIO
              </a>
              <a
                href="https://go.rsamdio.org/socials"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <span>Follow Socials</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <section className="px-6 md:px-12 pt-10 pb-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/80 pb-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#0c3c60] text-xs font-bold font-mono">
              <span>An initiative by Rotaract South Asia MDIO</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Immersive Guides & Walkthroughs
            </h1>

            <p className="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
              Step-by-step interactive walkthroughs and reference resources for Rotaract Members, Club Leaders, and District Rotaract Representatives to navigate with confidence.
            </p>
          </div>

          {/* Social Links & External Connect */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-500 mr-2 ml-1">Connect:</span>
            <a
              href="https://www.instagram.com/rsamdio/"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors border border-slate-200/70"
              title="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://www.facebook.com/rsamdio/"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-200/70"
              title="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/rsamdio/"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 flex items-center justify-center transition-colors border border-slate-200/70"
              title="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://www.youtube.com/@rsamdio"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition-colors border border-slate-200/70"
              title="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href="https://rsamdio.org/"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 flex items-center justify-center transition-colors border border-slate-200/70"
              title="RSA MDIO Website"
            >
              <Globe className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Sleek Search Bar & Dynamic Label Filter Chips */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto w-full mb-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 shadow-2xs space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search interactive guides by topic, tool, or keyword (e.g. Invoices, DRR Access, Goals)..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0c3c60] rounded-2xl pl-12 pr-12 py-3.5 text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic Label Filter Chips */}
          {dynamicLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-500 mr-1">Filter by Label:</span>
              <button
                onClick={() => setSelectedLabel('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedLabel === 'all'
                    ? 'bg-[#0c3c60] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                }`}
              >
                All ({publishedDemos.length})
              </button>
              {dynamicLabels.map((lbl) => {
                const count = publishedDemos.filter((d) => d.tags?.includes(lbl)).length;
                return (
                  <button
                    key={lbl}
                    onClick={() => setSelectedLabel(selectedLabel === lbl ? 'all' : lbl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedLabel === lbl
                        ? 'bg-[#0c3c60] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span>{lbl}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        selectedLabel === lbl ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Guide Banner (Only displayed if explicitly marked isFeatured) */}
      {featuredDemo && selectedLabel === 'all' && !searchQuery && (
        <section className="px-6 md:px-12 max-w-7xl mx-auto w-full mb-10">
          <div className="rounded-3xl bg-gradient-to-r from-blue-50/90 via-white to-amber-50/40 border border-slate-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0c3c60] text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Featured Guide</span>
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {featuredDemo.title}
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {featuredDemo.description || 'Explore this step-by-step interactive walkthrough.'}
                </p>

                {/* Dynamic Tags */}
                {featuredDemo.tags && featuredDemo.tags.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {featuredDemo.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Author & Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">Rtn. Rtr. Arun Teja</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(featuredDemo.createdAt)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => window.open(`/${featuredDemo.slug || featuredDemo.id}`, '_blank')}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0c3c60] to-[#1e4e79] hover:from-[#092b45] hover:to-[#163b5c] text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-950/20 hover:scale-102 transition-all cursor-pointer"
                  >
                    <span>Launch Walkthrough</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Featured Cover Image */}
              {featuredDemo.coverImageUrl ? (
                <div className="w-full lg:w-96 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md aspect-video shrink-0 bg-slate-900">
                  <img
                    src={featuredDemo.coverImageUrl}
                    alt={featuredDemo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* Guide Cards Directory */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto w-full flex-1 mb-16">
        {filteredDemos.length === 0 ? (
          <div className="p-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">No guides found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No guides match "${searchQuery}". Try searching with different terms.`
                : 'No published guides are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemos.map((demo) => {
              const guideUrl = `/${demo.slug || demo.id}`;
              return (
                <div
                  key={demo.id}
                  onClick={() => window.open(guideUrl, '_blank')}
                  className="bg-white border border-slate-200/90 hover:border-[#0c3c60]/50 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                >
                  {/* Card Cover / Banner */}
                  {demo.coverImageUrl ? (
                    <div className="h-44 bg-slate-900 overflow-hidden relative">
                      <img
                        src={demo.coverImageUrl}
                        alt={demo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={(e) => handleCopyLink(demo.slug || demo.id, e)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-white transition-colors backdrop-blur-xs shadow-sm cursor-pointer"
                        title="Copy Share Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-[#0c3c60] via-[#124b77] to-[#1c5f94] p-5 relative flex flex-col justify-between overflow-hidden group-hover:brightness-105 transition-all">
                      <Compass className="w-28 h-28 text-white/10 absolute -right-5 -bottom-5 pointer-events-none" />
                      <div className="flex justify-between items-start z-10">
                        {demo.tags && demo.tags[0] ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs border border-white/20">
                            {demo.tags[0]}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={(e) => handleCopyLink(demo.slug || demo.id, e)}
                          className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors backdrop-blur-xs border border-white/15 cursor-pointer"
                          title="Copy Share Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="z-10 flex items-center justify-end">
                        <span className="text-xs font-bold text-white/90 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Launch Walkthrough</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-base text-slate-900 group-hover:text-[#0c3c60] transition-colors line-clamp-2">
                        {demo.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {demo.description || 'Explore this step-by-step interactive walkthrough.'}
                      </p>
                    </div>

                    {/* Metadata & Dynamic Labels */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[140px]">Rtn. Rtr. Arun Teja</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(demo.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {demo.tags?.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-semibold text-[#0c3c60] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/80"
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        {copiedDemoId === (demo.slug || demo.id) && (
                          <span className="text-[10px] font-bold text-emerald-600">Link Copied!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Portal Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 px-6 md:px-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-bold text-slate-800 text-sm">
              NAVIGATE - An initiative by{' '}
              <a
                href="https://rsamdio.org"
                target="_blank"
                rel="noreferrer"
                className="text-[#0c3c60] hover:underline font-extrabold"
              >
                Rotaract South Asia MDIO
              </a>
            </p>
            <p className="text-slate-500 text-xs">
              Providing immersive guides and reference resources for Rotaractors.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <a href="https://rsamdio.org" target="_blank" rel="noreferrer" className="hover:text-slate-900">
              RSA MDIO Home
            </a>
            <span>•</span>
            <a href="https://go.rsamdio.org/socials" target="_blank" rel="noreferrer" className="hover:text-slate-900">
              Social Channels
            </a>
            <span>•</span>
            <Link to="/admin" target="_blank" rel="noreferrer" className="text-[#0c3c60] hover:underline font-bold">
              Creator & Admin Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
