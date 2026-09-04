import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Play,
  Search,
  Share2,
  ExternalLink,
  ChevronRight,
  Calendar,
  Tag,
  BookOpen,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import { DemoDocument } from '@serverless-tour/common';
import { getDemos, loadPublicCatalog } from '../services/demoService';
import { resetToDefaultMetadata } from '../utils/seo';

export const PublicLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [publishedDemos, setPublishedDemos] = useState<DemoDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [copiedDemoId, setCopiedDemoId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    resetToDefaultMetadata();

    async function load() {
      // 1. Try static Edge CDN catalog (Zero-Database $0.00 cost)
      const edgeCatalog = await loadPublicCatalog();
      if (edgeCatalog && edgeCatalog.length > 0) {
        setPublishedDemos(edgeCatalog);
        return;
      }
      // 2. Fallback: local/Firestore store
      const all = await getDemos();
      const published = all.filter((d) => d.isPublished === true);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Portal Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 md:px-12 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] p-0.5 shadow-md shadow-blue-900/15 group-hover:scale-105 transition-transform flex items-center justify-center text-white shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0c3c60]">NAVIGATE</span>
                <img
                  src="/rsamdio.webp"
                  alt="RSA MDIO"
                  className="h-5 sm:h-6 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide">
                Interactive Guide Portal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
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

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 mt-3 pt-4 pb-3 space-y-3 bg-white animate-fade-in">
            <nav className="flex flex-col space-y-1">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-bold text-[#0c3c60] bg-blue-50/70"
              >
                Home
              </Link>
              <a
                href="https://rsamdio.org"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>About RSA MDIO</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="https://go.rsamdio.org/socials"
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <span>Follow Socials</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </nav>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 px-3">Connect With Us:</span>
              <div className="flex items-center gap-1.5 pr-3">
                <a
                  href="https://x.com/rsa_mdio"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200"
                  title="X (Twitter) @rsa_mdio"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/rsamdio/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:text-rose-600 flex items-center justify-center border border-slate-200"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.facebook.com/rsamdio/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center border border-slate-200"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://www.linkedin.com/company/rsamdio/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:text-sky-600 flex items-center justify-center border border-slate-200"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://www.youtube.com/@rsamdio"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:text-red-600 flex items-center justify-center border border-slate-200"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Welcome Banner */}
      <section className="px-4 sm:px-6 md:px-12 pt-8 sm:pt-10 pb-6 sm:pb-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/80 pb-6 sm:pb-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#0c3c60] text-[11px] sm:text-xs font-bold font-mono">
              <span>An initiative by Rotaract South Asia MDIO</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Immersive Guides & Walkthroughs
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed font-normal">
              Step-by-step interactive walkthroughs and reference resources for Rotaractors to navigate with confidence.
            </p>
          </div>

          {/* Social Links & External Connect (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs self-start lg:self-auto shrink-0">
            <span className="text-xs font-bold text-slate-500 mr-2 ml-1">Connect:</span>
            <a
              href="https://x.com/rsa_mdio"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white flex items-center justify-center transition-colors border border-slate-200/70"
              title="X (Twitter) @rsa_mdio"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
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
      <section className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full mb-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search interactive guides by topic, keyword, or tool..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0c3c60] rounded-2xl pl-12 pr-12 py-3 sm:py-3.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-inner transition-all"
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

          {/* Dynamic Label Filter Chips (Touch Scrollable on Mobile) */}
          {dynamicLabels.length > 0 && (
            <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar pb-1">
              <span className="text-xs font-bold text-slate-500 shrink-0">Filter:</span>
              <button
                onClick={() => setSelectedLabel('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      selectedLabel === lbl
                        ? 'bg-[#0c3c60] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <span>{lbl}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedLabel === lbl ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
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

      {/* Featured Walkthrough (If Any Available) */}
      {featuredDemo && !searchQuery && selectedLabel === 'all' && (
        <section className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#0c3c60] via-[#104b78] to-[#0c3c60] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-blue-900/30">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm">
                <span>Featured Guide</span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                {featuredDemo.title}
              </h2>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                {featuredDemo.description || 'Explore this comprehensive walkthrough created for Rotaract leaders.'}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  to={`/${featuredDemo.slug || featuredDemo.id}`}
                  className="px-5 py-2.5 rounded-xl bg-white text-[#0c3c60] hover:bg-blue-50 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 group cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  <span>Launch Walkthrough</span>
                </Link>

                <button
                  onClick={(e) => handleCopyLink(featuredDemo.slug || featuredDemo.id, e)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-all border border-white/20 flex items-center gap-2 cursor-pointer backdrop-blur-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copiedDemoId === (featuredDemo.slug || featuredDemo.id) ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Guides Grid */}
      <section className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full flex-1 mb-16">
        {filteredDemos.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-10 sm:p-14 text-center space-y-3">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-base sm:text-lg text-slate-700">No guides found</h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {searchQuery || selectedLabel !== 'all'
                ? 'No walkthroughs matched your search filter. Try clearing your filters.'
                : 'No published guides are currently available.'}
            </p>
            {(searchQuery || selectedLabel !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLabel('all');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0c3c60] text-white text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredDemos.map((demo) => {
              const vanityUrl = `/${demo.slug || demo.id}`;

              return (
                <div
                  key={demo.id}
                  onClick={() => navigate(`/${demo.slug || demo.id}`)}
                  className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl hover:border-blue-300/80 transition-all flex flex-col cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Card Thumbnail / Preview Banner */}
                  <div className="h-36 sm:h-40 bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] relative p-4 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                    <div className="z-10 flex items-center justify-end">
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

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#0c3c60] transition-colors line-clamp-2">
                        {demo.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {demo.description || 'Explore this step-by-step interactive walkthrough.'}
                      </p>
                    </div>

                    {/* Metadata & Dynamic Labels */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
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

                        <div className="flex items-center gap-2">
                          {copiedDemoId === (demo.slug || demo.id) ? (
                            <span className="text-[10px] font-bold text-emerald-600 shrink-0">Link Copied!</span>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDate(demo.createdAt)}</span>
                            </div>
                          )}
                        </div>
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
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 md:px-12 text-xs text-slate-600 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <img src="/rsamdio.webp" alt="Rotaract South Asia MDIO" className="h-8 w-auto object-contain" />
            <div className="space-y-0.5">
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
                Interactive walkthrough and resource portal for Rotaract leaders and members.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs font-semibold">
            <a href="https://rsamdio.org" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">
              About RSA MDIO
            </a>
            <span>•</span>
            <a href="https://go.rsamdio.org/socials" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">
              Social Channels
            </a>
            <span>•</span>
            <Link to="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/admin" target="_blank" rel="noreferrer" className="text-[#0c3c60] hover:underline font-bold transition-colors">
              Creator & Admin Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
