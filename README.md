<div align="center">

# 📄 README StyleRate

### AI-Powered GitHub README Generator

**Turn any GitHub repo URL or project description into a professional, production-ready README.md — powered by real machine learning and Gemini AI — completely free and open source.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-readme--stylerate.vercel.app-6C63FF?style=for-the-badge)](https://readme-stylerate.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-rishijain544-181717?style=for-the-badge&logo=github)](https://github.com/rishijain544/Readme_stylerate)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](https://github.com/rishijain544/Readme_stylerate/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/rishijain544/Readme_stylerate?style=for-the-badge&logo=github)](https://github.com/rishijain544/Readme_stylerate/stargazers)
[![Forks](https://img.shields.io/github/forks/rishijain544/Readme_stylerate?style=for-the-badge&logo=github)](https://github.com/rishijain544/Readme_stylerate/forks)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Powered by Gemini](https://img.shields.io/badge/Powered_by-Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![TensorFlow.js](https://img.shields.io/badge/ML-TensorFlow.js_4.2-FF6F00?style=for-the-badge&logo=tensorflow)](https://www.tensorflow.org/js)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_DB-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Open Source](https://img.shields.io/badge/Open_Source-Free_Forever-10B981?style=for-the-badge)](https://github.com/rishijain544/Readme_stylerate)

</div>

---

## 🔗 Live Demo

👉 **[https://readme-stylerate.vercel.app/](https://readme-stylerate.vercel.app/)**

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [ML Pipelines](#-ml-pipelines)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Deployment on Vercel](#-deployment-on-vercel)
- [How It Works](#-how-it-works)
- [Available Scripts](#-available-scripts)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🧠 About the Project

**README StyleRate** is a completely free, open-source AI web application that generates professional, production-grade GitHub README files in seconds. It supports two modes — paste a GitHub URL to auto-fetch all repo metadata, or describe your project manually using plain text. Either way, three real machine learning models run entirely in the browser using TensorFlow.js before the content ever reaches Gemini AI, making the output dramatically more accurate and context-aware than any simple prompt-to-text approach.

Built with **React 19 + TypeScript**, powered by **Google Gemini 2.0 Flash** for generation, **TensorFlow.js** for in-browser ML, **Firebase** for auth and data persistence, and deployed globally on **Vercel**.

> 💡 This project demonstrates real browser-based ML inference, multi-modal AI generation, and full-stack Firebase integration — all completely free and open source for the developer community.

---

## ✨ Features

| Module | Description |
|---|---|
| 🧠 **ML Project Classifier** | Neural network (10 classes, 50 epochs) classifies your repo type from a 40-dimensional TF-IDF feature vector — entirely in-browser via TensorFlow.js |
| 🎯 **Smart Section Recommender** | Cosine similarity engine compares your repo's ML vector against 16 section profiles and auto-selects the best README sections with confidence % |
| 📊 **README Quality Scorer** | 15-feature regression model scores every generated README 0–100 and gives specific, actionable improvement suggestions |
| ⬡ **GitHub URL Mode** | Fetches repo metadata, languages, contributors, releases, package.json, and full file tree via the GitHub REST API automatically |
| ✍ **Describe Project Mode** | Generate a complete README from plain text — no GitHub repo needed. ML features extracted directly from your description |
| 🔐 **Firebase Authentication** | Secure sign-in with Email/Password and Google OAuth via Firebase Auth v12 with persistent sessions |
| 📁 **README History** | Every generated README saved to Firestore with ML metadata, quality score, and generation mode for future reference |
| 🔍 **Optional Details Panel** | Manually add live demo URL, description override, deployment platform, author info, and extra shields.io badges |
| 🛡 **Error Monitoring** | Global error capture with Firestore logging and admin dashboard visible only to the project owner |
| 📱 **Fully Responsive** | Optimized for desktop, tablet, and mobile with adaptive layouts and hamburger navigation |
| 🎨 **Synapse UI Design** | Vantablack dark theme with glassmorphism panels, ambient orbs, shimmer animations, and neon accents |
| ♾️ **Free Forever** | No limits, no subscriptions, no credit card — completely open source and free for every developer |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | 5.8 | Type Safety |
| Vite | 6.2 | Build Tool & Dev Server |
| Tailwind CSS | 4.1 | Utility-first Styling |
| Motion | 12.23 | Animations & Transitions |
| Lucide React | 0.546 | Icon System |

### Backend & AI
| Technology | Version | Purpose |
|---|---|---|
| Google Gemini API | @google/genai v1.29 | README text generation |
| TensorFlow.js | 4.22 | In-browser ML model training & inference |
| Express.js | 4.21 | API Server |
| TSX | 4.21 | TypeScript server runtime |
| esbuild | 0.25 | Server bundler for production |

### Database & Auth
| Technology | Purpose |
|---|---|
| Firebase Auth v12 | Email/Password + Google Sign-In |
| Cloud Firestore | READMEs, user profiles, error logs |
| Firebase Security Rules | Per-user row-level data access control |

### DevOps
| Technology | Purpose |
|---|---|
| Vercel | Frontend hosting + serverless API functions |
| GitHub | Version control + automatic CI/CD |

---

## 🤖 ML Pipelines

README StyleRate runs **three real ML models** in the browser before calling Gemini — making it a genuine ML application, not just an API wrapper.

### Pipeline 1 — Project Type Classifier
- **Algorithm:** 4-layer dense neural network with dropout regularization
- **Input:** 40-dimensional feature vector built from repo data or text description
- **Feature groups:** Language one-hot encoding (10), file presence binary flags (10), topic keyword detection (10), normalized metrics (5), TF-IDF scores (5)
- **Output:** One of 10 project categories with confidence percentage
- **Training:** 200 synthetic samples, 50 epochs, Adam optimizer — runs in ~3–5 seconds on page load
- **Classes:** Web Frontend · API Backend · CLI Tool · ML/Data Science · Mobile App · Library/SDK · DevOps/Infra · Game · Documentation · Full Stack

### Pipeline 2 — Section Recommender
- **Algorithm:** Cosine similarity between repo probability vector and 16 hardcoded section profile vectors
- **Input:** Softmax probability distribution output from Pipeline 1
- **Output:** Confidence-ranked section recommendations with % badge on each chip
- **Threshold:** Similarity > 0.65 automatically selects the section chip

### Pipeline 3 — README Quality Scorer
- **Algorithm:** 4-layer regression neural network with sigmoid output
- **Input:** 15 structural features extracted from the generated markdown
- **Features:** H1–H3 counts, code block density, link count, word count, list items, badge presence, table usage, section completeness, content density
- **Output:** Quality score 0–100 with up to 3 targeted improvement suggestions
- **Training:** 150 synthetic samples, 40 epochs

---

## 📁 Project Structure

```
Readme_stylerate/
│
├── api/                           # Express API route handlers
├── src/                           # React frontend source code
│
├── index.html                     # App HTML entry point
├── server.ts                      # Express server + Gemini API integration
├── vite.config.ts                 # Vite build configuration
├── tsconfig.json                  # TypeScript compiler configuration
├── vercel.json                    # Vercel deployment + security headers
├── firestore.rules                # Production Firestore security rules
├── DRAFT_firestore.rules          # Development rules reference
├── firebase-applet-config.json    # Firebase app configuration
├── firebase-blueprint.json        # Firestore schema reference
├── security_spec.md               # Security audit documentation
├── metadata.json                  # App metadata
├── .env.example                   # Environment variables template
├── package.json                   # Dependencies and npm scripts
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Gemini API Key → [Get it free here](https://aistudio.google.com/app/apikey)
- Firebase project → [Create one here](https://console.firebase.google.com)
- GitHub Personal Access Token → [Generate here](https://github.com/settings/tokens/new) *(optional — for private repos & higher rate limits)*

### Local Setup

**1. Clone the repository**
```bash
git clone https://github.com/rishijain544/Readme_stylerate.git
cd Readme_stylerate
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your environment file**
```bash
cp .env.example .env.local
# Open .env.local and fill in your API keys
```

**4. Start the development server**
```bash
npm run dev
```

Visit `http://localhost:3000` and you're ready to go! 🎉

---

## 🔑 Environment Variables

Create `.env.local` in the project root:

```env
# ─── Google Gemini API ──────────────────────────────────
# Get free at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy_your_key_here

# ─── Firebase Config ─────────────────────────────────────
# Get from: Firebase Console → Project Settings → Your Apps
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# ─── GitHub Token (optional) ─────────────────────────────
# Increases API rate limit from 60 to 5000 requests/hour
# Required only for private repositories
GITHUB_TOKEN=ghp_your_token_here
```

> **After deploying to Vercel:** Firebase Console → Authentication → Settings → Authorized domains → Add your Vercel URL

---

## 🔥 Firebase Setup

```
1. Go to → https://console.firebase.google.com
2. Click "Create a project" → enter name → Continue
3. Add Web App → nickname "readme-stylerate" → Register app
4. Copy the firebaseConfig object → paste into .env.local
5. Authentication → Sign-in method → Enable:
   ✓ Email/Password
   ✓ Google (select your support email)
6. Firestore Database → Create database → Start in Test mode
   → Select your closest region → Enable
7. Firestore → Rules tab → paste contents of firestore.rules
   → Click "Publish"
```

**Firestore Collections (auto-created on first use):**

| Collection | Purpose |
|---|---|
| `users/` | User profiles, display names, creation dates |
| `readmes/` | Generated README content with ML metadata and quality scores |
| `errors/` | Client-side error logs for monitoring (admin-only read) |

---

## 🌐 Deployment on Vercel

**1. Push to GitHub**
```bash
git add .
git commit -m "deploy README StyleRate"
git push origin main
```

**2. Import on Vercel**
- Go to [vercel.com](https://vercel.com) → **Add New Project**
- Import your `Readme_stylerate` GitHub repo
- Add all environment variables under **Settings → Environment Variables**
- Click **Deploy** ✅

**3. Add your Vercel domain to Firebase**
- Firebase Console → Authentication → Settings → Authorized domains
- Click **Add domain** → enter `readme-stylerate.vercel.app`

**4. Restrict your Gemini API key (recommended)**
- [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
- Edit your key → HTTP referrers → Add `readme-stylerate.vercel.app/*`

---

## ⚙️ How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                        USER FLOW                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User signs in (Email/Password or Google OAuth)          │
│              ↓                                               │
│  2. Selects generation mode:                                 │
│     ⬡ GitHub URL  → fetches repo via GitHub REST API        │
│     ✍ Describe   → types project description manually      │
│              ↓                                               │
│  3. [ML PIPELINE 1] Project Type Classifier                 │
│     40-feature TF-IDF vector → Neural Net → Type + %        │
│              ↓                                               │
│  4. [ML PIPELINE 2] Section Recommender                     │
│     Cosine Similarity → Auto-selects best README sections   │
│     with confidence % badge on each chip                    │
│              ↓                                               │
│  5. User reviews section chips + adds optional context      │
│              ↓                                               │
│  6. Enriched JSON payload (repo data + ML results)          │
│     sent to Gemini 2.0 Flash API                            │
│              ↓                                               │
│  7. README streams live into terminal output panel          │
│              ↓                                               │
│  8. [ML PIPELINE 3] Quality Scorer                          │
│     15 markdown features → Score 0–100 + suggestions        │
│              ↓                                               │
│  9. README + ML metadata auto-saved to Firestore            │
│              ↓                                               │
│  10. User copies, downloads .md file, or views in history  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server (frontend + Express backend)
npm run build    # Build frontend via Vite + bundle API via esbuild
npm run start    # Start production server from dist/
npm run lint     # TypeScript type checking with tsc --noEmit
npm run clean    # Remove dist/ build folder
```

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contribution you make is **greatly appreciated**.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

For major changes, please open an issue first to discuss what you'd like to change.

---

## 📝 License

Open source under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Rishi Jain**

[![GitHub](https://img.shields.io/badge/GitHub-rishijain544-181717?style=flat-square&logo=github)](https://github.com/rishijain544)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rishi_Jain-0077B5?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/rishi-jain-837b75312)
[![Email](https://img.shields.io/badge/Email-rishijain30a@gmail.com-D14836?style=flat-square&logo=gmail)](mailto:rishijain30a@gmail.com)
[![Live App](https://img.shields.io/badge/Live_App-README_StyleRate-6C63FF?style=flat-square)](https://readme-stylerate.vercel.app/)

---

<div align="center">

Made with ❤️ by Rishi Jain

**⭐ Star this repo if you found it useful! ⭐**

`Gemini AI` · `TensorFlow.js` · `React 19` · `Firebase` · `TypeScript` · `Vercel` · `Open Source`

</div>
