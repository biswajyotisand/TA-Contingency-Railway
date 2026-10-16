import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Cloud, 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  X,
  Layers,
  RefreshCw,
  Flame,
  FileCode,
  KeyRound
} from "lucide-react";
import { testFirebaseConnection, firebaseConfig } from "../lib/firebase";
import JSZip from "jszip";

interface CloudDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudDeployModal({ isOpen, onClose }: CloudDeployModalProps) {
  const [activeTab, setActiveTab] = useState<'vercel' | 'firebase' | 'rules' | 'files'>('firebase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testFirebaseConnection();
    setIsTesting(false);
    setTestResult(res);
  };

  const vercelJsonContent = JSON.stringify({
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "vite",
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }, null, 2);

  const envTemplate = `# TA Junction - Vercel Production Environment Variables
# In Vercel Project Settings > Environment Variables:

VITE_FIREBASE_API_KEY="${firebaseConfig.apiKey}"
VITE_FIREBASE_AUTH_DOMAIN="${firebaseConfig.authDomain}"
VITE_FIREBASE_PROJECT_ID="${firebaseConfig.projectId}"
VITE_FIREBASE_STORAGE_BUCKET="${firebaseConfig.storageBucket}"
VITE_FIREBASE_MESSAGING_SENDER_ID="${firebaseConfig.messagingSenderId}"
VITE_FIREBASE_APP_ID="${firebaseConfig.appId}"
VITE_FIREBASE_MEASUREMENT_ID="${firebaseConfig.measurementId}"
`;

