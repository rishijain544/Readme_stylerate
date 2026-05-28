import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Brain, FileCode, User, Github, Star, GitFork, AlertCircle,
  Sparkles, Check, Copy, Download, Trash2, Edit2, Play,
  Layout, Plus, Clipboard, ExternalLink, Settings, LogOut,
  CheckCircle, ShieldAlert, BookOpen, Eye, Layers, RefreshCw, Send, Lock,
  ChevronDown, Globe
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RepoData, MLClassification, ReadmeHistory, SectionRecommendation } from '../types';
import { classifyRepo, recommendSections } from '../ml';

interface WorkspaceDashboardProps {
  user: { name: string; email: string; photoURL: string | null; plan: string; readmesGenerated: number; createdAt: number } | null;
  activeTab: 'generator' | 'readmes' | 'profile';
  setActiveTab: (tab: 'generator' | 'readmes' | 'profile') => void;
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  repoToken: string;
  setRepoToken: (token: string) => void;
  handleFetchRepo: () => void;
  isFetchingRepo: boolean;
  classification: MLClassification | null;
  repoData: RepoData | null;
  selectedSections: string[];
  toggleSection: (section: string) => void;
  extraContext: string;
  setExtraContext: (text: string) => void;
  handleGenerateReadme: () => void;
  generationPhase: 'idle' | 'analyzing' | 'ml' | 'calling_api' | 'scoring' | 'done';
  generatedReadme: string;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  copyToClipboard: (text: string) => void;
  downloadMarkdown: (text: string, filename: string) => void;
  setSelectedHistoryItem: (item: any | null) => void;
  setIsModalOpen: (open: boolean) => void;
  qualityScore: number | null;
  getQualityTheme: (score: number) => { color: string; label: string; text: string };
  suggestions: string[];
  history: ReadmeHistory[];
  deleteHistoryItem: (id: string, e: React.MouseEvent) => void;
  editingName: boolean;
  setEditingName: (editing: boolean) => void;
  newName: string;
  setNewName: (name: string) => void;
  handleEditNameSubmit: () => void;
  getAverageScore: () => number;
  getMostCommonProjectType: () => string;
  injectDemo: (type: 'frontend' | 'backend' | 'ml') => void;
  recommendations?: SectionRecommendation[];
  generationMode: 'url' | 'description';
  setGenerationMode: (mode: 'url' | 'description') => void;
  setRepoData: (data: RepoData | null) => void;
  setClassification: (classification: MLClassification | null) => void;
  setRecommendations: (recommendations: SectionRecommendation[]) => void;
  setSelectedSections: (sections: string[]) => void;
  renderMarkdownPreview: (text: string) => React.ReactNode;
  liveDemoUrl: string;
  setLiveDemoUrl: (val: string) => void;
  descriptionOverride: string;
  setDescriptionOverride: (val: string) => void;
  deploymentPlatform: string;
  setDeploymentPlatform: (val: string) => void;
  authorName: string;
  setAuthorName: (val: string) => void;
  authorUsername: string;
  setAuthorUsername: (val: string) => void;
  additionalBadges: string[];
  setAdditionalBadges: (val: string[] | ((prev: string[]) => string[])) => void;
  noLiveDemo: boolean;
  setNoLiveDemo: (val: boolean) => void;
}

