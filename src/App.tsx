import React, { useState } from 'react';
import {
  Smartphone,
  Code2,
  Columns,
  Sparkles,
  Copy,
  Check,
  Download,
  Github,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { ExpoCodeViewer } from './components/ExpoCodeViewer';
import { EXPO_APP_JS_CODE } from './data/expoCode';

export default function App() {
  // View mode: 'split' | 'simulator' | 'code'
  const [viewMode, setViewMode] = useState<'split' | 'simulator' | 'code'>('split');
  const [copiedAppJs, setCopiedAppJs] = useState(false);

  const handleQuickCopyAppJs = () => {
    navigator.clipboard.writeText(EXPO_APP_JS_CODE);
    setCopiedAppJs(true);
    setTimeout(() => setCopiedAppJs(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">
                Closet Calculator
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Expo SDK 51 + Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Cross-Platform Mobile Wardrobe & Personal Stylist
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('simulator')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile Simulator Only"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Simulator</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View: Simulator + Code"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>

            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'code'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View Expo App.js Source Code"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Expo Code</span>
            </button>
          </div>

          {/* Quick Copy App.js button */}
          <button
            onClick={handleQuickCopyAppJs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-98"
          >
            {copiedAppJs ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied App.js!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy App.js</span>
                <span className="sm:hidden">Copy</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Split View */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            {/* Left Column: Phone Simulator (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="mb-2 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Interactive Mobile Simulator
                </span>
                <p className="text-[11px] text-slate-500">
                  Test the wardrobe camera, Gemini vision & outfit generator
                </p>
              </div>
              <PhoneSimulator onOpenCodeViewer={() => setViewMode('code')} />
            </div>

            {/* Right Column: Expo Code & Project Guide (7 cols) */}
            <div className="lg:col-span-7 h-[780px] flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Production React Native Code (Expo Go Ready)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Pure native code with <code className="text-emerald-400">expo-image-picker</code> & <code className="text-emerald-400">@react-native-async-storage</code>
                  </p>
                </div>
                <button
                  onClick={() => setViewMode('code')}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Expand Full Screen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ExpoCodeViewer />
              </div>
            </div>
          </div>
        )}

        {/* Simulator Only View */}
        {viewMode === 'simulator' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)]">
            <div className="mb-4 text-center max-w-md">
              <h2 className="text-xl font-bold text-white mb-1">
                Mobile Wardrobe & AI Stylist Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Full-featured simulator mirroring the Expo React Native app. Snap clothes, categorize with Gemini, browse wardrobe, and generate outfits!
              </p>
            </div>
            <PhoneSimulator onOpenCodeViewer={() => setViewMode('code')} />
          </div>
        )}

        {/* Code Only View */}
        {viewMode === 'code' && (
          <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-0.5">
                  Expo React Native Source Code & Architecture
                </h2>
                <p className="text-xs text-slate-400">
                  Copy <code className="text-emerald-400 font-mono">App.js</code> into your local Expo project to run immediately on iOS/Android via Expo Go.
                </p>
              </div>
              <button
                onClick={() => setViewMode('simulator')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Switch to Simulator</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ExpoCodeViewer />
            </div>
          </div>
        )}
      </main>

      {/* Feature Highlights Footer Bar */}
      <footer className="py-3 px-6 bg-slate-900 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Screen 1: Camera Ingestion & Gemini Vision</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Screen 2: AsyncStorage Wardrobe Gallery</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Screen 3: 3-Outfit AI Stylist Generator</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Expo SDK 51</span>
          <span>•</span>
          <span>React Native 0.74</span>
          <span>•</span>
          <span>Google Gemini API</span>
        </div>
      </footer>
    </div>
  );
}
