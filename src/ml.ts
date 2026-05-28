/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as tf from '@tensorflow/tfjs';
import { RepoData, MLClassification, SectionRecommendation } from './types';

// Categories (10 classes)
export const PROJECT_TYPES = [
  "Web Frontend",      // 0
  "API Backend",       // 1
  "CLI Tool",          // 2
  "ML / Data Science", // 3
  "Mobile App",        // 4
  "Library / SDK",     // 5
  "DevOps / Infra",    // 6
  "Game",              // 7
  "Documentation",     // 8
  "Full Stack App"     // 9
];

// SECTION_PROFILES (10 classes coordinates)
export const SECTION_PROFILES: Record<string, number[]> = {
  "badges":         [0.9, 0.9, 0.8, 0.9, 0.8, 1.0, 0.7, 0.8, 0.6, 0.9],
  "overview":       [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  "features":       [1.0, 0.9, 0.9, 0.8, 1.0, 0.9, 0.7, 1.0, 0.5, 1.0],
  "tech_stack":     [1.0, 1.0, 0.7, 1.0, 1.0, 0.8, 1.0, 0.8, 0.3, 1.0],
  "installation":   [0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.9, 0.2, 1.0],
  "usage":          [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 0.8, 1.0],
  "api_docs":       [0.4, 1.0, 0.3, 0.5, 0.4, 0.8, 0.3, 0.2, 0.5, 0.7],
  "configuration":  [0.5, 1.0, 0.8, 0.6, 0.5, 0.5, 1.0, 0.3, 0.2, 0.8],
  "docker":         [0.4, 0.9, 0.4, 0.7, 0.3, 0.3, 1.0, 0.2, 0.1, 0.8],
  "testing":        [0.8, 0.9, 0.8, 0.9, 0.8, 1.0, 0.8, 0.7, 0.3, 0.9],
  "contributing":   [0.9, 0.9, 0.8, 0.9, 0.8, 1.0, 0.7, 0.8, 0.7, 0.9],
  "license":        [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  "roadmap":        [0.7, 0.6, 0.5, 0.6, 0.7, 0.8, 0.4, 0.7, 0.4, 0.7],
  "faq":            [0.8, 0.5, 0.6, 0.4, 0.7, 0.7, 0.3, 0.6, 0.8, 0.6],
  "screenshots":    [1.0, 0.3, 0.4, 0.5, 1.0, 0.4, 0.2, 1.0, 0.6, 1.0],
  "acknowledgements":[0.6, 0.6, 0.6, 0.7, 0.6, 0.8, 0.5, 0.7, 0.8, 0.6]
};

// Singleton TensorFlow models
let classifierModel: tf.Sequential | null = null;
let scorerModel: tf.Sequential | null = null;

// Ensure models compiled and ready
export function isMLEngineReady(): boolean {
  return classifierModel !== null && scorerModel !== null;
}

/**
 * FEATURE ENGINEERING PIPELINE 1 — build 40 element TF-IDF feature vector
 */
export function buildFeatureVector(repo: RepoData): Float32Array {
  const vec = new Float32Array(40);
  const desc = (repo.description || '').toLowerCase();
  const name = (repo.name || '').toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const files = (repo.files || []).map(f => f.toLowerCase());

  // 1. Language features [0-9]
  const lang = (repo.language || '').toLowerCase();
  if (lang.includes('javascript') || lang.includes('typescript') || lang.includes('js') || lang.includes('ts')) vec[0] = 1;
  else if (lang.includes('python') || lang.includes('py')) vec[1] = 1;
  else if (lang.includes('java')) vec[2] = 1;
  else if (lang.includes('go')) vec[3] = 1;
  else if (lang.includes('rust')) vec[4] = 1;
  else if (lang.includes('c++') || lang.includes('cpp')) vec[5] = 1;
  else if (lang.includes('ruby')) vec[6] = 1;
  else if (lang.includes('php')) vec[7] = 1;
  else if (lang.includes('swift') || lang.includes('kotlin') || lang.includes('objective-c')) vec[8] = 1;
  else vec[9] = 1; // Other

  // 2. File presence indicators [10-19]
  const hasFile = (fName: string) => files.some(f => f === fName || f.endsWith('/' + fName)) ? 1 : 0;
  vec[10] = hasFile('dockerfile') || hasFile('dockerfile.dev') ? 1 : 0;
  vec[11] = hasFile('docker-compose.yml') || hasFile('docker-compose.yaml') ? 1 : 0;
  vec[12] = hasFile('requirements.txt') || hasFile('pipfile') ? 1 : 0;
  vec[13] = hasFile('package.json') ? 1 : 0;
  vec[14] = hasFile('makefile') || hasFile('make') ? 1 : 0;
  vec[15] = files.some(f => f.startsWith('.github/') || f.includes('workflow')) ? 1 : 0;
  vec[16] = files.some(f => f.includes('test') || f.includes('spec')) ? 1 : 0;
  vec[17] = files.some(f => f.includes('docs') || f.includes('doc')) ? 1 : 0;
  vec[18] = hasFile('.env.example') || hasFile('.env.sample') ? 1 : 0;
  vec[19] = hasFile('setup.py') || hasFile('setup.cfg') ? 1 : 0;

  // 3. Topic keywords [20-29]
  const mentions = (term: string) => desc.includes(term) || name.includes(term) || topics.some(t => t.includes(term)) ? 1 : 0;
  vec[20] = mentions('api') || mentions('backend') || mentions('rest') || mentions('graphql') || mentions('endpoint') ? 1 : 0;
  vec[21] = mentions('cli') || mentions('command-line') || mentions('script') || mentions('tool') || mentions('utility') ? 1 : 0;
  vec[22] = mentions('ml') || mentions('ai') || mentions('tensorflow') || mentions('keras') || mentions('torch') || mentions('model') || mentions('predict') ? 1 : 0;
  vec[23] = mentions('mobile') || mentions('ios') || mentions('android') || mentions('flutter') || mentions('react-native') || mentions('app') ? 1 : 0;
  vec[24] = mentions('game') || mentions('unity') || mentions('unreal') || mentions('canvas') || mentions('physics') || mentions('play') ? 1 : 0;
  vec[25] = mentions('web') || mentions('frontend') || mentions('ui') || mentions('css') || mentions('react') || mentions('vue') || mentions('angular') || mentions('html') ? 1 : 0;
  vec[26] = mentions('library') || mentions('sdk') || mentions('package') || mentions('wrapper') || mentions('helper') ? 1 : 0;
  vec[27] = mentions('devops') || mentions('infra') || mentions('terrafom') || mentions('kubernetes') || mentions('k8s') || mentions('aws') || mentions('docker') ? 1 : 0;
  vec[28] = mentions('data') || mentions('sql') || mentions('database') || mentions('spark') || mentions('analytics') || mentions('db') ? 1 : 0;
  vec[29] = mentions('fullstack') || mentions('stack') || mentions('nextjs') || mentions('remix') || mentions('sveltekit') ? 1 : 0;

  // 4. Normalized numeric stats [30-34]
  vec[30] = Math.min(repo.stars / 10000, 1);
  vec[31] = Math.min(repo.forks / 1000, 1);
  vec[32] = 0.4; // Average contributors
  vec[33] = Math.min(files.length / 100, 1);
  vec[34] = Math.min(repo.openIssues / 500, 1);

  // 5. TF-IDF keywords against description [35-39]
  const seedTerms = ["server", "frontend", "model", "deploy", "game"];
  const words = desc.split(/\s+/).filter(Boolean);
  const totalWords = words.length || 1;

  seedTerms.forEach((term, idx) => {
    const occurrences = words.filter(w => w.includes(term)).length;
    const tf = occurrences / totalWords;
    const idf = Math.log(10 / (1 + occurrences));
    const tfidf = tf * idf;
    vec[35 + idx] = Math.min(tfidf * 5, 1); // Capped at 1
  });

  return vec;
}

/**
 * FEATURE EXTRACTION PIPELINE 3 — extract 15 markdown features for quality scoring
 */
export function extractMarkdownFeatures(markdown: string): number[] {
  const lines = markdown.split('\n');
  const words = markdown.split(/\s+/).filter(Boolean);

  const h1Count = lines.filter(l => l.startsWith('# ')).length;
  const h2Count = lines.filter(l => l.startsWith('## ')).length;
  const h3Count = lines.filter(l => l.startsWith('### ')).length;
  const codeBlockCount = (markdown.match(/```/g) || []).length / 2;
  const linkCount = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
  const listItems = lines.filter(l => l.trim().match(/^[-*+] /) || l.trim().match(/^\d+\. /)).length;
  const imgCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const hasBadges = (markdown.includes('shields.io') || markdown.includes('badge')) ? 1 : 0;
  const tableCount = (markdown.match(/\|/g) || []).length / 20;

  const textLower = markdown.toLowerCase();
  const hasInstall = textLower.includes('install') || textLower.includes('setup') ? 1 : 0;
  const hasUsage = textLower.includes('usage') || textLower.includes('how to use') ? 1 : 0;
  const hasContrib = textLower.includes('contribut') || textLower.includes('pull request') ? 1 : 0;
  const hasLicense = textLower.includes('license') || textLower.includes('mit') || textLower.includes('apache') ? 1 : 0;
  const density = lines.filter(l => l.trim().length > 50).length;

  return [
    Math.min(h1Count / 1, 1),
    Math.min(h2Count / 10, 1),
    Math.min(h3Count / 15, 1),
    Math.min(codeBlockCount / 8, 1),
    Math.min(linkCount / 10, 1),
    Math.min(words.length / 500, 1),
    Math.min(listItems / 20, 1),
    Math.min(imgCount / 3, 1),
    hasBadges,
    Math.min(tableCount, 1),
    hasInstall,
    hasUsage,
    hasContrib,
    hasLicense,
    Math.min(density / 30, 1)
  ];
}

/**
 * Cosine Similarity calculation for Section Recommender
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magA && magB ? dotProduct / (magA * magB) : 0;
}

/**
 * Synthetic Training Data Creators conforming to ML structure criteria
 */
function buildClassifierTrainingData() {
  const trainingFeatures: number[][] = [];
  const trainingLabels: number[][] = [];

  const addNoise = (arr: number[]): number[] => {
    return arr.map(val => Math.max(0, Math.min(1, val + (Math.random() - 0.5) * 0.1)));
  };

  const oneHot = (idx: number, size: number): number[] => {
    const arr = new Array(size).fill(0);
    arr[idx] = 1;
    return arr;
  };

  // 10 categories, 20 samples per category = 200 samples
  for (let c = 0; c < 10; c++) {
    for (let s = 0; s < 20; s++) {
      const vec = new Array(40).fill(0);

      // Apply characteristic features for classes
      if (c === 0) { // Web Frontend
        vec[0] = 1; // js/ts is 1
        vec[13] = 1; // has_package_json
        vec[25] = 1; // mentions_web
      } else if (c === 1) { // API Backend
        vec[18] = 1; // has_env_example
        vec[20] = 1; // mentions_api
      } else if (c === 2) { // CLI Tool
        vec[14] = 1; // has_makefile
        vec[21] = 1; // mentions_cli
      } else if (c === 3) { // ML / Data Science
        vec[1] = 1; // python
        vec[12] = 1; // has_requirements
        vec[22] = 1; // mentions_ml_ai
      } else if (c === 4) { // Mobile App
        vec[8] = 1; // swift/kotlin
        vec[23] = 1; // mentions_mobile
      } else if (c === 5) { // Library / SDK
        vec[26] = 1; // mentions_library
        vec[30] = 0.8; // high star rating
      } else if (c === 6) { // DevOps / Infra
        vec[10] = 1; // has_dockerfile
        vec[27] = 1; // mentions_devops
      } else if (c === 7) { // Game
        vec[24] = 1; // mentions_game
      } else if (c === 8) { // Documentation
        vec[17] = 1; // has_docs
        vec[34] = 0.1; // low open issues
      } else if (c === 9) { // Full Stack App
        vec[0] = 1; // js/ts
        vec[10] = 1; // has_dockerfile
        vec[29] = 1; // mentions_fullstack
      }

      const featureNoised = addNoise(vec);
      trainingFeatures.push(featureNoised);
      trainingLabels.push(oneHot(c, 10));
    }
  }

  return { trainingFeatures, trainingLabels };
}

function buildScorerTrainingData() {
  const xs: number[][] = [];
  const ys: number[][] = [];

  // Great READMEs (Class 1) - 40 samples (scores 0.85 - 1.0)
  for (let i = 0; i < 40; i++) {
    const f = new Array(15).fill(1);
    f[1] = 0.8 + Math.random() * 0.2; // h2
    f[2] = 0.7 + Math.random() * 0.3; // h3
    f[3] = 0.6 + Math.random() * 0.4; // code blocks
    f[4] = 0.8 + Math.random() * 0.2; // links
    f[5] = 0.9 + Math.random() * 0.1; // words
    f[6] = 0.7 + Math.random() * 0.3; // bullet items
    f[7] = 0.5 + Math.random() * 0.5; // images
    f[14] = 0.8 + Math.random() * 0.2; // density
    xs.push(f);
    ys.push([0.85 + Math.random() * 0.14]);
  }

  // Good READMEs - 45 samples (scores 0.65 - 0.84)
  for (let i = 0; i < 45; i++) {
    const f = new Array(15).fill(0.8);
    f[1] = 0.5 + Math.random() * 0.3;
    f[2] = 0.4 + Math.random() * 0.3;
    f[3] = 0.4 + Math.random() * 0.3;
    f[5] = 0.6 + Math.random() * 0.2; // words (300ish)
    f[6] = 0.5 + Math.random() * 0.3;
    f[7] = 0.2 + Math.random() * 0.4;
    f[8] = 1.0; // badged
    xs.push(f);
    ys.push([0.65 + Math.random() * 0.19]);
  }

  // Average READMEs - 45 samples (scores 0.40 - 0.64)
  for (let i = 0; i < 45; i++) {
    const f = new Array(15).fill(0.5);
    f[1] = 0.2 + Math.random() * 0.3;
    f[2] = 0.1;
    f[3] = 0.2 + Math.random() * 0.2;
    f[5] = 0.3 + Math.random() * 0.2; // 150 words
    f[8] = Math.random() > 0.5 ? 1 : 0;
    f[10] = 1; // install is there
    f[11] = 1; // usage is there
    f[12] = 0; // miss contribute
    f[13] = 0; // miss license
    xs.push(f);
    ys.push([0.40 + Math.random() * 0.24]);
  }

  // Poor READMEs - 20 samples (scores 0.10 - 0.39)
  for (let i = 0; i < 20; i++) {
    const f = new Array(15).fill(0.1);
    f[0] = 1.0; // standard h1 is there
    f[10] = 0; f[11] = 0; f[12] = 0; f[13] = 0; f[14] = 0.1;
    xs.push(f);
    ys.push([0.10 + Math.random() * 0.29]);
  }

  return { xs, ys };
}

/**
 * End-to-end Parallel Training Pipeline of ML Models
 */
export async function trainMLModels(
  onProgress: (phase: 'classifier' | 'scorer', epoch: number, total: number, metric: number) => void
): Promise<void> {
  await tf.ready();

  // 1. PROJECT TYPE CLASSIFIER MODEL
  classifierModel = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [40], units: 64, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 32, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({ units: 16, activation: 'relu' }),
      tf.layers.dense({ units: 10, activation: 'softmax' })
    ]
  });

  classifierModel.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  const classData = buildClassifierTrainingData();
  const classXs = tf.tensor2d(classData.trainingFeatures);
  const classYs = tf.tensor2d(classData.trainingLabels);

  await classifierModel.fit(classXs, classYs, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const acc = logs ? (logs.acc as number || 0) : 0;
        onProgress('classifier', epoch + 1, 50, acc);
      }
    }
  });

  classXs.dispose();
  classYs.dispose();

  // 2. README QUALITY SCORER MODEL
  scorerModel = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [15], units: 32, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({ units: 16, activation: 'relu' }),
      tf.layers.dense({ units: 8, activation: 'relu' }),
      tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Output 0 to 1
    ]
  });

  scorerModel.compile({
    optimizer: tf.train.adam(0.002),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  const scorerData = buildScorerTrainingData();
  const scorerXs = tf.tensor2d(scorerData.xs);
  const scorerYs = tf.tensor2d(scorerData.ys);

  await scorerModel.fit(scorerXs, scorerYs, {
    epochs: 40,
    batchSize: 16,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const mae = logs ? (logs.mae as number || 0) : 0;
        onProgress('scorer', epoch + 1, 40, mae);
      }
    }
  });

  scorerXs.dispose();
  scorerYs.dispose();
}

/**
 * Inference: Classify a GitHub Repo
 */
export async function classifyRepo(repo: RepoData): Promise<MLClassification> {
  if (!classifierModel) {
    throw new Error('Classifier model is not ready.');
  }

  return tf.tidy(() => {
    const fVec = buildFeatureVector(repo);
    const tensor = tf.tensor2d([Array.from(fVec)]);
    const prediction = classifierModel!.predict(tensor) as tf.Tensor;
    const probs = prediction.dataSync();

    let topIdx = 0;
    let maxProb = 0;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        topIdx = i;
      }
    }

    return {
      projectType: PROJECT_TYPES[topIdx],
      confidence: (maxProb * 100).toFixed(1),
      probabilities: Array.from(probs)
    };
  });
}

/**
 * Inference: Recommend README sections based on Cosine Similarity
 */
export function recommendSections(probabilities: number[]): SectionRecommendation[] {
  const recommendations: SectionRecommendation[] = [];

  for (const [section, profile] of Object.entries(SECTION_PROFILES)) {
    const similarity = cosineSimilarity(probabilities, profile);
    recommendations.push({
      name: section,
      similarity,
      confidence: (similarity * 100).toFixed(1),
      recommended: similarity > 0.65
    });
  }

  // Sort by similarity score descending
  return recommendations.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Inference: Score a markdown README 0-100
 */
export async function scoreReadme(markdown: string): Promise<{ score: number; suggestions: string[] }> {
  if (!scorerModel) {
    throw new Error('Quality scorer model is not ready.');
  }

  const features = extractMarkdownFeatures(markdown);

  const scoreRaw = tf.tidy(() => {
    const tensor = tf.tensor2d([features]);
    const prediction = scorerModel!.predict(tensor) as tf.Tensor;
    return prediction.dataSync()[0];
  });

  const score = Math.round(scoreRaw * 100);

  // Generate actionable, smart suggestions based on features
  const suggestions: string[] = [];
  const lines = markdown.split('\n');
  const words = markdown.split(/\s+/).filter(Boolean);

  // features[3] = code block count (Math.min(count / 8, 1))
  if (features[3] < 0.3) {
    suggestions.push("💡 Add more interactive code examples with syntax highlighting to help developers understand implementation");
  }
  // features[4] = link count
  if (features[4] < 0.3) {
    suggestions.push("💡 Include quick links to external documentation, online demos, or associated libraries");
  }
  // features[8] = shields.io badges
  if (features[8] === 0) {
    suggestions.push("💡 Add visual shields.io badges in header for build status, version, license, and stars");
  }
  // Word count check
  if (words.length < 200) {
    suggestions.push("💡 Expand overview descriptions and usage instructions to make the documentation clearer");
  }
  // content density
  if (features[14] < 0.4) {
    suggestions.push("💡 Increase the documentation density by writing comprehensive instructions for setup, options, and behaviors");
  }
  // Missing sections
  if (features[10] === 0) suggestions.push("💡 Add a detailed, step-by-step Installation guide");
  if (features[11] === 0) suggestions.push("💡 Include concrete Usage Examples outlining common tasks");
  if (features[13] === 0) suggestions.push("💡 Add a licensing statement (e.g., Apache 2.0 or MIT licensing terms)");

  // Select top 3 suggestions
  const selectedSuggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);

  return {
    score,
    suggestions: selectedSuggestions
  };
}
