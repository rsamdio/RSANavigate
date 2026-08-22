import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, FileText, ArrowLeft, CheckCircle, Scale, ShieldCheck, Mail } from 'lucide-react';
import { updatePageMetadata, resetToDefaultMetadata } from '../utils/seo';

export const TermsPage: React.FC = () => {
  useEffect(() => {
    updatePageMetadata({
      walkthroughTitle: 'Terms of Service',
      description: 'Terms of Service for NAVIGATE - An interactive guide portal by Rotaract South Asia MDIO.'
    });
    return () => {
      resetToDefaultMetadata();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 md:px-12 py-3.5 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0c3c60] to-[#1e4e79] p-0.5 shadow-md shadow-blue-900/15 group-hover:scale-105 transition-transform flex items-center justify-center text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl text-[#0c3c60]">NAVIGATE</span>
              <img src="/rsamdio.webp" alt="RSA MDIO" className="h-5 sm:h-6 w-auto object-contain opacity-90" />
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Guides</span>
          </Link>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#0c3c60] text-xs font-bold font-mono">
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Use</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Effective Date: August 2026 | Rotaract South Asia Multi-District Information Organization (RSA MDIO)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-2xs space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0c3c60]" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <p>
              By accessing or using the NAVIGATE portal at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#0c3c60] font-mono text-xs">navigate.rsamdio.org</code>, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use this portal.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#0c3c60]" />
              <span>2. Purpose & Permitted Use</span>
            </h2>
            <p>
              NAVIGATE is an educational and administrative resource created by Rotaract South Asia MDIO to provide interactive guides, walkthroughs, and step-by-step assistance for Rotaract and Rotary members across South Asia.
            </p>
            <p>
              You are granted a non-exclusive, revocable license to view, follow, and share walkthrough links for official club, district, and multidistrict activities in accordance with Rotary International policies.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0c3c60]" />
              <span>3. Intellectual Property & Trademarks</span>
            </h2>
            <p>
              The names "Rotaract", "Rotary", and related emblems are registered trademarks of Rotary International. "Rotaract South Asia MDIO", the NAVIGATE emblem, branding, and platform code are proprietary to Rotaract South Asia MDIO.
            </p>
            <p>
              Third-party software interfaces shown within walkthrough snapshots remain the property of their respective owners and are displayed under fair educational use for instructional training purposes.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Creator Code of Conduct</h2>
            <p>
              Authorized RSA MDIO creators using the visual Studio Editor agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Ensure all confidential information and personal credentials are redacted or blurred prior to publishing.</li>
              <li>Provide accurate, verified step-by-step instructions.</li>
              <li>Refrain from publishing misleading, malicious, or unauthorized content.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Disclaimer of Warranties</h2>
            <p>
              The NAVIGATE service is provided on an "as is" and "as available" basis without warranties of any kind. While we strive for 100% accuracy in our guides, Rotaract South Asia MDIO is not liable for changes in external software interfaces, third-party downtime, or user errors.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#0c3c60]" />
              <span>6. Contact Information</span>
            </h2>
            <p>
              For inquiries regarding these Terms of Service or guide permissions, please contact:
            </p>
            <p className="font-semibold text-slate-800">
              Rotaract South Asia MDIO Secretariat<br />
              Website: <a href="https://rsamdio.org" target="_blank" rel="noreferrer" className="text-[#0c3c60] hover:underline">rsamdio.org</a><br />
              Email: <a href="mailto:contact@rsamdio.org" className="text-[#0c3c60] hover:underline">contact@rsamdio.org</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-xs text-slate-600">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Rotaract South Asia MDIO. All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold">
            <Link to="/" className="hover:text-slate-900">Home</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
            <span>•</span>
            <a href="https://rsamdio.org" target="_blank" rel="noreferrer" className="hover:text-slate-900">About RSA MDIO</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
