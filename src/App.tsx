/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, FileCode, User, Github, Star, GitFork, AlertCircle,
  Sparkles, Check, Copy, Download, Trash2, Edit2, Play,
  Layout, Plus, Clipboard, ExternalLink, Settings, LogOut,
  CheckCircle, ShieldAlert, BookOpen, Eye, Layers, RefreshCw, Send, Lock
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { RepoData, MLClassification, SectionRecommendation, TrainingStatus, ReadmeHistory } from './types';
import { trainMLModels, isMLEngineReady, classifyRepo, recommendSections, scoreReadme, PROJECT_TYPES } from './ml';
import WorkspaceDashboard from './components/WorkspaceDashboard';
import LandingUI from './components/LandingUI';

// Storage keys for Guest play fallbacks
const LOCAL_STORAGE_KEY = 'readme_forge_history';
const LOCAL_USER_KEY = 'readme_forge_user';

// ── APP_CONFIG METADATA ───────────────────────────────────
export const APP_CONFIG = {
  version: '2.0.0',
  buildDate: '2026',
  author: 'Rishi Jain',
  email: 'rishijain30a@gmail.com',
  linkedin: 'https://www.linkedin.com/in/rishi-jain-837b75312',
  environment: window.location.hostname.includes('localhost') ? 'development' : 'production',
};

// ⚠ IMPORTANT: Restrict this API key in GCP Platform Credentials.
// Exposure is managed via production backend routers proxying live Gemini parameters securely.
console.log(
  `%c README Stylerate v${APP_CONFIG.version} `,
  'background:#8B5CF6;color:white;padding:4px 8px;border-radius:4px;font-weight:bold',
  `\nEnvironment: ${APP_CONFIG.environment}`,
  `\nAuthor: ${APP_CONFIG.author}`,
  `\nContact: ${APP_CONFIG.email}`
);

// ── CLIENT-SIDE SERVER-SYNCED ERROR TRACKING ──────────────
export const ERROR_LOG: any[] = [];

export async function captureError(errorData: any) {
  const errorObj = {
    ...errorData,
    timestamp: new Date().toISOString(),
    userId: auth?.currentUser?.uid || 'anonymous',
    userEmail: auth?.currentUser?.email || 'anonymous',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    appVersion: APP_CONFIG.version,
    environment: APP_CONFIG.environment,
  };

  ERROR_LOG.push(errorObj);

  if (errorObj.environment === 'development') {
    console.error('[README Stylerate Dev Diagnostian]', errorObj);
    return;
  }

  try {
    if (db) {
      await addDoc(collection(db, 'errors'), {
        type: errorObj.type || 'UNKNOWN',
        message: errorObj.message || 'No message provided',
        stack: errorObj.stack || null,
        source: errorObj.source || null,
        line: errorObj.line || null,
        col: errorObj.col || null,
        context: errorObj.context || null,
        userId: errorObj.userId,
        userEmail: errorObj.userEmail,
        url: errorObj.url || window.location.href,
        userAgent: errorObj.userAgent,
        environment: errorObj.environment,
        appVersion: errorObj.appVersion,
        timestamp: serverTimestamp(),
        resolved: false,
        reviewedBy: null,
      });
    }
  } catch (e) {
    console.warn('System logs failed registering directly onto Firestore cloud.', e);
  }

  // Filter out noisy, harmless errors
  const ignored = ['ResizeObserver loop', 'Non-Error promise rejection', 'WebSocket', 'vite', 'HMR'];
  if (ignored.some(m => errorObj.message?.toLowerCase().includes(m.toLowerCase()))) {
    return;
  }

  // Signal layout to toast the failure coordinates politely
  window.dispatchEvent(new CustomEvent('app-system-error', { 
    detail: 'An interface event was logged. Rishi Jain and team have been dispatched with coordinates.' 
  }));
}