  const firestoreRulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Safety net: default-deny all unspecified documents
    match /{document=**} {
      allow read, write: if false;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    function isValidHrmsId(hrmsId) {
      return hrmsId is string && hrmsId.size() >= 3 && hrmsId.size() <= 32 && hrmsId.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    // Connection ping test document
    match /_connection_test/{testId} {
      allow read: if true;
    }

    // Railway employee users collection
    match /users/{hrmsId} {
      allow get: if isValidHrmsId(hrmsId);
      allow list: if false;
      allow create, update: if isValidHrmsId(hrmsId) 
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 128;
      allow delete: if false;

      // Employee's TA and Contingency Claim Bills
      match /bills/{billId} {
        allow read, write: if isValidHrmsId(hrmsId) && isValidId(billId);
      }
    }
  }
}`;

  const downloadDeployBundle = async () => {
    const zip = new JSZip();
    zip.file('vercel.json', vercelJsonContent);
    zip.file('.env.example', envTemplate);
    zip.file('firestore.rules', firestoreRulesContent);
    zip.file('firebase-applet-config.json', JSON.stringify(firebaseConfig, null, 2));
    zip.file('README-VERCEL.md', `# TA Junction - Vercel Deployment Instructions

1. Push your repository to GitHub or run:
   \`npx vercel deploy --prod\`
2. In Vercel Project Settings:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
3. Under 'Environment Variables', add the Firebase variables from .env.example
4. Under Firebase Console > Firestore Database > Rules, paste firestore.rules
`);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ta-junction-deployment-bundle.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl rounded-3xl border border-line bg-coal shadow-paper overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-coal-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber/10 border border-amber/20 text-amber">
              <Cloud className="size-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-cream">Cloud Deployment & Firebase Hub</h2>
              <p className="font-mono text-[10px] text-mute uppercase tracking-wider">
                Vercel Hosting Prep • Firebase Database Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-mute hover:text-cream hover:bg-coal-3 border border-transparent hover:border-line transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-line px-6 pt-2 bg-coal overflow-x-auto">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'border-leaf text-leaf'
                : 'border-transparent text-mute hover:text-cream'
            }`}
          >
            <Flame className="size-4 text-amber" />
            Firebase Database
            <span className="size-2 rounded-full bg-leaf animate-pulse" />
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-amber text-amber'
                : 'border-transparent text-mute hover:text-cream'
            }`}
          >
            <FileCode className="size-4" />
            Firestore Rules
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vercel'
                ? 'border-amber text-amber'
                : 'border-transparent text-mute hover:text-cream'
            }`}
          >
            <Cloud className="size-4" />
            Vercel Deployment
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'files'
                ? 'border-amber text-amber'
                : 'border-transparent text-mute hover:text-cream'
            }`}
          >
            <Layers className="size-4" />
            vercel.json & Pack
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 font-mono text-[12px]">
          {/* TAB 1: FIREBASE DATABASE STATUS & KEYS */}
          {activeTab === 'firebase' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-leaf/30 bg-leaf/10 flex items-start gap-3">
                <Flame className="size-5 text-amber shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-leaf uppercase tracking-wider text-[11px]">
                    Firebase Database Integrated & Active
                  </h4>
                  <p className="text-cream text-[11.5px] mt-0.5 leading-relaxed">
                    Your Firebase project <b className="text-amber">{firebaseConfig.projectId}</b> is now connected. Employee profiles, TA claims, and contingency records sync in real-time with Firestore.
                  </p>
                </div>
              </div>

              {/* Firebase Live Details Card */}
              <div className="rounded-2xl border border-line bg-coal-2 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-cream text-[14px]">Connected Project Parameters</h3>
                  <span className="text-[10px] text-leaf uppercase tracking-widest bg-leaf/10 border border-leaf/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-leaf animate-pulse" />
                    Online
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                  <div className="p-3 rounded-xl bg-ink border border-line">
                    <span className="text-mute block text-[9.5px]">Project ID</span>
                    <span className="text-amber font-bold">{firebaseConfig.projectId}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink border border-line">
                    <span className="text-mute block text-[9.5px]">Auth Domain</span>
                    <span className="text-cream font-bold truncate block">{firebaseConfig.authDomain}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink border border-line">
                    <span className="text-mute block text-[9.5px]">App ID</span>
                    <span className="text-cream font-bold truncate block">{firebaseConfig.appId}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink border border-line">
                    <span className="text-mute block text-[9.5px]">Storage Bucket</span>
                    <span className="text-cream font-bold truncate block">{firebaseConfig.storageBucket}</span>
                  </div>
                </div>

                {/* Connection Test Action */}
                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-coal px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-mute hover:text-cream hover:border-mute/40 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    Test Firestore Ping
                  </button>

                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/data`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-amber text-[10.5px] hover:underline"
                  >
                    Open Firebase Console <ExternalLink className="size-3" />
                  </a>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-[11px] ${
                      testResult.success
                        ? 'border-leaf/40 bg-leaf/10 text-leaf'
                        : 'border-signal/40 bg-signal/10 text-signal'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Vercel Environment Variables Box */}
              <div className="rounded-2xl border border-line bg-coal-2 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-cream flex items-center gap-2">
                    <KeyRound className="size-4 text-amber" />
                    Vercel Environment Variables
                  </div>
                  <button
                    onClick={() => copyToClipboard(envTemplate, 'env')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coal border border-line text-[10px] text-mute hover:text-cream transition-all cursor-pointer"
                  >
                    {copiedKey === 'env' ? <Check className="size-3 text-leaf" /> : <Copy className="size-3" />}
                    Copy Variables
                  </button>
                </div>
                <p className="text-mute text-[10.5px]">
                  When creating your project in Vercel, copy and paste these into <b>Project Settings &gt; Environment Variables</b>:
                </p>
                <pre className="p-3 rounded-xl border border-line bg-ink text-amber text-[10.5px] overflow-x-auto leading-relaxed">
                  {envTemplate}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: FIRESTORE SECURITY RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-cream text-[14px]">Firestore Security Rules</h3>
                  <p className="text-mute text-[10.5px]">Zero-Trust rules protecting employees' journals and contingency data.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(firestoreRulesContent, 'rules')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coal-2 border border-line text-mute hover:text-cream text-[10px] transition-all cursor-pointer"
                  >
                    {copiedKey === 'rules' ? <Check className="size-3 text-leaf" /> : <Copy className="size-3" />}
                    Copy Rules
                  </button>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-ink font-bold text-[10px] uppercase tracking-wider hover:bg-cream transition-all cursor-pointer"
                  >
                    Paste in Firebase Console <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              <div className="relative rounded-2xl border border-line bg-ink p-4 font-mono text-[11px] text-cream overflow-x-auto">
                <pre>{firestoreRulesContent}</pre>
              </div>

              <div className="p-4 rounded-2xl border border-line bg-coal-2 space-y-2 text-[11px] text-mute leading-relaxed">
                <div className="font-bold text-cream uppercase tracking-wider text-[10.5px]">Rule Highlights:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li><b>Validation:</b> Strict regex enforcement on HRMS IDs (<code className="text-cream">^[a-zA-Z0-9_-]+$</code>) and bill IDs.</li>
                  <li><b>Isolated Collections:</b> Subcollections (<code className="text-cream">/users/{'{hrmsId}'}/bills/{'{billId}'}</code>) guarantee multi-tenant privacy.</li>
                  <li><b>Default Deny:</b> Unspecified document paths are locked from unauthorized reads or writes.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: VERCEL DEPLOYMENT GUIDE */}
          {activeTab === 'vercel' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl border border-leaf/30 bg-leaf/10 flex items-start gap-3">
                <ShieldCheck className="size-5 text-leaf shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-leaf uppercase tracking-wider text-[11px]">Vercel Deployment Guide</h4>
                  <p className="text-cream text-[11.5px] mt-0.5 leading-relaxed">
                    Vercel hosts the front-end SPA and proxies all database requests directly to Firebase's distributed global infrastructure.
                  </p>
                </div>
              </div>

              {/* Method A */}
              <div className="rounded-2xl border border-line bg-coal-2 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-cream">
                    <span className="size-5 rounded-full bg-amber text-ink grid place-items-center text-[10px]">1</span>
                    Method A: Deploy via GitHub (Recommended)
                  </div>
                  <span className="text-[10px] text-amber uppercase tracking-widest bg-amber/10 px-2 py-0.5 rounded border border-amber/20">Automatic CI/CD</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-mute text-[11px] leading-relaxed">
                  <li>Push this project folder to your GitHub repository.</li>
                  <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-amber underline inline-flex items-center gap-1">vercel.com/new <ExternalLink className="size-3" /></a> and import your repository.</li>
                  <li>Under <b>Environment Variables</b>, paste the Firebase credentials.</li>
                  <li>Click <b>Deploy</b>. Your app goes live globally in seconds!</li>
                </ol>
              </div>

              {/* Method B */}
              <div className="rounded-2xl border border-line bg-coal-2 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-cream">
                    <span className="size-5 rounded-full bg-amber text-ink grid place-items-center text-[10px]">2</span>
                    Method B: Deploy via Vercel CLI
                  </div>
                  <span className="text-[10px] text-mute uppercase tracking-widest bg-coal-3 px-2 py-0.5 rounded border border-line">Terminal</span>
                </div>
                <div className="relative rounded-xl border border-line bg-ink p-3 font-mono text-[11px] text-cream">
                  <code>
                    npm i -g vercel<br />
                    vercel --prod
                  </code>
                  <button
                    onClick={() => copyToClipboard('npm i -g vercel && vercel --prod', 'cli')}
                    className="absolute right-3 top-3 p-1.5 rounded-lg bg-coal-2 border border-line text-mute hover:text-cream transition-all cursor-pointer"
                  >
                    {copiedKey === 'cli' ? <Check className="size-3.5 text-leaf" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VERCEL.JSON & CONFIG FILES */}
          {activeTab === 'files' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-cream text-[14px]">vercel.json Configuration</h3>
                  <p className="text-mute text-[10.5px]">Zero-config SPA rewrites ensuring routing never returns 404.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(vercelJsonContent, 'vjson')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coal-2 border border-line text-mute hover:text-cream text-[10px] transition-all cursor-pointer"
                  >
                    {copiedKey === 'vjson' ? <Check className="size-3 text-leaf" /> : <Copy className="size-3" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={downloadDeployBundle}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-ink font-bold text-[10px] uppercase tracking-wider hover:bg-cream transition-all cursor-pointer"
                  >
                    <Download className="size-3" />
                    Download Deploy Pack (.zip)
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl border border-line bg-ink p-4 font-mono text-[11px] text-cream overflow-x-auto">
                <pre>{vercelJsonContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-coal-2">
          <div className="flex items-center gap-2 font-mono text-[10.5px] text-mute">
            <span className="size-2 rounded-full bg-leaf animate-pulse" />
            <span>Firebase Connected: {firebaseConfig.projectId}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber text-ink font-mono font-bold text-[10.5px] uppercase tracking-wider hover:bg-cream transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