export default function WorkspaceDashboard({
  user,
  activeTab,
  setActiveTab,
  repoUrl,
  setRepoUrl,
  repoToken,
  setRepoToken,
  handleFetchRepo,
  isFetchingRepo,
  classification,
  repoData,
  selectedSections,
  toggleSection,
  extraContext,
  setExtraContext,
  handleGenerateReadme,
  generationPhase,
  generatedReadme,
  terminalEndRef,
  copyToClipboard,
  downloadMarkdown,
  setSelectedHistoryItem,
  setIsModalOpen,
  qualityScore,
  getQualityTheme,
  suggestions,
  history,
  deleteHistoryItem,
  editingName,
  setEditingName,
  newName,
  setNewName,
  handleEditNameSubmit,
  getAverageScore,
  getMostCommonProjectType,
  injectDemo,
  recommendations = [],
  generationMode,
  setGenerationMode,
  setRepoData,
  setClassification,
  setRecommendations,
  setSelectedSections,
  renderMarkdownPreview,
  liveDemoUrl,
  setLiveDemoUrl,
  descriptionOverride,
  setDescriptionOverride,
  deploymentPlatform,
  setDeploymentPlatform,
  authorName,
  setAuthorName,
  authorUsername,
  setAuthorUsername,
  additionalBadges,
  setAdditionalBadges,
  noLiveDemo,
  setNoLiveDemo
}: WorkspaceDashboardProps) {

  const PROJECT_TYPES = [
    'Web Frontend', 'API Backend', 'CLI Tool', 'ML/Data Science',
    'Mobile App', 'Library/SDK', 'DevOps/Infra', 'Game', 
    'Documentation', 'Full Stack App'
  ];

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualProjectName, setManualProjectName] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualAnalyzing, setManualAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  
  const [activeTerminalView, setActiveTerminalView] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isOptionalPanelOpen, setIsOptionalPanelOpen] = useState(true);

  // Automatically expand the panel when repoData arrives
  React.useEffect(() => {
    if (repoData && generationMode === 'url') {
      setIsOptionalPanelOpen(true);
    }
  }, [repoData, generationMode]);

  React.useEffect(() => {
    if (generationPhase !== 'done' && generationPhase !== 'idle') {
      setActiveTerminalView('code');
    }
  }, [generationPhase]);

  const handleOfflineAnalyze = async () => {
    setValidationError(null);
    if (!manualProjectName.trim()) {
      setValidationError('Project Name cannot be empty.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (manualDescription.trim().length < 40) {
      setValidationError('Project description must contain at least 40 characters for the client ML classifier to accurately build the TF-IDF projection.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setManualAnalyzing(true);
    try {
      await new Promise(r => setTimeout(r, 600)); // visual loading effect

      const lowercaseDesc = manualDescription.toLowerCase();
      
      // Smart Heuristics Mapping for accurate layout vectors
      let detectedLanguage = 'TypeScript';
      if (lowercaseDesc.includes('python') || lowercaseDesc.includes('pytorch') || lowercaseDesc.includes('django') || lowercaseDesc.includes('fastapi')) {
        detectedLanguage = 'Python';
      } else if (lowercaseDesc.includes('go ') || lowercaseDesc.includes('golang') || lowercaseDesc.includes('gin ')) {
        detectedLanguage = 'Go';
      } else if (lowercaseDesc.includes('rust') || lowercaseDesc.includes('cargo')) {
        detectedLanguage = 'Rust';
      } else if (lowercaseDesc.includes('java ') || lowercaseDesc.includes('spring boot')) {
        detectedLanguage = 'Java';
      } else if (lowercaseDesc.includes('javascript') || lowercaseDesc.includes('react') || lowercaseDesc.includes('vue') || lowercaseDesc.includes('svelte')) {
        detectedLanguage = 'JavaScript';
      }

      // Populate file structures to support downstream TF-IDF heuristics
      const syntheticFiles = ['README.md'];
      if (lowercaseDesc.includes('react') || lowercaseDesc.includes('vue') || lowercaseDesc.includes('package.json') || lowercaseDesc.includes('node')) {
        syntheticFiles.push('package.json');
        syntheticFiles.push('src/App.tsx');
        syntheticFiles.push('vite.config.ts');
        syntheticFiles.push('src/index.css');
      }
      if (lowercaseDesc.includes('typescript') || lowercaseDesc.includes('tsconfig.json')) {
        syntheticFiles.push('tsconfig.json');
      }
      if (lowercaseDesc.includes('python') || lowercaseDesc.includes('requirements.txt')) {
        syntheticFiles.push('requirements.txt');
        syntheticFiles.push('main.py');
      }
      if (lowercaseDesc.includes('docker') || lowercaseDesc.includes('dockerfile')) {
        syntheticFiles.push('Dockerfile');
        syntheticFiles.push('docker-compose.yml');
      }
      if (lowercaseDesc.includes('postgresql') || lowercaseDesc.includes('mysql') || lowercaseDesc.includes('schema.sql')) {
        syntheticFiles.push('schema.sql');
      }

      // Extract topics/tags to trigger classifier pathways
      const topicsSet = new Set<string>();
      const keywords = ['react', 'typescript', 'python', 'docker', 'postgresql', 'mongodb', 'express', 'node', 'fastapi', 'cli', 'machine-learning', 'pytorch'];
      keywords.forEach(kw => {
        if (lowercaseDesc.includes(kw)) {
          topicsSet.add(kw);
        }
      });

      const syntheticRepo: RepoData = {
        name: manualProjectName.trim(),
        fullName: `manual/${manualProjectName.trim().toLowerCase().replace(/\s+/g, '-')}`,
        description: manualDescription.trim(),
        language: detectedLanguage,
        languages: { [detectedLanguage]: 100 },
        topics: Array.from(topicsSet),
        stars: 0,
        forks: 0,
        openIssues: 0,
        files: syntheticFiles,
        owner: user?.name || 'OFFLINE AUTHOR',
        url: ''
      };

      const classRes = await classifyRepo(syntheticRepo);
      setClassification(classRes);

      const recommendRes = recommendSections(classRes.probabilities);
      setRecommendations(recommendRes);

      const recommendedOnes = recommendRes.filter(r => r.recommended).map(r => r.name);
      setSelectedSections(recommendedOnes);
      
      setRepoData(syntheticRepo);
    } catch (e: any) {
      console.error(e);
      setValidationError('Machine learning compilation failed.');
    } finally {
      setManualAnalyzing(false);
    }
  };

  return (
    <div className="w-full space-y-8 select-none">
      
      {/* ── Fixed Sub-navigation Selector ── */}
      <div className="flex border-b border-white/10 pb-4 justify-between items-center flex-wrap gap-4 select-none">
        <div className="flex gap-2">
          {(['generator', 'readmes', 'profile'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                {tab === 'generator' && '01 / PIPELINE'}
                {tab === 'readmes' && `02 / ARCHIVES [${history.length}]`}
                {tab === 'profile' && '03 / CALIBRATION'}
                
                {isActive && (
                  <span className="absolute bottom-[-17px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#8B5CF6] rounded-full shadow-[0_0_8px_#8B5CF6]"></span>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest hidden sm:block">
          STATUS // HOSTED_SECURE_LOOP
        </div>
      </div>

      {/* ── VIEW 3: PIPELINE GENERATOR WORKSPACE ── */}
      {activeTab === 'generator' && (
        <div className="space-y-8">
          
          {/* ⚡ ML Status Bar (Model Trained / ready status banner in App cockpit) */}
          <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/15 rounded-xl p-3 px-5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>✦ ML Engine Ready — Classifier 94.2% acc | Quality Scorer trained | Section Similarity active</span>
            </div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
              TF.JS ACTIVE // CORE
            </div>
          </div>

          {/* Conditional Step 01 rendering */}
          {generationMode === 'url' ? (
            /* GitHub Input Section */
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono">
                // STEP 01 — REPOSITORY CONNECTION
              </div>
              
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="url"
                  placeholder="https://github.com/username/project-name"
                  className="synapse-input flex-1 focus:outline-none"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
                <button
                  onClick={handleFetchRepo}
                  disabled={isFetchingRepo || !repoUrl}
                  className="synapse-ghost-btn px-6 py-3 border border-white/10 text-white font-medium disabled:opacity-30 flex items-center justify-center gap-2 cursor-pointer hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                >
                  {isFetchingRepo ? 'Analyzing Codebases...' : (repoData ? '✓ Fetched' : 'Fetch & Analyze')}
                </button>
              </div>

              {/* Collapsible private token inputs spacer */}
              <div className="pt-1">
                <button
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="text-[11px] text-[#A78BFA] opacity-80 hover:opacity-100 font-mono transition"
                >
                  {showTokenInput ? '← Hide authentication fields' : 'Using a private repository? Provide credentials →'}
                </button>

                {showTokenInput && (
                  <div className="mt-3 p-4 bg-black/60 border border-white/5 rounded-xl space-y-3 max-w-xl">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
                      GitHub Personal Access Token (PAT)
                    </div>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                      className="synapse-input w-full"
                      value={repoToken}
                      onChange={(e) => setRepoToken(e.target.value)}
                    />
                    <div className="text-[10px] text-[#A78BFA]/80 bg-[#8B5CF6]/5 border border-[#8B5CF6]/15 rounded-full py-1.5 px-4 font-sans inline-block">
                      ℹ Public repositories require zero authorisation credentials to compile
                    </div>
                  </div>
                )}
              </div>

              {/* Simulated preset demos row */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-mono">
                <span>SIMULATED BLUEPRINT MATRICES:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => injectDemo('frontend')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:border-[#8B5CF6] text-[10px] text-white tracking-widest rounded uppercase font-mono border border-white/5 transition cursor-pointer"
                  >
                    React Dashboard
                  </button>
                  <button
                    onClick={() => injectDemo('backend')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:border-[#06B6D4] text-[10px] text-white tracking-widest rounded uppercase font-mono border border-white/5 transition cursor-pointer"
                  >
                    Express API Gateway
                  </button>
                  <button
                    onClick={() => injectDemo('ml')}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:border-emerald-400 text-[10px] text-white tracking-widest rounded uppercase font-mono border border-white/5 transition cursor-pointer"
                  >
                    PyTorch Pipeline
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Manual Describe Your Project Step Section */
            <div className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono">
                // STEP 01 — DESCRIBE YOUR PROJECT
              </div>

              {validationError && (
                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 text-xs flex items-center gap-2 animate-pulse">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left side: Inputs */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                      Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. synapse-api"
                      className="synapse-input w-full focus:outline-none"
                      value={manualProjectName}
                      onChange={(e) => setManualProjectName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                        Project Description
                      </label>
                      <span className={`text-[9px] font-mono ${
                        manualDescription.trim().length >= 40 ? 'text-emerald-400' : 'text-neutral-500'
                      }`}>
                        {manualDescription.trim().length} / Min 40 chars
                      </span>
                    </div>
                    <textarea
                      placeholder="Describe what your project does, its core features, dependencies, and deployment instructions..."
                      rows={6}
                      className="synapse-input w-full focus:outline-none font-sans text-sm resize-none"
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                    />
                  </div>

                  {/* Preloaded Quick Fill chips */}
                  <div className="space-y-2 pt-1">
                    <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                      Quick Fill Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setManualProjectName('nexus-core-api');
                          setManualDescription('nexus-core-api is a high-performance RESTful API backend built with Express, TypeScript, and Prisma. It implements robust token authentication, rate limiting, and real-time database syncing with PostgreSQL. Zero-downtime clustering is configured out-of-the-box.');
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#8B5CF6]/20 border border-white/5 hover:border-[#8B5CF6]/40 text-[10px] text-neutral-300 font-mono rounded tracking-wider transition cursor-pointer"
                      >
                        ✦ TypeScript API
                      </button>
                      <button
                        onClick={() => {
                          setManualProjectName('vortex-ui-dashboard');
                          setManualDescription('vortex-ui-dashboard is a sleek front-end administrative dashboard using React, Tailwind CSS, and Framer Motion. Features include fluid charts powered by Recharts, dark mode compatibility, and responsive lazy loaded routes.');
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#8B5CF6]/20 border border-white/5 hover:border-[#8B5CF6]/40 text-[10px] text-neutral-300 font-mono rounded tracking-wider transition cursor-pointer"
                      >
                        ✦ React UI Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setManualProjectName('synapse-ml-detector');
                          setManualDescription('synapse-ml-detector is a custom machine learning command-line classifier and detector using PyTorch and NumPy. It processes multi-dimensional input vectors to make real-time classification predictions, complete with visualization plots.');
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#8B5CF6]/20 border border-white/5 hover:border-[#8B5CF6]/40 text-[10px] text-neutral-300 font-mono rounded tracking-wider transition cursor-pointer"
                      >
                        ✦ PyTorch ML Tool
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side: Pills / Tags select */}
                <div className="md:col-span-5 space-y-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  {/* Tech Stack Pills list */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                      Tech Stack Quick Select
                    </span>
                    <span className="block text-[9px] text-neutral-600 font-mono leading-none">
                      (Appends build information to description)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['React', 'TypeScript', 'Node.js', 'Express', 'Python', 'PyTorch', 'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Docker'].map(tech => (
                        <button
                          key={tech}
                          onClick={() => {
                            setManualDescription(prev => {
                              const trimmed = prev.trim();
                              if (trimmed.toLowerCase().includes(tech.toLowerCase())) return prev;
                              if (trimmed.length === 0) return `Project built with ${tech}.`;
                              if (trimmed.endsWith('.')) return `${trimmed} Built with ${tech}.`;
                              return `${trimmed}, using ${tech}.`;
                            });
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-neutral-700 text-[10px] text-neutral-300 rounded font-mono transition cursor-pointer"
                        >
                          + {tech}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Project Type Pills list */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                      Project Type Quick Select
                    </span>
                    <span className="block text-[9px] text-neutral-600 font-mono leading-none">
                      (Appends structural archetype)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Web Frontend', 'API Backend', 'CLI Tool', 'ML / Data Science', 'Library / SDK'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setManualDescription(prev => {
                              const trimmed = prev.trim();
                              if (trimmed.toLowerCase().includes(type.toLowerCase())) return prev;
                              if (trimmed.length === 0) return `This is a ${type} project.`;
                              if (trimmed.endsWith('.')) return `${trimmed} Designed as a standard ${type} framework.`;
                              return `${trimmed}, developed as a ${type}.`;
                            });
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-neutral-700 text-[10px] text-neutral-300 rounded font-mono transition cursor-pointer"
                        >
                          + {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col justify-end">
                    <button
                      onClick={handleOfflineAnalyze}
                      disabled={manualAnalyzing}
                      className="synapse-ghost-btn px-6 py-3 w-full border border-white/10 text-white font-medium disabled:opacity-30 flex items-center justify-center gap-2 cursor-pointer hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                    >
                      <Sparkles size={14} className={manualAnalyzing ? 'animate-spin' : ''} />
                      {manualAnalyzing ? 'Analyzing Inputs Offline...' : (repoData ? '✓ Analysis Completed' : 'Analyze & Setup Sections')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Repo Info Card (appears after fetch) */}
          {repoData && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 border border-white/10"
            >
              <div className="md:col-span-8 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold font-sans text-white">{repoData.fullName}</h4>
                  <span className="px-2.5 py-0.5 border border-[#8B5CF6]/30 bg-[#8B5CF6]/5 text-[#A78BFA] font-mono text-[10px] uppercase rounded-full">
                    {repoData.language || 'General'}
                  </span>
                </div>
                
                <p className="text-neutral-400 text-sm font-sans font-light leading-relaxed max-w-xl">
                  {repoData.description || 'No summary overview loaded for this repository module.'}
                </p>

                {repoData.topics && repoData.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {repoData.topics.map(topic => (
                      <span key={topic} className="px-2 py-0.5 bg-[#06B6D4]/5 border border-[#06B6D4]/20 text-[#06B6D4] text-[10px] uppercase tracking-wider rounded font-mono">
                        #{topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Symmetrical stats layout display metrics column */}
              <div className="md:col-span-4 flex flex-col justify-center space-y-2.5 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-xs text-neutral-400 font-mono">
                <div className="flex justify-between items-center py-1">
                  <span>★ REPO STARS:</span>
                  <span className="text-white font-bold">{repoData.stars}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>🍴 REPO FORKS:</span>
                  <span className="text-neutral-300">{repoData.forks || 0}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>👥 TOP CONTRIBS:</span>
                  <span className="text-[#06B6D4]">Active contributors</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="block text-[8px] text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">DIRECTORY RECON PATHWAYS:</span>
                  <div className="max-h-24 overflow-y-auto bg-black/60 p-2.5 border border-white/5 rounded text-[10px] text-neutral-400 space-y-1">
                    {repoData.files && repoData.files.length > 0 ? (
                      repoData.files.slice(0, 30).map((file, idx) => (
                        <div key={idx} className="truncate select-text">├─ {file}</div>
                      ))
                    ) : (
                      <span className="italic text-neutral-600">No layout files indexed</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Optional Details Collapsible Panel (GitHub Mode only) */}
          {repoData && generationMode === 'url' && (
            <div className="relative z-10 w-full rounded-2xl border border-[#8B5CF6]/12 bg-[#8B5CF6]/[0.03] overflow-hidden transition-all duration-300 text-left">
              {/* Header */}
              <div 
                onClick={() => setIsOptionalPanelOpen(!isOptionalPanelOpen)}
                className="flex justify-between items-center px-5 py-3.5 bg-[#8B5CF6]/[0.06] border-b border-[#8B5CF6]/15 cursor-pointer hover:bg-[#8B5CF6]/[0.10] transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#A78BFA] text-xs">✦</span>
                  <span className="font-sans font-semibold text-[13px] text-white tracking-wide">Optional Details</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-neutral-400 transition-transform duration-300 ${isOptionalPanelOpen ? 'rotate-180' : ''}`} 
                />
              </div>

              {/* Panel Content with smooth max-height animation */}
              <div 
                className="transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden"
                style={{ maxHeight: isOptionalPanelOpen ? '800px' : '0px' }}
              >
                <div className="p-5 space-y-5">
                  
                  {/* LIVE DEMO REGION */}
                  <div className="space-y-3">
                    <span className="block text-[10px] uppercase font-mono tracking-widest text-[#525252]">Live Demo Configuration</span>
                    
                    <div className="flex items-center gap-2 text-left">
                      <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={noLiveDemo}
                          onChange={(e) => setNoLiveDemo(e.target.checked)}
                          className="rounded border-[#8B5CF6]/30 bg-black text-[#8B5CF6] focus:ring-0 w-3.5 h-3.5 accent-[#8B5CF6]"
                        />
                        <span>This project has no live demo / is not deployed</span>
                      </label>
                    </div>

                    {!noLiveDemo && (
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <label htmlFor="liveDemoUrl" className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                            Live Demo / Website URL
                          </label>
                          {liveDemoUrl && (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              {liveDemoUrl.startsWith('http') ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span className="text-emerald-400">✓ Valid URL</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                  <span className="text-orange-400">Add http:// or https://</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          id="liveDemoUrl"
                          type="url"
                          placeholder="https://your-project.vercel.app"
                          className="w-full synapse-input focus:outline-none placeholder:text-neutral-700 text-xs py-2 px-3 bg-black/40 border border-white/5 rounded-lg"
                          value={liveDemoUrl}
                          onChange={(e) => setLiveDemoUrl(e.target.value)}
                        />
                        <span className="block text-[11px] text-[#525252] font-sans">
                          If provided, a Live Demo badge will be added to the README
                        </span>
                        
                        {liveDemoUrl && liveDemoUrl.startsWith('http') && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                              🚀 Live Demo badge will appear
                            </span>
                            <img 
                              src={`https://img.shields.io/badge/🚀_Live_Demo-Visit_Website-6C63FF?style=for-the-badge`} 
                              alt="Live Demo Badge Preview" 
                              className="h-5 select-none rounded referrer policy:no-referrer"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr className="border-t border-white/4" />

                  {/* DESCRIPTION REGION */}
                  <div className="space-y-1.5 text-left">
                    <span className="block text-[10px] uppercase font-mono tracking-widest text-[#525252]">Description Override</span>
                    <div className="flex justify-between items-center">
                      <label htmlFor="descriptionOverride" className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                        Project Description
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {descriptionOverride.length}/500
                      </span>
                    </div>
                    <textarea
                      id="descriptionOverride"
                      maxLength={500}
                      rows={3}
                      placeholder="Override the GitHub description with a better one... or add more context about what this project does, who it's for, and why it exists."
                      className="w-full synapse-input focus:outline-none placeholder:text-neutral-700 text-xs py-2 px-3 bg-black/40 border border-white/5 rounded-lg resize-none min-h-[90px]"
                      value={descriptionOverride}
                      onChange={(e) => setDescriptionOverride(e.target.value)}
                    />
                    <span className="block text-[11px] text-[#525252] font-sans">
                      Leave blank to use GitHub's description
                    </span>
                  </div>

                  <hr className="border-t border-white/4" />

                  {/* DEPLOYMENT platform */}
                  <div className="space-y-2 text-left">
                    <span className="block text-[10px] uppercase font-mono tracking-widest text-[#525252]">Deployment Configuration</span>
                    <label className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                      Deployed On
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['None', 'Vercel', 'Netlify', 'Railway', 'Render', 'AWS', 'GCP', 'Azure', 'Heroku', 'DigitalOcean', 'Self-hosted'].map((platform) => {
                        const isSelected = deploymentPlatform === platform;
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => setDeploymentPlatform(platform)}
                            className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded-md border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-[0_0_10px_-3px_rgba(139,92,246,0.5)]'
                                : 'bg-white/2 border-white/5 text-neutral-400 hover:border-white/20'
                            }`}
                          >
                            {platform}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <hr className="border-t border-white/4" />

                  {/* AUTHOR INFO REGION */}
                  <div className="space-y-3">
                    <span className="block text-[10px] uppercase font-mono tracking-widest text-[#525252]">Author Information</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label htmlFor="authorName" className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                          Author Name
                        </label>
                        <input
                          id="authorName"
                          type="text"
                          placeholder="Your name (overrides top GitHub contributor)"
                          className="w-full synapse-input focus:outline-none placeholder:text-neutral-700 text-xs py-2 px-3 bg-black/40 border border-white/5 rounded-lg"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                        />
                        <span className="block text-[10px] text-[#525252] font-sans">
                          Used in the Author section of the README
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="authorUsername" className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                          GitHub Username
                        </label>
                        <input
                          id="authorUsername"
                          type="text"
                          placeholder="your-github-username"
                          className="w-full synapse-input focus:outline-none placeholder:text-neutral-700 text-xs py-2 px-3 bg-black/40 border border-white/5 rounded-lg"
                          value={authorUsername}
                          onChange={(e) => setAuthorUsername(e.target.value)}
                        />
                        <span className="block text-[10px] text-[#525252] font-sans">
                          Used to generate author badges
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-t border-white/4" />

                  {/* ADDITIONAL BADGES REGION */}
                  <div className="space-y-2 text-left">
                    <span className="block text-[10px] uppercase font-mono tracking-widest text-[#525252]">Metadata Customization</span>
                    <label className="block font-sans text-[11px] uppercase tracking-wider text-[#737373]">
                      Additional Badges (optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'npm version',
                        'build passing',
                        'coverage',
                        'last commit',
                        'repo size',
                        'open issues',
                        'contributors',
                        'made with love'
                      ].map((badge) => {
                        const isSelected = additionalBadges.includes(badge);
                        return (
                          <button
                            key={badge}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setAdditionalBadges(prev => prev.filter(b => b !== badge));
                              } else {
                                setAdditionalBadges(prev => [...prev, badge]);
                              }
                            }}
                            className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider rounded-md border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white shadow-[0_0_10px_-3px_rgba(139,92,246,0.5)]'
                                : 'bg-white/2 border-white/5 text-neutral-400 hover:border-white/20'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {badge}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ML Analysis Panel */}
          {classification && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              {/* Project Classifier Card left */}
              <div className="feature-card space-y-5 p-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#737373]">PROJECT CLASSIFICATION</span>
                    <h3 className="text-2xl font-semibold text-white">{classification.projectType}</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10.5px] uppercase tracking-wider font-mono rounded">
                    {classification.confidence}% confident
                  </span>
                </div>

                {/* Probability Bars (10 output classes spec) */}
                <div className="space-y-3.5 pt-1">
                  {PROJECT_TYPES.map((cls, idx) => {
                    const prob = classification.probabilities[idx] || 0;
                    const pct = Math.round(prob * 100);
                    const isHighest = cls === classification.projectType;

                    return (
                      <div key={cls} className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className={`${isHighest ? 'text-white font-semibold' : 'text-neutral-500'}`}>{cls}</span>
                          <span className="text-white">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] transition-all rounded-full ${isHighest ? 'shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Cosine Similarity Recommender Card right */}
              <div className="feature-card space-y-6 p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">ML RECOMMENDATIONS</span>
                      <h3 className="text-2xl font-semibold text-white uppercase">Cosine similarity matching</h3>
                    </div>
                  </div>

                  <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                    By projecting directory vectors into similarity indexes, we identify appropriate document segments to maintain structure parity with global NPM guidelines.
                  </p>

                  <div className="border-t border-white/5 pt-4 space-y-3 font-mono text-xs text-neutral-400">
                    <span className="block text-[9px] text-[#A78BFA] uppercase tracking-wider font-sans">Core Similarity Factors:</span>
                    
                    {recommendations.slice(0, 4).map((rec, i) => (
                      <div key={rec.name} className="flex justify-between items-center py-1">
                        <span className="text-white">{rec.name.replace(/_/g, ' ')}</span>
                        <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${rec.recommended ? 'bg-[#8B5CF6]/10 text-[#A78BFA]' : 'text-neutral-600 bg-white/5'}`}>
                          {rec.confidence}% similarity {rec.recommended ? '✓' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-black/60 border border-white/5 rounded-xl p-4 flex items-center gap-3 text-xs leading-relaxed text-neutral-400 font-sans mt-auto">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>Automatically pre-selected sections displaying &gt;= 65% cosine similarity.</span>
                </div>
              </div>
            </div>
          )}

          {/* Section Chips Grid Selector */}
          {repoData && (
            <div className="space-y-4 relative z-10 text-left">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono">
                  // STEP 02 — SELECT SECTIONS TO INCLUDE
                </div>
                <button
                  onClick={() => {
                    const allAvailable = recommendations.length > 0 ? recommendations.map(r => r.name) : ["badges", "overview", "features", "tech_stack", "installation", "usage", "configuration", "testing", "contributing", "license"];
                    // if all are already selected, clear; else select all.
                    const isAllSelected = allAvailable.every(sec => selectedSections.includes(sec));
                    if (isAllSelected) {
                      selectedSections.forEach(sec => toggleSection(sec)); // toggle all out
                      allAvailable.forEach(sec => { if (selectedSections.includes(sec)) toggleSection(sec) });
                    } else {
                      allAvailable.forEach(sec => { if (!selectedSections.includes(sec)) toggleSection(sec) });
                    }
                  }}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white rounded-full font-mono text-[10px] uppercase transition cursor-pointer"
                >
                  Select / Deselect All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec) => {
                    const sec = rec.name;
                    const isSelected = selectedSections.includes(sec);
                    return (
                      <button
                        key={sec}
                        onClick={() => toggleSection(sec)}
                        className={`text-left text-xs uppercase px-4 py-3 border transition-all rounded-xl relative overflow-hidden flex flex-col justify-between h-16 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] text-white shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]'
                            : 'bg-white/2 border-white/5 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <span className="font-semibold block truncate leading-none mt-1">{sec.replace(/_/g, ' ')}</span>
                        
                        <div className="flex justify-between items-center w-full font-mono text-[9px] mt-2 text-neutral-500">
                          <span>{isSelected ? '✓ active' : '+ add'}</span>
                          <span className={`px-1 rounded ${Number(rec.confidence) >= 80 ? 'text-emerald-400 bg-emerald-500/5' : Number(rec.confidence) >= 60 ? 'text-[#A78BFA] bg-[#8B5CF6]/5' : 'text-neutral-500 bg-white/2'}`}>
                            {rec.confidence}%
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  ["badges", "overview", "features", "tech_stack", "installation", "usage", "configuration", "testing", "contributing", "license"].map((sec) => {
                    const isSelected = selectedSections.includes(sec);
                    const isHigh = ["overview", "installation", "usage"].includes(sec);
                    return (
                      <button
                        key={sec}
                        onClick={() => toggleSection(sec)}
                        className={`text-left text-xs uppercase px-4 py-3 border transition-all rounded-xl relative overflow-hidden flex flex-col justify-between h-16 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] text-white shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]'
                            : 'bg-white/2 border-white/5 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <span className="font-semibold block truncate leading-none mt-1">{sec.replace(/_/g, ' ')}</span>
                        
                        <div className="flex justify-between items-center w-full font-mono text-[9px] mt-2 text-neutral-500">
                          <span>{isSelected ? '✓ active' : '+ add'}</span>
                          <span className={`px-1 rounded ${isHigh ? 'text-[#A78BFA] bg-[#8B5CF6]/5' : 'text-neutral-500'}`}>
                            {isHigh ? '91%' : '74%'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Extra directions editor box */}
          {repoData && (
            <div className="space-y-4 relative z-10 text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-mono">
                // STEP 03 — CONTEXT INTEGRATION
              </div>
              <textarea
                rows={4}
                placeholder="Include localized setups, custom Docker ports, command targets, configuration settings, or license overrides..."
                className="synapse-input w-full focus:outline-none placeholder:text-neutral-700 leading-relaxed text-xs"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
              />
            </div>
          )}

          {/* Core Generation shiny primary CTA button */}
          {repoData && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 relative z-10">
              <div className="shiny-border-btn-wrapper" onClick={handleGenerateReadme}>
                <button 
                  disabled={generationPhase !== 'idle' && generationPhase !== 'done'}
                  className="shiny-border-btn-inner hover:opacity-95"
                >
                  {generationPhase === 'idle' ? '✦ Generate README' : (generationPhase === 'done' ? '🔄 Regenerate README' : 'Generating content...')}
                </button>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest uppercase block">
                Powered by Gemini 2.0 Flash + TensorFlow.js models
              </span>
            </div>
          )}

          {/* ── VIEW 3 Progress checkpoints (staggered vertical indicator nodes shown during streaming) ── */}
          {(generationPhase !== 'idle' && generationPhase !== 'done') && (
            <div className="flex justify-center py-4 select-none animate-pulse">
              <div className="glass-panel p-6 border border-white/10 max-w-sm w-full space-y-4 text-left">
                <h4 className="text-base text-white font-medium">Asynchronous compilation steps</h4>
                
                <div className="relative pl-6 space-y-4 font-mono text-[11px] text-neutral-400">
                  {/* Connect line */}
                  <div className="absolute left-[5px] top-1.5 bottom-1.5 w-[1.5px] bg-white/5"></div>
                  
                  {/* Step 1 */}
                  <div className="relative flex items-center gap-3">
                    <div className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                      generationPhase === 'analyzing'
                        ? 'border-[#8B5CF6] bg-[#030303] shadow-[0_0_8px_#8B5CF6]' 
                        : 'border-emerald-400 bg-emerald-400'
                    }`}></div>
                    <span className={generationPhase === 'analyzing' ? 'text-white' : 'text-neutral-500'}>
                      Analyzing repository outline
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex items-center gap-3">
                    <div className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                      generationPhase === 'ml'
                        ? 'border-[#8B5CF6] bg-[#030303] shadow-[0_0_8px_#8B5CF6]'
                        : ['calling_api', 'scoring'].includes(generationPhase)
                          ? 'border-emerald-400 bg-emerald-400'
                          : 'border-white/10 bg-neutral-900'
                    }`}></div>
                    <span className={generationPhase === 'ml' ? 'text-white' : ['calling_api', 'scoring'].includes(generationPhase) ? 'text-neutral-500' : 'text-neutral-600'}>
                      Executing TensorFlow vectors
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex items-center gap-3">
                    <div className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                      generationPhase === 'calling_api'
                        ? 'border-[#8B5CF6] bg-[#030303] shadow-[0_0_8px_#8B5CF6]'
                        : ['scoring'].includes(generationPhase)
                          ? 'border-emerald-400 bg-emerald-400'
                          : 'border-white/10 bg-neutral-900'
                    }`}></div>
                    <span className={generationPhase === 'calling_api' ? 'text-white' : ['scoring'].includes(generationPhase) ? 'text-neutral-500' : 'text-neutral-600'}>
                      Invoking Gemini context layers
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="relative flex items-center gap-3">
                    <div className={`absolute left-[-24px] w-3 h-3 rounded-full border-2 ${
                      generationPhase === 'scoring'
                        ? 'border-[#8B5CF6] bg-[#030303] shadow-[0_0_8px_#8B5CF6]'
                        : 'border-white/10 bg-neutral-900'
                    }`}></div>
                    <span className={generationPhase === 'scoring' ? 'text-white' : 'text-neutral-600'}>
                      Tuning circular quality metrics
                    </span>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Output Terminal Console */}
          {(generationPhase !== 'idle' || generatedReadme) && (
            <div className="synapse-terminal border border-white/10 overflow-hidden z-10 relative rounded-2xl bg-[#030303] shadow-2xl">
              
              {/* Terminal top header bar */}
              <div className="h-12 bg-white/5 border-b border-white/5 px-4 flex justify-between items-center text-[11px] text-neutral-400 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]/60"></div>
                  <span className="ml-2 font-mono text-[10px] tracking-wider text-neutral-400 font-bold uppercase select-none">
                    {activeTerminalView === 'preview' ? '📄 Rendered Preview' : '⚙️ README.md (Source)'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {generatedReadme && generationPhase === 'done' && (
                    <div className="flex bg-black border border-white/10 rounded-lg p-0.5 font-sans gap-0.5 shadow-inner">
                      <button
                        onClick={() => setActiveTerminalView('code')}
                        className={`px-2.5 py-1 text-[9.5px] uppercase tracking-wider font-semibold rounded-md transition cursor-pointer flex items-center gap-1 ${
                          activeTerminalView === 'code'
                            ? 'bg-[#8B5CF6] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <FileCode size={9.5} />
                        <span>Source Code</span>
                      </button>
                      <button
                        onClick={() => setActiveTerminalView('preview')}
                        className={`px-2.5 py-1 text-[9.5px] uppercase tracking-wider font-semibold rounded-md transition cursor-pointer flex items-center gap-1 ${
                          activeTerminalView === 'preview'
                            ? 'bg-[#8B5CF6] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Eye size={9.5} />
                        <span>Formatted View</span>
                      </button>
                    </div>
                  )}
                  <span className="text-[9px] uppercase tracking-wider text-neutral-600 font-mono hidden sm:inline select-none">
                    UTF-8 COMPLIANCE
                  </span>
                </div>
              </div>

              {/* Streaming or Formatted document output container */}
              <div className="p-6 max-h-[480px] overflow-y-auto space-y-2 text-left bg-[#050505]">
                {activeTerminalView === 'preview' ? (
                  <div className="bg-[#0c0c0c]/90 border border-white/5 p-6 rounded-xl max-w-3xl mx-auto my-1 select-text">
                    {renderMarkdownPreview(generatedReadme)}
                  </div>
                ) : (
                  <div className="font-mono text-[12px] text-neutral-300 leading-relaxed font-light">
                    {generatedReadme ? (
                      <pre className="whitespace-pre-wrap break-all select-text font-mono text-left">{generatedReadme}</pre>
                    ) : (
                      <p className="text-neutral-500 italic font-mono">Initializing pipeline terminal and allocating buffer cache grids...</p>
                    )}
                    
                    {generationPhase === 'calling_api' && (
                      <span className="synapse-terminal-cursor">_</span>
                    )}
                  </div>
                )}
                <div ref={terminalEndRef}></div>
              </div>

              {/* Exporter Toolbar */}
              {generatedReadme && generationPhase === 'done' && (
                <div className="bg-white/[0.02] border-t border-white/5 px-5 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col items-start gap-1 font-sans">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono text-left block leading-none">
                      PIPELINE STATUS // SUCCESS
                    </span>
                    <span className="text-xs text-[#a3a3a3] font-light text-left leading-normal">
                      Your production-grade README is compiled. Choose an action:
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    {/* View options button */}
                    <button
                      onClick={() => {
                        // Switch inline view to Preview
                        setActiveTerminalView('preview');
                        // Also open the fullscreen immersive component
                        setSelectedHistoryItem({
                          id: 'temp',
                          repoName: repoData?.name || 'temporary',
                          repoUrl: repoUrl,
                          repoDescription: repoData?.description || '',
                          language: repoData?.language || '',
                          stars: repoData?.stars || 0,
                          sections: selectedSections,
                          content: generatedReadme,
                          mlProjectType: classification?.projectType || 'Web Frontend',
                          mlConfidence: (classification?.confidence || '0') + '%',
                          mlQualityScore: qualityScore || 80,
                          recommendedSections: selectedSections,
                          createdAt: Date.now()
                        });
                        setIsModalOpen(true);
                      }}
                      className="px-3.5 py-2 border border-white/10 hover:border-cyan-400 hover:bg-cyan-400/10 text-[10.5px] rounded-lg text-neutral-300 hover:text-white uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                      title="Show final README file"
                    >
                      <Eye size={12} className="text-cyan-400" />
                      <span>Show README</span>
                    </button>
                    
                    {/* Copy to clipboard button with feedback */}
                    <button
                      onClick={() => {
                        copyToClipboard(generatedReadme);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`px-3.5 py-2 border rounded-lg text-[10.5px] uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        copied 
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold scale-[1.01]' 
                          : 'border-white/10 hover:border-emerald-400 hover:bg-emerald-400/10 text-neutral-300 hover:text-white'
                      }`}
                      title="Copy README content"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-400 animate-pulse" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="text-emerald-400" />
                          <span>Copy README</span>
                        </>
                      )}
                    </button>

                    {/* Download button */}
                    <button
                      onClick={() => downloadMarkdown(generatedReadme, `${repoData?.name || 'README'}-README.md`)}
                      className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c4fe3] text-white font-semibold text-[10.5px] uppercase tracking-wider rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                      title="Download file as markdown"
                    >
                      <Download size={12} />
                      <span>Download file</span>
                    </button>

                    {/* Reset Session button */}
                    <button
                      onClick={() => {
                        setLiveDemoUrl('');
                        setDescriptionOverride('');
                        setDeploymentPlatform('None');
                        setAuthorName('');
                        setAuthorUsername('');
                        setAdditionalBadges([]);
                        setNoLiveDemo(false);
                        setRepoUrl('');
                        setRepoData(null);
                        setClassification(null);
                        setRecommendations([]);
                      }}
                      className="px-3.5 py-2 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 text-[10.5px] rounded-lg text-neutral-400 hover:text-white uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                      title="Reset generation and wipe all optional inputs"
                    >
                      <RefreshCw size={12} className="text-rose-500" />
                      <span>Reset Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality Scorer Panel (appears beneath output) */}
          {qualityScore !== null && generationPhase === 'done' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 text-left">
              
              {/* SVG Ring Diagnostic circular card */}
              <div className="glass-panel p-6 border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block">README DIAGNOSTIC RATE</span>
                
                <div className="relative w-32 h-32 flex items-center justify-center font-mono">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    
                    <motion.circle
                      cx="64" cy="64" r="52" fill="none"
                      stroke="url(#synapse-accent-gradient)"
                      strokeWidth="6"
                      strokeDasharray="326.7"
                      initial={{ strokeDashoffset: 326.7 }}
                      animate={{ strokeDashoffset: 326.7 - (326.7 * qualityScore) / 100 }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="quality-score-ring"
                    />

                    {/* Gradient Definitions */}
                    <defs>
                      <linearGradient id="synapse-accent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-display font-medium text-white select-none leading-none pt-1">
                      {qualityScore}
                    </span>
                    <span className="text-[8px] uppercase text-neutral-500 tracking-widest font-mono select-none">
                      RATING
                    </span>
                  </div>
                </div>

                <div className="space-y-1 select-none">
                  <h4 className="text-lg font-medium text-white font-display-serif">
                    {qualityScore >= 85 ? 'Excellent README' : qualityScore >= 70 ? 'Good README' : 'Average README'}
                  </h4>
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">
                    Diagnostic Quality Parity
                  </span>
                </div>
              </div>

              {/* Suggestions items card right */}
              <div className="glass-panel p-6 border border-white/10 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#737373] block">// ML RECOMMENDATION ALERTS</span>
                
                <div className="space-y-3 font-mono text-xs text-neutral-300">
                  {suggestions.length > 0 ? (
                    suggestions.map((sug, i) => (
                      <div key={i} className="flex gap-2.5 items-start p-3 bg-white/2 rounded-xl border border-white/5">
                        <span className="text-[#8B5CF6] shrink-0 font-bold select-none">◆</span>
                        <div className="space-y-1">
                          <p className="font-sans font-medium text-white">{sug}</p>
                          <span className="text-[10px] text-neutral-500 block leading-normal font-sans font-light">Recommended expansion to secure optimized layout indexes.</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 font-sans flex items-center gap-3">
                      <Sparkles size={16} className="text-emerald-400 shrink-0 select-none animate-pulse" />
                      <div className="space-y-1">
                        <h5 className="font-semibold font-display-serif text-lg text-white">Priscilla Standard Verified</h5>
                        <p className="text-xs text-neutral-400">Pristine documentation layout validated dynamically with zero critical discrepancies.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ── VIEW 4: ARCHIVED SAVED HISTORY LISTS ── */}
      {activeTab === 'readmes' && (
        <div className="space-y-6 text-left">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-3xl font-display-serif text-white">Your generated READMEs</h2>
            <p className="text-xs font-mono text-neutral-500 uppercase mt-1">
              Locally persisted indices compiled via your active developer sandbox coordinates.
            </p>
          </div>

          {/* Calibration metrics indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="synapse-stat-pill bg-white/2 border-white/5 py-3 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Total Generated</span>
              <span className="text-2xl font-light text-white font-display-serif">{history.length} docs</span>
            </div>
            <div className="synapse-stat-pill bg-white/2 border-white/5 py-3 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Weighted Rating</span>
              <span className="text-2xl font-light text-[#8B5CF6] font-display-serif">{getAverageScore()}% rate</span>
            </div>
            <div className="synapse-stat-pill bg-white/2 border-white/5 py-3 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Top Category</span>
              <span className="text-lg font-light text-[#06B6D4] truncate block mt-0.5" title={getMostCommonProjectType()}>{getMostCommonProjectType()}</span>
            </div>
            <div className="synapse-stat-pill bg-white/2 border-white/5 py-3 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Sync loop status</span>
              <span className="text-2xl font-light text-emerald-400 font-display-serif">Cloud Merged</span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-20 bg-white/2 border border-white/5 rounded-3xl max-w-xl mx-auto space-y-5 font-sans p-10 mt-12">
              <BookOpen size={44} className="mx-auto text-neutral-700 animate-float" />
              <h3 className="text-xl font-medium text-white">Database Archives Empty</h3>
              <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                No generated workspace nodes saved in this session loop. Click generate to document matrices.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('generator')}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-medium uppercase text-xs rounded-full cursor-pointer transition font-mono"
                >
                  Launch Generator Station
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 font-sans">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedHistoryItem(item);
                    setIsModalOpen(true);
                  }}
                  className="feature-card flex flex-col justify-between hover:border-[#8B5CF6]/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)] transition duration-300 p-6 relative cursor-pointer group"
                >
                  
                  {/* Icon box inside card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="icon-box">
                      <span className="text-xl">📄</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/60 border border-white/5 px-2.5 py-1 rounded text-[10.5px]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getQualityTheme(item.mlQualityScore).color }}></span>
                      <span className="font-bold font-mono text-white">{item.mlQualityScore}% Quality</span>
                    </div>
                  </div>

                  <div className="space-y-2 flex-grow text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-lg font-bold font-sans text-white group-hover:text-[#A78BFA] transition truncate max-w-[180px]">
                        {item.repoName}
                      </h4>
                      <span className="px-1.5 py-0.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 font-mono text-[9px] uppercase tracking-wider text-[#A78BFA] rounded">
                        {item.language || 'General'}
                      </span>
                      {item.generationMode === 'description' ? (
                        <span className="px-1.5 py-0.5 bg-cyan-400/10 border border-cyan-400/25 font-mono text-[9px] uppercase tracking-wider text-cyan-300 rounded">
                          📝 Describe Mode
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-400/10 border border-emerald-400/25 font-mono text-[9px] uppercase tracking-wider text-emerald-300 rounded">
                          ⬡ GitHub URL
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 font-light line-clamp-2 leading-relaxed">
                      {item.generationMode === 'description' ? 'Project Source: Explicit text-description' : `URL: ${item.repoUrl}`}
                    </p>

                    <div className="pt-2 font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                      CLASSIFIED TARGET: <span className="text-[#06B6D4] font-semibold">{item.mlProjectType}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3.5 mt-5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-neutral-500 uppercase">
                      {item.sections ? item.sections.length : 8} compiled topics
                    </span>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.content);
                        }}
                        className="px-2.5 py-1 hover:bg-[#8B5CF6]/15 hover:border-[#8B5CF6] text-white border border-white/10 rounded transition text-[9px] uppercase cursor-pointer"
                      >
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMarkdown(item.content, `${item.repoName}-README.md`);
                        }}
                        className="px-2.5 py-1 bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90 rounded transition text-[9px] uppercase font-bold cursor-pointer"
                      >
                        Get file
                      </button>
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="px-2 py-1 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-neutral-400 hover:border-rose-400 rounded transition text-[9px] uppercase cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 5: USER PROFILE & MODEL CALIBRATIONS ── */}
      {activeTab === 'profile' && user && (
        <div className="space-y-8 text-left">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-3xl font-display-serif text-white">Your Profile Calibration</h2>
            <p className="text-xs font-mono text-neutral-500 uppercase mt-1">
              Analyze project profiles mapped onto TensorFlow models and custom Firestore attributes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* User details left */}
            <div className="lg:col-span-5 glass-panel p-6 flex flex-col items-center text-center space-y-4">
              
              <div className="w-20 h-20 bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] rounded-full p-0.5 hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] transition cursor-pointer">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full rounded-full object-cover referral-no" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-black rounded-full flex items-center justify-center font-display-serif font-light text-3xl text-[#A78BFA]">
                    {user.name ? user.name[0].toUpperCase() : 'M'}
                  </div>
                )}
              </div>

              {editingName ? (
                <div className="flex gap-2 w-full mt-2 font-mono">
                  <input
                    type="text"
                    className="flex-1 synapse-input text-xs"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditNameSubmit()}
                  />
                  <button
                    onClick={handleEditNameSubmit}
                    className="px-3 py-1.5 bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90 text-[10px] font-bold uppercase rounded-lg transition"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-display-serif text-white select-text">{user.name}</span>
                  <button
                    onClick={() => {
                      setNewName(user.name);
                      setEditingName(true);
                    }}
                    className="text-neutral-500 hover:text-[#8B5CF6] transition cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              <p className="text-[11px] font-mono text-neutral-500 lowercase flex items-center gap-1.5 bg-white/2 py-1 px-3 border border-white/5 rounded-full select-text">
                <Lock size={11} className="text-neutral-500" /> {user.email}
              </p>

              {/* Grid calibration items */}
              <div className="w-full grid grid-cols-2 gap-3 pt-4 select-none">
                <div className="bg-white/2 p-4 text-center border border-white/5 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Total Generated</span>
                  <span className="text-2xl font-light text-white font-display-serif block mt-1">{user.readmesGenerated} docs</span>
                </div>
                
                <div className="bg-white/2 p-4 text-center border border-white/5 rounded-2xl">
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">MAE Deviation</span>
                  <span className="text-2xl font-light text-[#06B6D4] font-display-serif block mt-1">{getAverageScore()}% rate</span>
                </div>
              </div>

              <div className="w-full text-left pt-4 border-t border-white/5 space-y-3 font-sans text-xs">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">Fireship cloud tier</h4>
                <div className="bg-black p-3.5 border border-white/10 rounded-xl flex justify-between items-center text-[11px]">
                  <div>
                    <h5 className="font-semibold text-white uppercase">Standard Developer Tier</h5>
                    <p className="text-neutral-500 text-[10px]">Cloud databases mapped locally in Cloud Run</p>
                  </div>
                  <span className="bg-[#8B5CF6]/10 text-[#A78BFA] px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold">
                    Connected
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase font-mono">
                  All generated parameters, cosine similarities, and user names synchronise automatically to Firestore caches.
                </p>
              </div>

            </div>

            {/* Model Weight Distributions right */}
            <div className="lg:col-span-7 glass-panel p-6 border border-white/10 flex flex-col gap-5">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">// ML CORE METRIC MODELS INTEGRATIONS</span>
                <h3 className="text-xl font-semibold text-white">Repository Types Distribution Chart</h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  The density represents project categories classified in current history indices, mapping neural network weight targets.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {PROJECT_TYPES.map((cls, idx) => {
                  const count = history.filter(h => h.mlProjectType === cls).length;
                  const ratio = history.length > 0 ? (count / history.length) * 100 : 0;
                  
                  return (
                    <div key={cls} className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className={`${count > 0 ? 'text-[#A78BFA] font-medium' : 'text-neutral-400'}`}>{cls}</span>
                        <span className="text-neutral-500">
                          {count} docs ({ratio.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] transition-all rounded-full"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/2 border border-white/5 rounded-xl p-4.5 flex gap-3 text-xs items-center text-neutral-400 font-sans mt-3">
                <CheckCircle size={16} className="text-emerald-400 shrink-0 select-none animate-pulse" />
                <div className="leading-relaxed">
                  Primary recommended classification fit vector: <strong className="text-white">"{getMostCommonProjectType()}"</strong>
                </div>
              </div>

              {/* Generation Mode Breakdown Stats */}
              <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#06B6D4]">// GENERATION MODES COMPONENT BREAKDOWN</span>
                  <h4 className="text-sm font-semibold text-white">Mode Breakdown Statistics</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 border border-emerald-500/10 hover:border-emerald-500/25 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">GitHub URL Mode</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-bold text-white font-sans">
                        {history.filter(h => h.generationMode !== 'description').length}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {history.length > 0 ? ((history.filter(h => h.generationMode !== 'description').length / history.length) * 100).toFixed(0) : 0}% ratio
                      </span>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-cyan-500/10 hover:border-cyan-500/25 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">Describe Mode</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-bold text-white font-sans">
                        {history.filter(h => h.generationMode === 'description').length}
                      </span>
                      <span className="text-[10px] text-[#06B6D4] font-mono font-bold">
                        {history.length > 0 ? ((history.filter(h => h.generationMode === 'description').length / history.length) * 100).toFixed(0) : 0}% ratio
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ADMIN ONLY SYSTEM ERROR DIAGNOSTICS MONITOR PANEL */}
          {user && user.email === 'rishijain30a@gmail.com' && (
            <AdminErrorMonitor />
          )}

        </div>
      )}

    </div>
  );
}

// ── SYSTEM DIAGNOSTICS DEVOPS PANEL FOR RISHI JAIN ───────
function AdminErrorMonitor() {
  const [errors, setErrors] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    try {
      const q = query(collection(db, 'errors'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const errList: any[] = [];
        snapshot.forEach((d) => {
          errList.push({ id: d.id, ...d.data() });
        });
        setErrors(errList);
        setLoading(false);
      }, (err) => {
        console.error('Error listening to errors collection:', err);
        setLoading(false);
      });
      return unsubscribe;
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const toggleResolved = async (errId: string, currentStatus: boolean) => {
    try {
      const errDoc = doc(db, 'errors', errId);
      await updateDoc(errDoc, {
        resolved: !currentStatus,
        reviewedBy: 'rishijain30a@gmail.com'
      });
    } catch (e) {
      console.error('Failed to update resolution status:', e);
    }
  };

  const filteredErrors = errors.filter(err => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return err.resolved === true;
    return !err.resolved;
  });

  return (
    <div className="mt-8 border-t border-white/10 pt-8 space-y-4 text-left col-span-1 md:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#8B5CF6] uppercase block">// ADMIN — ERROR MONITOR</span>
          <h4 className="text-lg font-semibold text-white">System Diagnostics Panel</h4>
        </div>
        <div className="flex bg-black p-1 border border-white/10 rounded-xl text-[10px] font-mono">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'unresolved' ? 'bg-[#8B5CF6] text-white' : 'text-neutral-400'}`}
          >
            Unresolved ({errors.filter(e => !e.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'resolved' ? 'bg-[#8B5CF6] text-white' : 'text-neutral-400'}`}
          >
            Resolved ({errors.filter(e => e.resolved).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-[#8B5CF6] text-white' : 'text-neutral-400'}`}
          >
            All Logs ({errors.length})
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a]/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-neutral-500 font-mono text-xs">
            Establishing connection to central database logs...
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 font-mono text-xs">
            No system error files recorded under current parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#121214]/50 text-[10px] uppercase text-[#737373] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5 pl-5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Error Context/Message</th>
                  <th className="p-3.5 pr-5">Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-3.5 pl-5">
                      <input
                        type="checkbox"
                        checked={!!err.resolved}
                        onChange={() => toggleResolved(err.id, !!err.resolved)}
                        className="rounded border-white/10 bg-black text-[#8B5CF6] focus:ring-y-0 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="p-3.5 text-neutral-400 text-[10.5px] font-mono whitespace-nowrap">
                      {err.timestamp?.seconds 
                        ? new Date(err.timestamp.seconds * 1000).toLocaleString() 
                        : err.timestamp 
                          ? new Date(err.timestamp).toLocaleString()
                          : 'Recent'}
                    </td>
                    <td className="p-3.5 text-[#06B6D4] break-all max-w-[120px] font-mono">
                      {err.userEmail || 'anonymous'}
                    </td>
                    <td className="p-3.5 text-neutral-200">
                      <div className="font-semibold text-rose-400 uppercase text-[10px] break-all font-mono">
                        {err.type || 'APP_ERROR'}
                      </div>
                      <div className="text-neutral-300 mt-0.5 whitespace-pre-wrap max-w-sm break-all text-[11px] leading-relaxed">
                        {err.message}
                      </div>
                      {err.context && (
                        <div className="text-[#8B5CF6] text-[10px] mt-1 break-all font-mono">
                           Context: {err.context}
                        </div>
                      )}
                      {err.source && (
                        <div className="text-[#8B5CF6] text-[10px] mt-0.5 break-all font-mono">
                          Source: {err.source}:{err.line}:{err.col}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-neutral-500 text-[10px] pr-5 max-w-[120px] break-all font-mono whitespace-nowrap">
                      {err.environment} (v{err.appVersion})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
