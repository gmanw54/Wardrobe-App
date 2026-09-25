import React, { useState } from 'react';
import {
  Copy,
  Check,
  Smartphone,
  Terminal,
  FileCode,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  Download
} from 'lucide-react';
import {
  EXPO_APP_JS_CODE,
  EXPO_INSTALL_COMMANDS,
  EXPO_PACKAGE_JSON,
  EXPO_APP_JSON,
} from '../data/expoCode';

export const ExpoCodeViewer: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'app' | 'package' | 'appjson' | 'setup'>('app');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'app':
        return EXPO_APP_JS_CODE;
      case 'package':
        return EXPO_PACKAGE_JSON;
      case 'appjson':
        return EXPO_APP_JSON;
      case 'setup':
        return EXPO_INSTALL_COMMANDS;
      default:
        return EXPO_APP_JS_CODE;
    }
  };

  const lines = getActiveCode().split('\n');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Header / Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Expo React Native Project Files</span>
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveCodeTab('app')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
              activeCodeTab === 'app'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>App.js</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('setup')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
              activeCodeTab === 'setup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CLI Commands</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('package')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
              activeCodeTab === 'package'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>package.json</span>
          </button>

          <button
            onClick={() => setActiveCodeTab('appjson')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition ${
              activeCodeTab === 'appjson'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>app.json</span>
          </button>
        </div>

        {/* Copy Button */}
        <button
          onClick={() => handleCopy(getActiveCode(), activeCodeTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
        >
          {copiedKey === activeCodeTab ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy {activeCodeTab === 'app' ? 'App.js' : 'Content'}</span>
            </>
          )}
        </button>
      </div>

      {/* Guide Banner for Quick Running */}
      {activeCodeTab === 'setup' ? (
        <div className="p-6 overflow-y-auto space-y-6 font-sans">
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>3-Step Quick Launch on Your Mobile Phone</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You can run this exact codebase on your physical phone in 2 minutes using Expo Go! No Xcode or Android Studio required.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono">1</span>
                <span>Create the Expo App & Install Native Libraries</span>
              </div>
              <div className="relative">
                <pre className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
{`npx create-expo-app AuraWardrobe
cd AuraWardrobe
npx expo install expo-image-picker @react-native-async-storage/async-storage`}
                </pre>
                <button
                  onClick={() => handleCopy(EXPO_INSTALL_COMMANDS, 'cli_step1')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs"
                >
                  {copiedKey === 'cli_step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono">2</span>
                <span>Replace <code className="text-emerald-400 font-mono">App.js</code> & Set API Key</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  Copy the full contents of the <strong>App.js</strong> tab into your local <code className="text-emerald-400 font-mono">App.js</code>.
                </p>
                <p>
                  Create a <code className="text-emerald-400 font-mono">.env</code> file in your project root:
                </p>
                <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-amber-300">
                  EXPO_PUBLIC_GEMINI_API_KEY="AIzaSyYourGeminiApiKey"
                </pre>
                <p className="text-[11px] text-slate-400">
                  *(Note: You can also tap the Settings gear ⚙️ directly in the mobile UI on your phone to paste your key anytime!)*
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono">3</span>
                <span>Start Dev Server & Scan QR Code</span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
                npx expo start
              </pre>
              <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
                <li><strong>iOS:</strong> Open the standard iOS Camera app, point at terminal QR code, and tap the prompt to open in Expo Go.</li>
                <li><strong>Android:</strong> Open the Expo Go app, tap "Scan QR code", and scan the terminal screen.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Code Editor Window */
        <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed p-4 bg-slate-950/70 select-text">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="w-12 text-right pr-4 text-slate-600 select-none text-[11px] font-mono align-top">
                    {idx + 1}
                  </td>
                  <td className="text-slate-200 whitespace-pre font-mono">
                    {/* Basic syntax color hints */}
                    {line.startsWith('import ') ? (
                      <span className="text-purple-400">{line}</span>
                    ) : line.startsWith('export ') ? (
                      <span className="text-sky-400">{line}</span>
                    ) : line.startsWith('//') || line.startsWith(' *') || line.startsWith('/*') ? (
                      <span className="text-slate-500 italic">{line}</span>
                    ) : line.includes('const ') || line.includes('function ') ? (
                      <span className="text-amber-300">{line}</span>
                    ) : (
                      line
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Expo SDK 51 Compatible • Cross-Platform (iOS & Android)</span>
        </div>
        <span className="font-mono text-slate-500">{lines.length} lines</span>
      </div>
    </div>
  );
};