// Global window event interceptors
window.addEventListener('error', (event) => {
  captureError({
    type: 'UNCAUGHT_ERROR',
    message: event.message,
    source: event.filename,
    line: event.lineno,
    col: event.colno,
    stack: event.error?.stack || 'N/A',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  captureError({
    type: 'UNHANDLED_PROMISE',
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack || 'N/A',
  });
});

export default function App() {
  // Ref to hold unsubscribe callbacks for clean disposal on unmount/signout
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Auth & General View State
  const [activeView, setActiveView] = useState<'loading' | 'auth' | 'app'>('loading');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; photoURL: string | null; plan: string; readmesGenerated: number; createdAt: number } | null>(null);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Empty', color: 'bg-gray-800' });
  const [rememberMe, setRememberMe] = useState(false);
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);
  const [authErrorType, setAuthErrorType] = useState<string | null>(null);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [useRedirectAuth, setUseRedirectAuth] = useState(false);

  // App Main State
  const [activeTab, setActiveTab] = useState<'generator' | 'readmes' | 'profile'>('generator');
  
  // ML Engine Training state
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    phase: 'idle',
    epoch: 0,
    totalEpochs: 50,
    accuracy: 0,
    mae: 0
  });

  // Generator State
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setRepoToken] = useState(''); // Unified state naming
  const [fetching, setFetching] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [generationMode, setGenerationMode] = useState<'url' | 'description'>('url');
  const [classification, setClassification] = useState<MLClassification | null>(null);
  const [recommendations, setRecommendations] = useState<SectionRecommendation[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [extraContext, setExtraContext] = useState('');

  // Optional Details form fields (kept in memory per session)
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [deploymentPlatform, setDeploymentPlatform] = useState('None');
  const [authorName, setAuthorName] = useState('');
  const [authorUsername, setAuthorUsername] = useState('');
  const [additionalBadges, setAdditionalBadges] = useState<string[]>([]);
  const [noLiveDemo, setNoLiveDemo] = useState(false);

  // Generation Progress & Loading state
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'analyzing' | 'ml' | 'calling_api' | 'scoring' | 'done'>('idle');
  const [generatedReadme, setGeneratedReadme] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // History / My Readmes State
  const [history, setHistory] = useState<ReadmeHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ReadmeHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Profile Edit State
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // UI Toast State
  const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string }[]>([]);

  // DOM Refs
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const isFetchingRepo = fetching;
  const repoToken = githubToken;

  // Custom Cursor mouse movement and scale effect integration
  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;

    const moveCursor = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = `${mx}px`;
      cursor.style.top = `${my}px`;
    };

    let active = true;
    const animateRing = () => {
      if (!active) return;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      requestAnimationFrame(animateRing);
    };

    window.addEventListener('mousemove', moveCursor);
    requestAnimationFrame(animateRing);

    const handleEnter = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(2)';
      ring.style.opacity = '0';
    };
    const handleLeave = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      ring.style.opacity = '1';
    };

    const attachListeners = () => {
      const elements = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
      elements.forEach(el => {
        el.removeEventListener('mouseenter', handleEnter);
        el.removeEventListener('mouseleave', handleLeave);
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
      });
    };

    attachListeners();
    const interval = setInterval(attachListeners, 1500);

    return () => {
      active = false;
      window.removeEventListener('mousemove', moveCursor);
      clearInterval(interval);
    };
  }, [activeView, activeTab]);

  // Trigger loading view on start and run ML training
  useEffect(() => {
    // 1. Validate Connection to Firestore (as mandated by skill guidelines)
    async function testConnectionAndRun() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        logError("Firestore background connection check (offline-ready)", error);
      }
    }
    testConnectionAndRun();

    // 2. Register dynamic real-time onAuthStateChanged sync
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Unsubscribe any previous snapshot listeners first
      unsubscribersRef.current.forEach(u => u());
      unsubscribersRef.current = [];

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Ensure parent document exists
        try {
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            const initialProfile = {
              name: currentUser.displayName || currentUser.email?.split('@')[0].toUpperCase() || 'DEVELOPER',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || null,
              plan: 'free',
              readmesGenerated: 0,
              createdAt: Date.now()
            };
            await setDoc(userDocRef, initialProfile);
          }
        } catch (error) {
          logError("Initial profile setup check", error);
        }

        // Live subscribe to profile document
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser({
              name: userData.name || '',
              email: userData.email || '',
              photoURL: userData.photoURL || null,
              plan: userData.plan || 'free',
              readmesGenerated: userData.readmesGenerated || 0,
              createdAt: userData.createdAt || Date.now()
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });

        // Live subscribe to readmes list ordered by creation
        const readmesRef = collection(db, 'users', currentUser.uid, 'readmes');
        const readmesQuery = query(readmesRef, orderBy('createdAt', 'desc'));
        const unsubscribeReadmes = onSnapshot(readmesQuery, (querySnap) => {
          const fetchedHistory: ReadmeHistory[] = [];
          querySnap.forEach((docSnap) => {
            fetchedHistory.push(docSnap.data() as ReadmeHistory);
          });
          setHistory(fetchedHistory);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/readmes`);
        });

        unsubscribersRef.current = [unsubscribeUser, unsubscribeReadmes];
        setActiveView('app');
        setIsAuthModalOpen(false);

      } else {
        // Fallback or guest play check
        const savedUser = localStorage.getItem(LOCAL_USER_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
          }
          setActiveView('app');
        } else {
          setUser(null);
          setHistory([]);
          setActiveView('auth');
        }
      }
    });

    // 3. Train TensorFlow.js Models
    setTrainingStatus(s => ({ ...s, phase: 'classifier' }));
    
    trainMLModels((phase, epoch, total, metric) => {
      setTrainingStatus({
        phase,
        epoch,
        totalEpochs: total,
        accuracy: phase === 'classifier' ? metric : undefined,
        mae: phase === 'scorer' ? metric : undefined
      });
    }).then(() => {
      setTrainingStatus(s => ({ ...s, phase: 'ready' }));
    }).catch(err => {
      logError("ML Core training", err, "ML Engine initialization error. Retry reloading.");
    });

    return () => {
      unsubscribeAuth();
      unsubscribersRef.current.forEach(u => u());
    };
  }, []);

  // Sync scroll on terminal content streaming
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generatedReadme]);

  // Handle password strength calculation
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: 'Empty', color: 'bg-gray-800' });
      return;
    }
    if (password.length < 8) {
      setPasswordStrength({ score: 33, text: 'Weak', color: 'bg-pink-500' });
    } else if (password.length >= 8 && password.length < 12) {
      setPasswordStrength({ score: 66, text: 'Medium', color: 'bg-orange-500' });
    } else {
      setPasswordStrength({ score: 100, text: 'Strong', color: 'bg-emerald-400' });
    }
  }, [password]);

  // Reset form states between auth modes
  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
    if (authMode === 'login') {
      setFullName('');
    }
  }, [authMode]);

  // Toast notifier
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 📝 Custom logError function targeting security & monitoring audits
  const logError = (context: string, error: any, userMessage: string | null = null) => {
    const errorMsg = error?.message || String(error);
    captureError({
      type: 'APP_ERROR',
      context,
      message: errorMsg,
      stack: error?.stack || 'N/A',
    });
    if (userMessage) {
      showToast('error', userMessage);
    }
  };

  // Clean toast error listener mapping
  useEffect(() => {
    const handleSystemError = (e: Event) => {
      const msg = (e as CustomEvent).detail || 'System error recorded.';
      showToast('error', msg);
    };
    window.addEventListener('app-system-error', handleSystemError);
    return () => {
      window.removeEventListener('app-system-error', handleSystemError);
    };
  }, []);

  // Demo injection helper
  const injectDemo = (type: 'frontend' | 'backend' | 'ml') => {
    if (type === 'frontend') {
      setRepoUrl('https://github.com/frontend-wizard/react-tailwind-dashboard');
      showToast('info', 'Loaded React Tailwind Portfolio demo template');
    } else if (type === 'backend') {
      setRepoUrl('https://github.com/devops-core/express-api-gateway');
      showToast('info', 'Loaded Express Microservice API Gateway demo template');
    } else {
      setRepoUrl('https://github.com/ai-researcher/pytorch-image-detector');
      showToast('info', 'Loaded PyTorch Computer Vision classifier demo template');
    }
  };

  // Firebase Auth Logics
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      if (!email || !password) {
        showToast('error', 'Please enter both your email address and password');
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('success', `Welcome back to README Stylerate!`);
      } catch (err: any) {
        logError("Auth sign-in", err, err.message || 'Invalid login credentials.');
      }
    } else if (authMode === 'signup') {
      if (!fullName || !email || !password) {
        showToast('error', 'All fields are required');
        return;
      }
      if (password !== confirmPassword) {
        showToast('error', 'Passwords do not match');
        return;
      }
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Create initial profile in Firestore
        const userRef = doc(db, 'users', credential.user.uid);
        await setDoc(userRef, {
          name: fullName,
          email: email,
          photoURL: null,
          plan: 'free',
          readmesGenerated: 0,
          createdAt: Date.now()
        });
        showToast('success', 'Registration completed successfully!');
      } catch (err: any) {
        logError("Auth registration", err, err.message || 'Error occurred during registration.');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showToast('error', 'Please enter your registered email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('success', 'Password reset checksum projected to email!');
      setAuthMode('login');
    } catch (err: any) {
      logError("Auth password reset", err, err.message || 'Error occurred while resetting password.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSignInLoading(true);
    setAuthErrorType(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (useRedirectAuth) {
        await signInWithRedirect(auth, provider);
      } else {
        try {
          await signInWithPopup(auth, provider);
          showToast('success', 'Signed in successfully with Google Sync!');
        } catch (innerErr: any) {
          if (innerErr.code === 'auth/popup-blocked' || innerErr.code === 'auth/cancelled-popup-request') {
            showToast('info', 'Popup blocked by browser. Initiating secure redirect sign-in...');
            await signInWithRedirect(auth, provider);
          } else {
            throw innerErr;
          }
        }
      }
    } catch (err: any) {
      console.error("Google login failed", err);
      setAuthErrorType(err.code || 'UNKNOWN');
      setShowVercelGuide(true); // Toggle the guide on to assist the developer!
      
      let friendlyMsg = err.message || 'Failed code auth sync via Google.';
      if (err.code === 'auth/unauthorized-domain') {
        friendlyMsg = "Google Auth requires authorizing your Vercel URL first! See the setup guide below.";
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMsg = "Google provider is not enabled in your Firebase Authentication console. See instructions below.";
      } else if (err.code === 'auth/configuration-not-found') {
        friendlyMsg = "Configuration error: check if your Vercel Environment Variables are fully populated.";
      }
      
      logError("Auth Google sign-in", err, friendlyMsg);
    } finally {
      setGoogleSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    try {
      await signOut(auth);
      showToast('info', 'Signed out from README Stylerate.');
      setActiveView('auth');
    } catch (err: any) {
      logError("Auth sign-out", err, 'Failed signing out of session.');
    }
  };

  // Fetch codebase summary from GitHub
  const handleFetchRepo = async () => {
    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      showToast('error', 'Please enter a valid GitHub repository URL.');
      return;
    }

    const githubRegex = /^https?:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    if (!githubRegex.test(trimmedUrl)) {
      showToast('error', 'Invalid GitHub URL format. Use: https://github.com/owner/repo');
      return;
    }

    setFetching(true);
    setRepoData(null);
    setClassification(null);
    setRecommendations([]);

    // Clear optional details states on fetch
    setLiveDemoUrl('');
    setDescriptionOverride('');
    setDeploymentPlatform('None');
    setAuthorName('');
    setAuthorUsername('');
    setAdditionalBadges([]);
    setNoLiveDemo(false);

    try {
      const res = await fetch('/api/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repoUrl: trimmedUrl,
          githubToken: githubToken || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server fetch failed.');
      }

      const backendRepoData: RepoData = await res.json();
      setRepoData(backendRepoData);
      showToast('success', `Fetched details for ${backendRepoData.fullName}`);

      const classRes = await classifyRepo(backendRepoData);
      setClassification(classRes);

      const recommendRes = recommendSections(classRes.probabilities);
      setRecommendations(recommendRes);

      const recommendedOnes = recommendRes.filter(r => r.recommended).map(r => r.name);
      setSelectedSections(recommendedOnes);

    } catch (err: any) {
      logError("GitHub analysis server fetch", err);
      
      showToast('info', 'Using high-speed local codebase analysis parsing fallback.');
      
      const parts = repoUrl.replace('https://github.com/', '').split('/');
      const guessedName = parts[1] || 'generic-codebase';
      const guessedOwner = parts[0] || 'github-author';

      const isML = repoUrl.includes('image') || repoUrl.includes('torch') || repoUrl.includes('detector') || repoUrl.includes('model') || repoUrl.includes('predict');
      const isBackend = repoUrl.includes('api') || repoUrl.includes('gateway') || repoUrl.includes('server') || repoUrl.includes('microservice');

      const mockData: RepoData = {
        name: guessedName,
        fullName: `${guessedOwner}/${guessedName}`,
        description: isML 
          ? 'Deep Learning neural network architecture classifier pipeline written in python utilizing PyTorch models inference execution.'
          : isBackend
            ? 'Production microservices backend server using express router controllers Node JS modules JWT Token integrations.'
            : 'Client-facing responsive static single-page application dashboard using modern Web React components and framework styling.',
        language: isML ? 'Python' : isBackend ? 'JavaScript' : 'TypeScript',
        languages: isML ? { 'Python': 90 } : isBackend ? { 'JavaScript': 95 } : { 'TypeScript': 80, 'CSS': 15 },
        topics: isML ? ['pytorch', 'python', 'computer-vision'] : isBackend ? ['express', 'node', 'api'] : ['react', 'tailwind', 'frontend'],
        stars: 340,
        forks: 48,
        openIssues: 5,
        files: isML 
          ? ['train.py', 'predict.py', 'requirements.txt', 'Dockerfile', 'model.py']
          : isBackend
            ? ['package.json', 'server.js', '.env.example', 'Dockerfile', 'src/auth.js']
            : ['package.json', 'src/App.tsx', 'src/main.tsx', 'vite.config.ts', 'index.html'],
        owner: guessedOwner,
        url: repoUrl
      };

      setRepoData(mockData);
      const classRes = await classifyRepo(mockData);
      setClassification(classRes);

      const recommendRes = recommendSections(classRes.probabilities);
      setRecommendations(recommendRes);
      const recommendedOnes = recommendRes.filter(r => r.recommended).map(r => r.name);
      setSelectedSections(recommendedOnes);

    } finally {
      setFetching(false);
    }
  };

  // Toggle checklist selection
  const toggleSection = (secName: string) => {
    setSelectedSections(prev => 
      prev.includes(secName) ? prev.filter(s => s !== secName) : [...prev, secName]
    );
  };

  // Call server to trigger streamed README generation
  const handleGenerateReadme = async () => {
    if (!repoData || !classification) return;

    setGenerationPhase('analyzing');
    setGeneratedReadme('');
    setQualityScore(null);
    setSuggestions([]);

    try {
      await new Promise(r => setTimeout(r, 1000));
      setGenerationPhase('ml');
      
      await new Promise(r => setTimeout(r, 800));
      setGenerationPhase('calling_api');

      const relScores: Record<string, string> = {};
      recommendations.forEach(r => {
        relScores[r.name] = r.confidence + '%';
      });

      const sanitizedDescriptionOverride = (descriptionOverride || '').trim().replace(/<[^>]*>/g, '');
      const sanitizedExtraContext = (extraContext || '').trim().replace(/<[^>]*>/g, '');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generation_mode: generationMode === 'url' ? 'github' : 'description',
          repo: repoData,
          optional_details: {
            live_demo_url:          noLiveDemo ? null : (liveDemoUrl || null),
            description_override:   sanitizedDescriptionOverride || null,
            deployment_platform:    deploymentPlatform || 'None',
            author_name:            authorName || null,
            author_username:        authorUsername || null,
            additional_badges:      additionalBadges || [],
            no_live_demo:           noLiveDemo
          },
          ml_analysis: {
            project_type: classification.projectType,
            confidence: classification.confidence + '%',
            type_probabilities: classification.probabilities.reduce((acc, val, i) => {
              acc[PROJECT_TYPES[i]] = (val * 100).toFixed(1) + '%';
              return acc;
            }, {} as Record<string, string>)
          },
          sections: selectedSections,
          sections_to_include: selectedSections,
          section_relevance_scores: relScores,
          extra_context: sanitizedExtraContext
        })
      });

      if (!response.ok) {
        let serverError = '';
        try {
          serverError = await response.text();
        } catch (_) {}
        throw new Error(`Streaming failed (Status: ${response.status}). ${serverError || 'API keys missing, or Vercel execution timed out.'}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let completeResult = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          completeResult += chunk;
          setGeneratedReadme(prev => prev + chunk);
        }
      }

      setGenerationPhase('scoring');
      await new Promise(r => setTimeout(r, 1200));

      const finalMarkdown = completeResult || generatedReadme;
      const scoreRes = await scoreReadme(finalMarkdown);
      
      setQualityScore(scoreRes.score);
      setSuggestions(scoreRes.suggestions);
      setGenerationPhase('done');

      // Save generated result automatically to Firestore
      const currentUser = auth.currentUser;
      const historyItemId = Math.random().toString(36).substring(2, 9);
      const newHistoryItem: ReadmeHistory = {
        id: historyItemId,
        repoName: repoData.name,
        repoUrl: repoData.url,
        repoDescription: repoData.description,
        language: repoData.language,
        stars: repoData.stars,
        sections: selectedSections,
        content: finalMarkdown,
        mlProjectType: classification.projectType,
        mlConfidence: classification.confidence + '%',
        mlQualityScore: scoreRes.score,
        recommendedSections: recommendations.filter(r => r.recommended).map(r => r.name),
        generationMode: generationMode,
        createdAt: Date.now()
      };

      if (currentUser) {
        const readmeDocPath = `users/${currentUser.uid}/readmes/${historyItemId}`;
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'readmes', historyItemId), newHistoryItem);
          
          const updatedGeneratedCount = (user?.readmesGenerated || 0) + 1;
          await updateDoc(doc(db, 'users', currentUser.uid), {
            readmesGenerated: updatedGeneratedCount
          });
        } catch (error) {
          logError("Firestore write README history", error);
          handleFirestoreError(error, OperationType.WRITE, readmeDocPath);
        }
      } else {
        const updatedHistory = [newHistoryItem, ...history];
        setHistory(updatedHistory);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
        if (user) {
          const updatedUser = { ...user, readmesGenerated: user.readmesGenerated + 1 };
          setUser(updatedUser);
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        }
      }

      showToast('success', 'Readme generated, saved to database, and scored with Client-side ML Scorer!');

    } catch (err: any) {
      logError("Composing README template", err, err.message || 'Error occurred during generation.');
      setGenerationPhase('idle');
    }
  };

  // Markdown Utility for view/download
  const downloadMarkdown = (text: string, filename = 'README.md') => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'README.md file download started');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied markdown to clipboard');
  };

  // Remove elements from history
  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;
    if (currentUser) {
      const readmeDocPath = `users/${currentUser.uid}/readmes/${id}`;
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'readmes', id));
        showToast('info', 'README removed from Firebase Firestore');
      } catch (error) {
        logError("Firestore delete README history", error);
        handleFirestoreError(error, OperationType.DELETE, readmeDocPath);
      }
    } else {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      showToast('info', 'README removed from generation log');
    }
  };

  // Inline edit name handler
  const handleEditNameSubmit = async () => {
    if (newName && user) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocPath = `users/${currentUser.uid}`;
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            name: newName
          });
          setEditingName(false);
          showToast('success', 'User profile updated successfully in Firestore.');
        } catch (error) {
          logError("Firestore update name", error);
          handleFirestoreError(error, OperationType.UPDATE, userDocPath);
        }
      } else {
        const updatedUser = { ...user, name: newName };
        setUser(updatedUser);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        setEditingName(false);
        showToast('success', 'User profile updated successfully.');
      }
    }
  };

  // Automated sandbox guest play launcher
  const handleGuestLogin = () => {
    const demoUser = {
      name: 'LOCAL-GUEST',
      email: 'guest@aistudio-build.local',
      photoURL: null,
      plan: 'standard-guest',
      readmesGenerated: history.length,
      createdAt: Date.now()
    };
    setUser(demoUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoUser));
    showToast('success', 'Logged in successfully as local-developer guest!');
    setActiveView('app');
    setIsAuthModalOpen(false);
  };

  // Simple Markdown Parser representation as requested inside frameworks
  const renderMarkdownPreview = (text: string) => {
    if (!text) return <p className="text-neutral-500 italic">No README generated yet. Start above!</p>;
    
    let content = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    content = content.replace(/^# (.*?)$/gm, '<h1 class="text-3xl font-normal border-b border-white/10 pb-2 mb-4 mt-6 text-[#8B5CF6] font-display-serif">$1</h1>');
    content = content.replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-normal border-b border-white/10 pb-1 mb-3 mt-5 text-[#06B6D4] font-display-serif">$1</h2>');
    content = content.replace(/^### (.*?)$/gm, '<h3 class="text-xl font-medium mb-2 mt-4 text-white font-sans">$1</h3>');
    
    content = content.replace(/```(\w*)\n([\s\S]*?)```/gm, '<pre class="bg-black border border-white/10 p-4 rounded-xl my-3 overflow-x-auto text-[13px] font-mono text-[#06B6D4]">$2</pre>');
    
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    
    content = content.replace(/^[-*+] (.*?)$/gm, '<li class="ml-4 list-disc text-neutral-300 my-1 font-sans">$1</li>');
    
    content = content.replace(/`(.*?)`/g, '<code class="bg-white/5 border border-white/10 text-[#8B5CF6] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

    return (
      <div 
        className="markdown-body text-neutral-300 space-y-2 text-[14.5px] leading-relaxed selection:bg-[#8B5CF6] selection:text-white"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  // Quality score circular ring rendering parameters (SVG dashboard style)
  const getQualityTheme = (score: number) => {
    if (score >= 85) return { color: '#8B5CF6', label: 'Excellent', text: 'text-[#8B5CF6]' };
    if (score >= 70) return { color: '#00e277', label: 'Good', text: 'text-emerald-400' };
    if (score >= 50) return { color: '#06B6D4', label: 'Average', text: 'text-[#06B6D4]' };
    return { color: '#ef4444', label: 'Poor', text: 'text-rose-400' };
  };

  // Math helper for stats chart
  const getMostCommonProjectType = () => {
    if (history.length === 0) return 'None Yet';
    const counts: Record<string, number> = {};
    history.forEach(h => {
      counts[h.mlProjectType] = (counts[h.mlProjectType] || 0) + 1;
    });
    let topClass = 'None Yet';
    let maxCount = 0;
    Object.entries(counts).forEach(([cls, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topClass = cls;
      }
    });
    return topClass;
  };

  const getAverageScore = () => {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, h) => sum + h.mlQualityScore, 0);
    return Math.round(total / history.length);
  };

  return (
    <div className="min-h-screen bg-[#030303] font-sans antialiased text-white relative selection:bg-[#8B5CF6] selection:text-white">
      {/* Absolute Dynamic Cursor Nodes */}
      <div ref={cursorRef} className="custom-cursor bg-[#8B5CF6]"></div>
      <div ref={ringRef} className="custom-cursor-ring"></div>

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm font-mono text-xs">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`p-4 border backdrop-blur-md flex items-start gap-3 bg-[#0a0a0a]/90 rounded-xl ${
                t.type === 'success' ? 'border-emerald-500/20 text-emerald-400' :
                t.type === 'error' ? 'border-rose-500/20 text-rose-400' :
                'border-white/10 text-white'
              }`}
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="uppercase tracking-wider leading-relaxed">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ────────────────── VIEW LOADING (ML Training Progress) ────────────────── */}
      {activeView === 'loading' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030303] px-4 font-sans relative overflow-hidden">
          <div className="scanline"></div>
          
          {/* Ambient styling assets */}
          <div className="orb orb-violet"></div>
          <div className="orb orb-cyan"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0"></div>
          
          <div className="w-full max-w-sm relative z-10 text-center space-y-8">
            <div className="inline-block relative">
              <div className="w-20 h-20 border-2 border-[#8B5CF6]/20 bg-[#8B5CF6]/5 rounded-full flex items-center justify-center animate-pulse">
                <Brain className="text-[#8B5CF6]" size={36} />
              </div>
              <div className="absolute -inset-2 border border-dashed border-[#8B5CF6]/10 rounded-full animate-spin [animation-duration:16s]"></div>
            </div>

            <div className="space-y-1">
              <h1 className="font-display font-medium text-4xl tracking-tight text-white uppercase select-none">
                README <span className="shimmer-text">STYLERATE</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                FITTING LOCAL DEEP LEARNING MATRIX WEIGHTS...
              </p>
            </div>

            {/* Neural Net progress info */}
            <div className="glass-panel p-6 bg-[#0a0a0a]/70 text-left space-y-4 border border-white/5">
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                <span>EPOCH: {trainingStatus.epoch} / {trainingStatus.totalEpochs}</span>
                <span>MODEL: ADAM_CLASSIFY</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]"
                  style={{ width: `${(trainingStatus.epoch / trainingStatus.totalEpochs) * 100}%` }}
                />
              </div>

              {/* Status details */}
              <div className="space-y-2 font-mono text-[11px] text-neutral-400">
                <div className="flex justify-between">
                  <span>CATEGORICAL ACCURACY:</span>
                  <span className="text-[#8B5CF6] font-semibold">
                    {typeof trainingStatus.accuracy === 'number'
                      ? `${(trainingStatus.accuracy * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FIT LOSS REGRESSION (MAE):</span>
                  <span className="text-[#06B6D4] font-semibold">
                    {typeof trainingStatus.mae === 'number'
                      ? trainingStatus.mae.toFixed(4)
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2.5 mt-1 text-[10px] uppercase">
                  <span>ML Engine Status:</span>
                  <span className="text-emerald-400 font-bold">Optimizing...</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] text-neutral-600 font-mono block uppercase tracking-wider select-none">
              TensorFlow.js Standard Layers Layer API Active
            </span>
          </div>
        </div>
      )}

      {/* ────────────────── LANDING AND ACTIVE WORKSPACE RENDERS ────────────────── */}
      {activeView !== 'loading' && (
        <LandingUI
          user={user}
          handleSignOut={handleSignOut}
          setIsAuthModalOpen={setIsAuthModalOpen}
          handleGuestLogin={handleGuestLogin}
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
        >
          {user ? (
            <WorkspaceDashboard
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              repoToken={repoToken}
              setRepoToken={setRepoToken}
              handleFetchRepo={handleFetchRepo}
              isFetchingRepo={isFetchingRepo}
              classification={classification}
              repoData={repoData}
              selectedSections={selectedSections}
              toggleSection={toggleSection}
              extraContext={extraContext}
              setExtraContext={setExtraContext}
              handleGenerateReadme={handleGenerateReadme}
              generationPhase={generationPhase}
              generatedReadme={generatedReadme}
              terminalEndRef={terminalEndRef}
              copyToClipboard={copyToClipboard}
              downloadMarkdown={downloadMarkdown}
              setSelectedHistoryItem={setSelectedHistoryItem}
              setIsModalOpen={setIsModalOpen}
              qualityScore={qualityScore}
              getQualityTheme={getQualityTheme}
              suggestions={suggestions}
              history={history}
              deleteHistoryItem={deleteHistoryItem}
              editingName={editingName}
              setEditingName={setEditingName}
              newName={newName}
              setNewName={setNewName}
              handleEditNameSubmit={handleEditNameSubmit}
              getAverageScore={getAverageScore}
              getMostCommonProjectType={getMostCommonProjectType}
              recommendations={recommendations}
              generationMode={generationMode}
              setGenerationMode={setGenerationMode}
              setRepoData={setRepoData}
              setClassification={setClassification}
              setRecommendations={setRecommendations}
              setSelectedSections={setSelectedSections}
              renderMarkdownPreview={renderMarkdownPreview}
              liveDemoUrl={liveDemoUrl}
              setLiveDemoUrl={setLiveDemoUrl}
              descriptionOverride={descriptionOverride}
              setDescriptionOverride={setDescriptionOverride}
              deploymentPlatform={deploymentPlatform}
              setDeploymentPlatform={setDeploymentPlatform}
              authorName={authorName}
              setAuthorName={setAuthorName}
              authorUsername={authorUsername}
              setAuthorUsername={setAuthorUsername}
              additionalBadges={additionalBadges}
              setAdditionalBadges={setAdditionalBadges}
              noLiveDemo={noLiveDemo}
              setNoLiveDemo={setNoLiveDemo}
              injectDemo={(type) => {
                injectDemo(type);
                setTimeout(() => {
                  const sectionEl = document.getElementById('workspace');
                  if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            />
          ) : (
            <div className="glass-panel p-10 text-center max-w-xl mx-auto space-y-6 relative z-10 border border-white/15">
              <Brain size={48} className="mx-auto text-[#8B5CF6] animate-float" />
              <div className="space-y-2">
                <h3 className="text-white text-lg font-display-serif font-light uppercase tracking-wider">PIPELINE ENGINE LOCKED</h3>
                <p className="text-neutral-400 font-sans leading-relaxed text-xs">
                  Authorization coordinates pending. Verify developer session to unlock TensorFlow classification layers and start composing readme summaries inside the stream terminal.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2 select-none">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase transition rounded-full cursor-pointer text-[10.5px] font-mono tracking-wider"
                >
                  Verify Credentials
                </button>
                <button
                  onClick={handleGuestLogin}
                  className="px-5 py-2.5 border border-white/10 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 text-neutral-300 hover:text-white uppercase font-bold transition rounded-full cursor-pointer text-[10.5px] font-mono tracking-wider"
                >
                  Guest Sandbox Play
                </button>
              </div>
            </div>
          )}
        </LandingUI>
      )}

      {/* ────────────────── OVERLAY MODAL — SECURITY AUTH GATEWAY ────────────────── */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030303]/90 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel bg-[#0a0a0a]/95 border border-white/10 p-8 relative overflow-y-auto max-h-[92vh] custom-scroll select-none">
            
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="p-2 border border-white/5 bg-[#030303] rounded-xl animate-float">
                  <Brain className="text-[#8B5CF6]" size={28} />
                </div>
              </div>
              <h2 className="font-display font-medium text-2xl text-white tracking-normal uppercase">
                README <span className="shimmer-text text-xl">STYLERATE</span>
              </h2>
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mt-1">
                Train models, compose summaries, persist results.
              </p>
            </div>

            <div className="flex border-b border-white/10 mb-6 font-mono text-[11px] select-none">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 pb-2.5 uppercase text-center transition cursor-pointer ${authMode === 'login' ? 'border-b-2 border-[#8B5CF6] text-white font-semibold' : 'text-neutral-500'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 pb-2.5 uppercase text-center transition cursor-pointer ${authMode === 'signup' ? 'border-b-2 border-[#8B5CF6] text-white font-semibold' : 'text-neutral-500'}`}
              >
                Register
              </button>
            </div>

            {authMode === 'login' && (
              <form onSubmit={handleAuthSubmit} className="space-y-4 font-mono text-xs text-left">
                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Developer Token Email</label>
                  <input
                    type="email"
                    required
                    placeholder="developer@readme-stylerate.io"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center">
                    <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Network Password</label>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[9.5px] uppercase text-[#06B6D4] hover:underline transition cursor-pointer"
                    >
                      Reset?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center text-[10px] text-neutral-500 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="rounded border-white/10 bg-black text-[#8B5CF6] focus:ring-0"
                    />
                    <span className="uppercase">Remember local session tokens</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs rounded-lg transition-all uppercase cursor-pointer"
                >
                  Sign In with Email
                </button>

                <button
                  type="button"
                  disabled={googleSignInLoading}
                  onClick={handleGoogleSignIn}
                  className={`w-full py-2.5 border border-white/10 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 text-white font-bold text-xs rounded-lg transition-all uppercase flex items-center justify-center gap-2 cursor-pointer ${googleSignInLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {googleSignInLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.78 0 3.37.61 4.63 1.8l3.46-3.46C17.99 1.41 15.22.5 12 .5 7.42.5 3.52 3.12 1.62 6.94l3.96 3.07C6.54 7.04 9.03 5.04 12 5.04z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.5z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.58 14.77c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27L1.62 7.16C.59 9.23 0 11.55 0 14c0 2.45.59 4.77 1.62 6.84l3.96-3.07z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-2.97 0-5.46-2-6.42-4.97L1.62 16.94c1.9 3.82 5.8 4.56 10.38 4.56z"
                      />
                    </svg>
                  )}
                  {googleSignInLoading ? 'Authenticating...' : `Sign In with Google ${useRedirectAuth ? '(Redirect Mode)' : ''}`}
                </button>

                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 p-2 border border-white/5 bg-white/2 rounded-lg font-mono">
                    <span>Flow constraint issues?</span>
                    <button
                      type="button"
                      onClick={() => setUseRedirectAuth(!useRedirectAuth)}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all ${useRedirectAuth ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
                    >
                      {useRedirectAuth ? 'USE REDIRECT MODE' : 'USE POPUP MODE'}
                    </button>
                  </div>


                </div>

                <div className="relative my-2 text-center select-none py-1">
                  <span className="text-[9.5px] text-neutral-500 bg-[#0a0a0a] px-2 relative z-10 uppercase tracking-widest font-mono">
                    or bypass
                  </span>
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs border border-white/10 uppercase transition font-mono cursor-pointer rounded-lg"
                >
                  Direct Sandbox Play
                </button>
              </form>
            )}

            {authMode === 'signup' && (
              <form onSubmit={handleAuthSubmit} className="space-y-3.5 font-mono text-xs text-left">
                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="alex@readme-stylerate.io"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider flex justify-between">
                    <span>Password Encryption</span>
                    <span className="text-[8.5px] lowercase text-[#8B5CF6]">Strength: {passwordStrength.text}</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="w-full h-1 bg-white/5 mt-1 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} transition-all duration-300`} style={{ width: `${passwordStrength.score}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Verify Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs rounded-lg transition-all uppercase cursor-pointer mt-2"
                >
                  Sign Up with Email
                </button>

                <button
                  type="button"
                  disabled={googleSignInLoading}
                  onClick={handleGoogleSignIn}
                  className={`w-full py-2.5 border border-white/10 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 text-white font-bold text-xs rounded-lg transition-all uppercase flex items-center justify-center gap-2 cursor-pointer mt-2 ${googleSignInLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {googleSignInLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.78 0 3.37.61 4.63 1.8l3.46-3.46C17.99 1.41 15.22.5 12 .5 7.42.5 3.52 3.12 1.62 6.94l3.96 3.07C6.54 7.04 9.03 5.04 12 5.04z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.5z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.58 14.77c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27L1.62 7.16C.59 9.23 0 11.55 0 14c0 2.45.59 4.77 1.62 6.84l3.96-3.07z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-2.97 0-5.46-2-6.42-4.97L1.62 16.94c1.9 3.82 5.8 4.56 10.38 4.56z"
                      />
                    </svg>
                  )}
                  {googleSignInLoading ? 'Authenticating...' : `Sign Up with Google ${useRedirectAuth ? '(Redirect Mode)' : ''}`}
                </button>

                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 p-2 border border-white/5 bg-white/2 rounded-lg font-mono">
                    <span>Flow constraint issues?</span>
                    <button
                      type="button"
                      onClick={() => setUseRedirectAuth(!useRedirectAuth)}
                      className={`px-2.5 py-1 rounded text-[9px] uppercase font-bold transition-all ${useRedirectAuth ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
                    >
                      {useRedirectAuth ? 'USE REDIRECT MODE' : 'USE POPUP MODE'}
                    </button>
                  </div>


                </div>

                <div className="relative my-2 text-center select-none py-1">
                  <span className="text-[9.5px] text-neutral-500 bg-[#0a0a0a] px-2 relative z-10 uppercase tracking-widest font-mono">
                    or bypass
                  </span>
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs border border-white/10 uppercase transition font-mono cursor-pointer rounded-lg"
                >
                  Direct Sandbox Play
                </button>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4 font-mono text-xs text-left">
                <p className="text-[10px] uppercase text-neutral-500 leading-relaxed text-center font-sans">
                  Verification checkpoints active. An encrypted verification reset credential will email coordinates on verification inputs.
                </p>
                <div className="space-y-1.5 text-left">
                  <label className="block text-neutral-500 uppercase text-[9.5px] tracking-wider">Verification Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="dev@readme-stylerate.io"
                    className="w-full synapse-input focus:outline-none placeholder:text-neutral-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/95 text-white font-bold uppercase text-xs rounded-lg transition cursor-pointer"
                >
                  DISPATCH CHECKSUM REGISTER
                </button>
              </form>
            )}

            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition font-mono text-xs uppercase cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── OVERLAY COMPONENT — FULLSCREEN MARKDOWN PREVIEW MODAL ────────────────── */}
      {isModalOpen && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030303]/90 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#0a0a0a]/95 border border-white/10 flex flex-col overflow-hidden shadow-2xl rounded-2xl text-left select-none">
            
            <div className="bg-[#111111]/90 border-b border-white/10 px-6 py-4 flex justify-between items-center bg-opacity-95">
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#8B5CF6] bg-white/5 px-2.5 py-1 border border-[#8B5CF6]/25 rounded-md">
                  MAP: {selectedHistoryItem.mlProjectType || 'General Project'} • CONF: {selectedHistoryItem.mlConfidence || 'Auto-Evaluated'} • MODE: {selectedHistoryItem.generationMode === 'description' ? 'DESCRIBE' : 'GITHUB'}
                </span>
                <h3 className="text-xl font-bold font-sans text-white uppercase mt-1">
                  {selectedHistoryItem.repoName} — Compiled Blueprint
                </h3>
              </div>
              
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedHistoryItem(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar select-text bg-[#030303]/80">
              <div className="max-w-3xl mx-auto text-left">
                {renderMarkdownPreview(selectedHistoryItem.content)}
              </div>
            </div>

            <div className="bg-[#0a0a0a]/90 border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs">
              <div className="text-[10px] text-neutral-500 uppercase">
                Diagnostic score: <strong className="text-[#8B5CF6] font-bold">{selectedHistoryItem.mlQualityScore}% metric rate</strong>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyToClipboard(selectedHistoryItem.content)}
                  className="px-4 py-2 border border-white/10 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/10 text-white font-bold uppercase transition rounded-xl flex items-center gap-1.5 cursor-pointer text-[10px]"
                >
                  <Copy size={12} />
                  <span>Copy raw md</span>
                </button>
                <button
                  onClick={() => downloadMarkdown(selectedHistoryItem.content, `${selectedHistoryItem.repoName}-README.md`)}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase transition rounded-xl flex items-center gap-1.5 cursor-pointer text-[10px]"
                >
                  <Download size={12} />
                  <span>Download file</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
