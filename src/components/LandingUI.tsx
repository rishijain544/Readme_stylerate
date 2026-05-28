import React from 'react';
import { motion } from 'motion/react';
import {
  Brain, FileCode, User, Github, Star, GitFork, AlertCircle,
  Sparkles, Check, Copy, Download, Trash2, Edit2, Play,
  Layout, Plus, Clipboard, ExternalLink, Settings, LogOut,
  CheckCircle, ShieldAlert, BookOpen, Eye, Layers, RefreshCw, Send, Lock
} from 'lucide-react';

interface LandingUIProps {
  user: { name: string; email: string; photoURL: string | null; plan: string; readmesGenerated: number; createdAt: number } | null;
  handleSignOut: () => void;
  setIsAuthModalOpen: (open: boolean) => void;
  handleGuestLogin: () => void;
  children: React.ReactNode;
  generationMode: 'url' | 'description';
  setGenerationMode: (mode: 'url' | 'description') => void;
}

export default function LandingUI({
  user,
  handleSignOut,
  setIsAuthModalOpen,
  handleGuestLogin,
  children,
  generationMode,
  setGenerationMode
}: LandingUIProps) {

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans antialiased relative overflow-hidden">
      
      {/* ── Ambient Orbs (Fixed background layers always present) ── */}
      <div className="orb orb-violet"></div>
      <div className="orb orb-cyan"></div>

      {/* Grid overlay for a premium sci-fi feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0"></div>

      {/* ── VIEW 1: FIXED NAVIGATION (Floating Pill Navbar) ── */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[672px] bg-black/70 backdrop-blur-md border border-white/10 rounded-full py-3 px-5 flex justify-between items-center z-50">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]"></div>
          <span 
            className="font-display font-medium text-lg tracking-tight text-white cursor-pointer select-none"
            onClick={() => scrollToSection('hero')}
          >
            README <span className="shimmer-text text-sm font-semibold tracking-wider">Stylerate</span>
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-wider rounded font-mono">
            ML ✓
          </span>
        </div>

        {/* Center Side: Nav Anchors */}
        <div className="hidden sm:flex items-center gap-6 font-sans text-[11px] uppercase tracking-[0.1em] text-neutral-400">
          <button onClick={() => scrollToSection('intro')} className="hover:text-white transition cursor-pointer">About</button>
          <button onClick={() => scrollToSection('features')} className="hover:text-white transition cursor-pointer">Specs</button>
          <button onClick={() => scrollToSection('workspace')} className="hover:text-[#8B5CF6] transition font-semibold text-white tracking-widest cursor-pointer">Workspace</button>
        </div>

        {/* Right Side: Auth / Member Dropdown */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-block border border-white/5 bg-[#0a0a0a] text-[9.5px] text-[#06B6D4] px-2.5 py-1 tracking-widest uppercase rounded">
                {user.name.split(' ')[0]} // {user.plan === 'standard-guest' ? 'PLAY' : 'PRO'}
              </span>
              <button 
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full border border-white/10 hover:border-[#8B5CF6] hover:bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Disconnect session"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 border border-white/10 text-white font-medium hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-full font-sans transition cursor-pointer text-xs"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION 0: MINI HERO (Clear navigation padding-top for navbar) ── */}
      <section id="hero" className="min-h-screen pt-28 flex flex-col justify-center items-center px-6 text-center relative z-10">
        <div className="max-w-[720px] mx-auto space-y-6 pt-12">
          
          {/* Symmetrical active node tag */}
          <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-3 py-1 rounded-full font-mono text-[9.5px] uppercase tracking-wider text-[#A78BFA]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Version 2.0 Streaming Core System Active
          </div>

          <h1 className="text-5xl md:text-8xl tracking-tight leading-[0.95] text-white">
            Generate <span className="shimmer-text">Perfect</span><br/>
            README Files
          </h1>

          <p className="max-w-[560px] mx-auto text-neutral-400 text-sm md:text-base font-light leading-relaxed">
            Powered by real ML classification, cosine similarity section recommendations, and Gemini AI. 
            From repository URL to optimized production README in seconds.
          </p>

          {/* Symmetrical Mode Switcher */}
          <div className="space-y-3 pt-3">
            <div className="border border-white/10 bg-black/60 backdrop-blur-md p-1 md:p-1.5 gap-2 select-none font-sans font-medium hover:border-[#8B5CF6]/50 transition duration-300 rounded-full flex max-w-[440px] mx-auto">
              <button
                onClick={() => setGenerationMode('url')}
                className={`flex-1 py-2 text-xs md:text-xs uppercase tracking-wider rounded-full transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  generationMode === 'url'
                    ? 'bg-[#8B5CF6] text-white font-semibold scale-102 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ⬡ GitHub URL
              </button>
              <button
                onClick={() => setGenerationMode('description')}
                className={`flex-1 py-2 text-xs md:text-xs uppercase tracking-wider rounded-full transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  generationMode === 'description'
                    ? 'bg-[#8B5CF6] text-white font-semibold scale-102 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ✍ Describe Project
              </button>
            </div>

            <div className="text-[10px] text-[#737373] font-mono uppercase tracking-[0.18em] select-none">
              {generationMode === 'url' ? '// MODE 01: FETCH FROM GITHUB REPOSITORY' : '// MODE 02: DESCRIBE YOUR PROJECT MANUALLY'}
            </div>
          </div>

          {/* Action CTAs using Shiny Border Button */}
          <div className="flex flex-wrap gap-4 justify-center items-center pt-4">
            <div className="shiny-border-btn-wrapper" onClick={() => scrollToSection('workspace')}>
              <button className="shiny-border-btn-inner hover:opacity-95">
                Generate README ✦
              </button>
            </div>
            
            {!user && (
              <button 
                onClick={handleGuestLogin}
                className="synapse-ghost-btn px-6 py-4 cursor-pointer text-sm"
              >
                Guest Sandbox Play
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── INFINITE TICKER ── */}
      <div className="h-14 bg-black/40 border-t border-b border-white/5 overflow-hidden relative z-10 flex items-center">
        <div className="flex whitespace-nowrap animate-ticker font-sans text-[10px] uppercase tracking-widest text-[#737373]">
          
          {/* Set of contents */}
          <div className="flex items-center shrink-0">
            <span className="mx-4 text-neutral-500">MODEL</span>
            <span className="mx-2 text-white font-mono text-xs lowercase">gemini-2.0-flash</span>
            <span className="mx-4 text-[#525252]">/</span>
            
            <span className="mx-4 text-neutral-500">ML ENGINE</span>
            <span className="mx-2 text-white font-mono text-xs">TF.JS 4.2</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">CLASSIFIER</span>
            <span className="mx-2 text-[#8B5CF6] font-mono text-xs">10 Classes</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">FEATURES</span>
            <span className="mx-2 text-white font-mono text-xs">40-Dim Vectors</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">QUALITY SCORER</span>
            <span className="mx-2 text-emerald-400 font-mono text-xs">15 Features</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">AUTH</span>
            <span className="mx-2 text-white font-mono text-xs text-[#06B6D4]">Firebase v11</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">COSINE SIM</span>
            <span className="mx-2 text-white font-mono text-xs">Section Recommender</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">TRAINING</span>
            <span className="mx-2 text-[#8B5CF6] font-mono text-xs">~5s on Load</span>
            <span className="mx-4 text-[#525252]">/</span>
          </div>

          {/* Duplicated contents for seamless loops */}
          <div className="flex items-center shrink-0">
            <span className="mx-4 text-neutral-500">MODEL</span>
            <span className="mx-2 text-white font-mono text-xs lowercase">gemini-2.0-flash</span>
            <span className="mx-4 text-[#525252]">/</span>
            
            <span className="mx-4 text-neutral-500">ML ENGINE</span>
            <span className="mx-2 text-white font-mono text-xs">TF.JS 4.2</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">CLASSIFIER</span>
            <span className="mx-2 text-[#8B5CF6] font-mono text-xs">10 Classes</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">FEATURES</span>
            <span className="mx-2 text-white font-mono text-xs">40-Dim Vectors</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">QUALITY SCORER</span>
            <span className="mx-2 text-emerald-400 font-mono text-xs">15 Features</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">AUTH</span>
            <span className="mx-2 text-white font-mono text-xs text-[#06B6D4]">Firebase v11</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">COSINE SIM</span>
            <span className="mx-2 text-white font-mono text-xs">Section Recommender</span>
            <span className="mx-4 text-[#525252]">/</span>

            <span className="mx-4 text-neutral-500">TRAINING</span>
            <span className="mx-2 text-[#8B5CF6] font-mono text-xs">~5s on Load</span>
            <span className="mx-4 text-[#525252]">/</span>
          </div>

        </div>
      </div>

      {/* ── SECTION 1: ABOUT stories ── */}
      <section id="intro" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-mono">
              // 01 — STORY LINE
            </span>
            <h2 className="text-4xl md:text-6xl text-white">
              More than a<br/>
              <span className="shimmer-text">document.</span>
            </h2>
            <div className="text-neutral-400 text-sm space-y-4 font-sans leading-relaxed">
              <p>
                Every project deserves pristine visual layout and architectural explanation. Copy-pasted standard layout templates often fail to correctly document project files.
              </p>
              <p>
                README Stylerate utilizes custom regression and classification layers, dynamically reading file structures locally to evaluate directories, predict project niches, recommend relevant guides, and compose expert markdown arrays via Gemini.
              </p>
            </div>

            {/* Symmetrical stat segments */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass-panel p-5 space-y-1">
                <div className="text-3xl font-display text-[#8B5CF6]">99.4%</div>
                <div className="text-[9px] uppercase tracking-widest text-[#737373] font-mono">Accuracy Fit</div>
              </div>
              <div className="glass-panel p-5 space-y-1">
                <div className="text-3xl font-display text-[#06B6D4]">10X</div>
                <div className="text-[9px] uppercase tracking-widest text-[#737373] font-mono">Speed Multiplier</div>
              </div>
            </div>
          </div>

          {/* Symmetrical orbit visualizer */}
          <div className="flex justify-center items-center relative py-12">
            <div className="w-64 h-64 border border-white/5 rounded-full flex items-center justify-center animate-spin [animation-duration:25s]">
              <div className="w-48 h-48 border border-white/10 rounded-full flex items-center justify-center animate-reverse [animation-duration:15s]">
                <div className="w-32 h-32 border border-dashed border-[#8B5CF6]/20 rounded-full flex items-center justify-center">
                  <Brain size={24} className="text-[#8B5CF6] animate-pulse" />
                </div>
              </div>
              <div className="absolute top-1/2 left-0 w-2.5 h-2.5 bg-[#8B5CF6] rounded-full"></div>
              <div className="absolute bottom-1/4 right-0 w-2 h-2 bg-[#06B6D4] rounded-full"></div>
            </div>
            
            <div className="absolute bg-[#0b0b0b] border border-white/10 rounded-lg px-4 py-2 text-[10px] font-mono text-neutral-400 rotate-[-4deg]">
              README_STYLERATE_CORE // ACTIVE
            </div>
          </div>

        </div>
      </section>

      {/* Decorative Rotating Synapse Divider */}
      <div className="bg-[#8B5CF6]/10 py-3 overflow-hidden relative z-10 rotate-[-1deg] my-12 border-t border-b border-[#8B5CF6]/25">
        <div className="flex whitespace-nowrap animate-ticker font-mono text-[10px] font-bold uppercase tracking-widest text-[#A78BFA]">
          <span className="mr-12">✦ Ship Faster</span>
          <span className="mr-12">✦ Build Better</span>
          <span className="mr-12">✦ Think Bigger</span>
          <span className="mr-12">✦ Stay Curious</span>
          <span className="mr-12">✦ Ship Faster</span>
          <span className="mr-12">✦ Build Better</span>
          <span className="mr-12">✦ Think Bigger</span>
          <span className="mr-12">✦ Stay Curious</span>
        </div>
      </div>

      {/* ── SECTION 2: SPECIFICATIONS (Feature Cards) ── */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="space-y-12">
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono block">
              // 02 — PIPELINE SPECIFICATIONS
            </span>
            <h2 className="text-4xl md:text-6xl text-white">
              Engineered to <span className="shimmer-text">impress.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <Brain className="text-[#8B5CF6]" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#8B5CF6] block">01 / AUTO-CLASSIFICATION</span>
              <h3 className="text-lg font-semibold text-white">Client ML (TF.js)</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                TensorFlow.js compiles structure analysis maps instantly inside the browser sandbox, ensuring absolute protection of local code databases.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <Sparkles className="text-[#06B6D4]" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#06B6D4] block">02 / INTEGRATED GEMINI</span>
              <h3 className="text-lg font-semibold text-white">Apex Synthesis</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                AI integrations leverage structured data arrays and custom parameters to construct beautiful markdown blocks, streamed in real-time.
              </p>
            </div>

            {/* CARD 3 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <CheckCircle className="text-emerald-400" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 block">03 / MULTI-FACTOR SCORING</span>
              <h3 className="text-lg font-semibold text-white">Circular Diagnostics</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Neural network regression algorithms analyze vocabulary spread, code snippet proportions, and file coverage indices to rank documentation quality.
              </p>
            </div>

            {/* CARD 4 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <Lock className="text-[#8B5CF6]" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#8B5CF6] block">04 / SECURE LOCAL CACHING</span>
              <h3 className="text-lg font-semibold text-white">Persisted Archives</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Compiled markdown files map onto persistent client-side datasets ensuring zero code layouts vanish during browser refreshing.
              </p>
            </div>

            {/* CARD 5 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <Layers className="text-[#06B6D4]" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#06B6D4] block">05 / SYMMETRICAL STRUCTURE</span>
              <h3 className="text-lg font-semibold text-white">Modular Skeletons</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Generates pristine markdown complete with dynamic SVG badges, setup rules, testing blocks, API endpoints, and clean templates.
              </p>
            </div>

            {/* CARD 6 */}
            <div className="feature-card space-y-4">
              <div className="icon-box">
                <Download className="text-emerald-400" size={20} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 block">06 / DOWNLOAD READY</span>
              <h3 className="text-lg font-semibold text-white">Instant Exporters</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Copy generated text vectors straight to system clipboards or export files as standalone `.md` assets with a single click.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: WORKSPACE DOCK ── */}
      <section id="workspace" className="py-24 px-6 bg-black/40 border-t border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono block">
              // 03 — INTERACTIVE WORKSPACE
            </span>
            <h2 className="text-4xl md:text-5xl text-white">
              Stylerate <span className="shimmer-text">station.</span>
            </h2>
          </div>

          {/* Render target children workspace dashboard */}
          <div className="glass-panel p-6 md:p-10 border border-white/10 relative">
            <div className="scanline"></div>
            {children}
          </div>

        </div>
      </section>

      {/* ── SECTION 4: SPECIFICATION METRICS ── */}
      <section id="specs-dashboard" className="py-24 px-6 max-w-7xl mx-auto relative z-10 font-mono text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          <div className="space-y-8">
            <div className="space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono block">
                04 — SYSTEM SPECIFICATIONS
              </span>
              <h2 className="text-4xl text-white font-display-serif font-light">
                Parameters.
              </h2>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6 text-[11px] text-neutral-400">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-500">HYBRID ARCHITECT:</span>
                <span className="text-white">TensorFlow.js Core + Gemini API</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-500">CLASSIFIER MODEL:</span>
                <span className="text-white">Fully Connected 10-target Dense Classifier</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-500">RECOMMENDER VECTOR:</span>
                <span className="text-[#8B5CF6] font-bold">Cosine Similarity Threshold &gt;= 0.65</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-500">DATA PRIVACY STATUS:</span>
                <span className="text-emerald-400 font-bold">100% Sandbox Isolated (Browser fit)</span>
              </div>
            </div>
          </div>

          {/* Symmetrical stats layout */}
          <div className="glass-panel p-6 border border-white/10 bg-black/85">
            <div className="flex justify-between border-b border-white/5 pb-3 mb-4 text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
              <span>System monitor // active_loop</span>
              <span className="text-[#8B5CF6]">Secure loop</span>
            </div>
            <div className="space-y-2 text-neutral-400 text-[10.5px] leading-relaxed">
              <div>&gt; connecting client nodes... connected</div>
              <div>&gt; fetched history templates... loaded {user ? 'user_records' : 'guest_records'}</div>
              <div>&gt; categorizing layers... ready to process</div>
              <div className="text-[#06B6D4] font-bold">&gt; client workspace optimization mapping ready.</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 5: COMMUNITY & CONTACT (Open Source Website) ── */}
      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="space-y-12">
          <div className="space-y-4 animate-on-reveal">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono block">
              // 05 — OPEN SOURCE & CONTACT
            </span>
            <h2 className="text-4xl md:text-6xl text-white">
              Sincere <span className="shimmer-text">Open Source.</span>
            </h2>
            <p className="text-sm text-neutral-400 font-light max-w-2xl">
              README Stylerate is a fully public-facing open-source website. Use it to build beautiful, rich README files with zero licensing limitations or premium gatekeeping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* TIER 1 - OPEN SOURCE */}
            <div className={`glass-panel p-8 border hover:translate-y-[-6px] flex flex-col justify-between space-y-6 transition border-white/5`}>
              <div className="space-y-4">
                <div className="flex justify-between font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-[#8B5CF6] font-bold">100% Open Source</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono">FREE</span>
                </div>
                <div className="text-4xl text-white font-display-serif">Free <span className="text-xs text-[#737373] font-sans">/ Forever</span></div>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Excellent transparent workspace to generate, customize, and score technical GitHub README.md templates with privacy preserved.
                </p>
                <ul className="text-[10.5px] text-neutral-500 font-mono space-y-1.5 pt-2">
                  <li>✔ Full manual and URL extraction modes</li>
                  <li>✔ Streamed Gemini documentation matrix</li>
                  <li>✔ Adaptive token-limit code compression</li>
                  <li>✔ 100% Sandbox Isolated browser state</li>
                </ul>
              </div>
              <button 
                onClick={handleGuestLogin}
                className="w-full py-2 bg-white/5 hover:bg-[#8B5CF6]/10 hover:text-white hover:border-[#8B5CF6] text-xs font-mono font-bold rounded-lg border border-white/10 text-neutral-300 transition cursor-pointer"
              >
                DEPLOY SANDBOX
              </button>
            </div>

            {/* TIER 2 - EMAIL CONTACT */}
            <div className="glass-panel p-8 border border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.02] hover:translate-y-[-6px] flex flex-col justify-between space-y-6 transition shadow-[0_0_24px_rgba(139,92,246,0.08)]">
              <div className="space-y-4">
                <div className="flex justify-between font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-[#06B6D4] font-bold">Email Support</span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold font-mono">ACTIVE</span>
                </div>
                <div className="text-2xl text-white font-sans font-semibold tracking-tight break-all">rishijain30a@gmail.com</div>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  For engineering questions, custom system integrations, feature updates, or directly submitting unique README design recommendations.
                </p>
                <ul className="text-[10.5px] text-neutral-500 font-mono space-y-1.5 pt-2">
                  <li>✔ Bug reports and platform suggestions</li>
                  <li>✔ Custom ML classifications inquiries</li>
                  <li>✔ Fast technical response timelines</li>
                  <li>✔ Open collaboration models discussion</li>
                </ul>
              </div>
              <a 
                href="mailto:rishijain30a@gmail.com"
                className="w-full text-center py-2 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold rounded-lg text-xs font-mono transition cursor-pointer block"
              >
                SEND EMAIL INQUIRY
              </a>
            </div>

            {/* TIER 3 - LINKEDIN */}
            <div className="glass-panel p-8 border border-white/5 hover:translate-y-[-6px] flex flex-col justify-between space-y-6 transition">
              <div className="space-y-4">
                <div className="flex justify-between font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-[#737373] font-bold">LinkedIn Connect</span>
                  <span className="text-[9px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded font-bold font-mono">NETWORK</span>
                </div>
                <div className="text-2xl text-white font-sans font-semibold tracking-tight">Rishi Jain</div>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Connect with Rishi to track technical projects, check ongoing work, share thoughts on automated web scaling, or request consulting details.
                </p>
                <ul className="text-[10.5px] text-neutral-500 font-mono space-y-1.5 pt-2">
                  <li>✔ Direct corporate connection pipeline</li>
                  <li>✔ Track upcoming workspace updates</li>
                  <li>✔ Algorithmic intelligence and code tips</li>
                  <li>✔ Professional networking channel</li>
                </ul>
              </div>
              <a 
                href="https://www.linkedin.com/in/rishi-jain-837b75312"
                target="_blank"
                rel="noreferrer noopener"
                className="w-full text-center py-2 bg-white/5 hover:bg-neutral-900 text-xs font-mono font-bold rounded-lg border border-white/10 text-neutral-300 transition cursor-pointer block"
              >
                CONNECT ON LINKEDIN
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── CORE SYSTEM FOOTER ── */}
      <footer className="border-t border-white/5 bg-[#030303]/80 py-12 px-6 max-w-7xl mx-auto relative z-10 font-mono text-[10.5px] text-[#737373] flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>README Stylerate v2.0 — TensorFlow.js core fitting models</span>
        <span className="flex items-center gap-1 text-neutral-400 hover:text-white transition cursor-pointer">
          <Github size={12} /> Apache 2.0 Open Source Sandbox
        </span>
      </footer>

    </div>
  );
}
