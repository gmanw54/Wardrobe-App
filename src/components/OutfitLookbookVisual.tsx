import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  User,
  Layers,
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shirt
} from 'lucide-react';
import { OutfitRecommendation, WardrobeItem } from '../types';

interface OutfitLookbookVisualProps {
  outfit: OutfitRecommendation;
  pairedItems: WardrobeItem[];
  userPhoto: string | null;
  modelPersona: string;
  season: string;
  occasion?: string;
  weather?: string;
  onOpenPhotoUpload: () => void;
}

export const OutfitLookbookVisual: React.FC<OutfitLookbookVisualProps> = ({
  outfit,
  pairedItems,
  userPhoto,
  modelPersona,
  season,
  occasion = 'Casual',
  weather = 'Mild',
  onOpenPhotoUpload,
}) => {
  const [viewMode, setViewMode] = useState<'ai_visual' | 'flatlay' | 'pieces'>('ai_visual');
  const [isComparingWithOriginal, setIsComparingWithOriginal] = useState<boolean>(false);

  // Gemini AI Generated Image state
  const cacheKey = `aura_gemini_look_${outfit.title}_${season}`;
  const [geminiImage, setGeminiImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(cacheKey) || outfit.lookbook_image_url || null;
    } catch {
      return outfit.lookbook_image_url || null;
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Background ambient theme based on style
  const styleTheme = {
    Casual: {
      gradient: 'from-amber-900/30 via-slate-900 to-slate-950',
      border: 'border-amber-500/30',
      accent: 'text-amber-400',
      bgTag: 'bg-amber-500/20 text-amber-300',
      label: 'Relaxed Street Editorial',
    },
    Elevated: {
      gradient: 'from-sky-900/30 via-slate-900 to-slate-950',
      border: 'border-sky-500/30',
      accent: 'text-sky-400',
      bgTag: 'bg-sky-500/20 text-sky-300',
      label: 'Architectural Gallery Lookbook',
    },
    'Bold/Statement': {
      gradient: 'from-fuchsia-900/30 via-slate-900 to-slate-950',
      border: 'border-fuchsia-500/30',
      accent: 'text-fuchsia-400',
      bgTag: 'bg-fuchsia-500/20 text-fuchsia-300',
      label: 'High-Fashion Studio Lookbook',
    },
  }[outfit.style] || {
    gradient: 'from-slate-800 via-slate-900 to-slate-950',
    border: 'border-slate-700',
    accent: 'text-emerald-400',
    bgTag: 'bg-emerald-500/20 text-emerald-300',
    label: 'Contemporary Lookbook',
  };

  /**
   * Generates photorealistic AI image fitting the exact garments onto the user's photo
   */
  const handleGenerateGeminiVisualization = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      let userPhotoBase64: string | undefined;
      let userPhotoMimeType: string | undefined;

      if (userPhoto && userPhoto.startsWith('data:')) {
        const matches = userPhoto.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          userPhotoMimeType = matches[1];
          userPhotoBase64 = matches[2];
        }
      }

      const res = await fetch('/api/generate-outfit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outfitTitle: outfit.title,
          outfitStyle: outfit.style,
          occasion,
          season,
          weather,
          items: pairedItems.map((i) => ({
            item_name: i.item_name,
            category: i.category,
            primary_color: i.primary_color,
            image_uri: i.image_uri,
          })),
          visualSummary: outfit.visual_summary,
          userPhoto: userPhoto || undefined,
          userPhotoBase64,
          userPhotoMimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        if (data.error === 'QUOTA_EXCEEDED') {
          throw new Error('Gemini Image model requires API key with image generation enabled.');
        }
        throw new Error(data.message || data.error || 'Failed to generate visual from Gemini.');
      }

      setGeminiImage(data.imageUrl);
      setViewMode('ai_visual');
      try {
        // Prune older cached lookbook images if localStorage is getting full
        const oldLookKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('aura_gemini_look_') && k !== cacheKey) {
            oldLookKeys.push(k);
          }
        }
        if (oldLookKeys.length >= 4) {
          oldLookKeys.slice(0, oldLookKeys.length - 2).forEach((k) => localStorage.removeItem(k));
        }
        localStorage.setItem(cacheKey, data.imageUrl);
      } catch {
        // Storage quota exceeded; image remains in memory
      }
    } catch (err: any) {
      console.warn('AI Visual generation status:', err.message);
      setGenerationError(err.message || 'Image generation is currently unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`mt-3 rounded-2xl overflow-hidden border ${styleTheme.border} bg-slate-900 shadow-lg`}>
      {/* Top Header Bar */}
      <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className={`w-3.5 h-3.5 shrink-0 ${styleTheme.accent}`} />
          <span className="text-[11px] font-bold text-slate-200 truncate">
            {userPhoto ? 'Photorealistic Fit on You' : `Modeled on ${modelPersona}`}
          </span>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setViewMode('ai_visual')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'ai_visual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>AI Visual</span>
          </button>

          <button
            onClick={() => setViewMode('flatlay')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'flatlay'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Flat-Lay</span>
          </button>

          <button
            onClick={() => setViewMode('pieces')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'pieces'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shirt className="w-3 h-3" />
            <span>Pieces ({pairedItems.length})</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: PHOTOREALISTIC AI VISUAL (ON YOU) */}
      {/* ================================================================= */}
      {viewMode === 'ai_visual' && (
        <div className="relative p-3 bg-slate-950 flex flex-col items-center">
          {/* Subheader info badges & actions */}
          <div className="w-full flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase truncate ${styleTheme.bgTag}`}>
                {season} • {occasion} • {outfit.style}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] shrink-0">
              {geminiImage && userPhoto && (
                <button
                  onMouseDown={() => setIsComparingWithOriginal(true)}
                  onMouseUp={() => setIsComparingWithOriginal(false)}
                  onTouchStart={() => setIsComparingWithOriginal(true)}
                  onTouchEnd={() => setIsComparingWithOriginal(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[9px] font-bold transition flex items-center gap-1 active:bg-emerald-700 active:text-white select-none cursor-pointer"
                  title="Press and hold to see your uploaded photo before the outfit transformation"
                >
                  {isComparingWithOriginal ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
                  <span>{isComparingWithOriginal ? 'Original Photo' : 'Hold to Compare'}</span>
                </button>
              )}

              <button
                onClick={onOpenPhotoUpload}
                className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-md text-[9px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Change or upload photo"
              >
                <Camera className="w-3 h-3" />
                <span>{userPhoto ? 'Change Photo' : 'Upload Me'}</span>
              </button>
            </div>
          </div>

          {/* Central Visual Stage */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center min-h-[340px]">
            {isGenerating ? (
              /* Loading State */
              <div className="p-6 text-center space-y-3 flex flex-col items-center max-w-xs">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">
                    Synthesizing AI Look on You...
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Keeping your exact facial features, skin tone, and body proportions while realistically tailoring the garments in a soft-lit lifestyle setting.
                  </p>
                </div>
              </div>
            ) : geminiImage ? (
              /* Generated Photorealistic Image */
              <div className="relative w-full h-full group">
                <img
                  src={isComparingWithOriginal && userPhoto ? userPhoto : geminiImage}
                  alt={`${outfit.title} worn by you`}
                  className="w-full max-h-[440px] object-cover object-center"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-3 flex items-end justify-between pointer-events-none">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-white block">
                      {isComparingWithOriginal ? 'Original Reference Photo' : outfit.title}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono block">
                      {isComparingWithOriginal ? 'Your base likeness' : 'Photorealistic fit on you'}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600/90 text-white">
                    {outfit.style}
                  </span>
                </div>
              </div>
            ) : (
              /* Pre-generation Reference & Trigger Screen */
              <div className="w-full p-4 flex flex-col items-center justify-between text-center space-y-3">
                {/* Person Reference Indicator */}
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md mb-2 bg-slate-800">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt="Your uploaded portrait"
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {userPhoto && (
                      <div className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-extrabold py-0.5 text-center">
                        YOU
                      </div>
                    )}
                  </div>

                  <h4 className="font-extrabold text-xs text-white">
                    {userPhoto ? 'Your Photo is Ready as Base Model' : 'Model: ' + modelPersona}
                  </h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5 leading-relaxed">
                    {userPhoto
                      ? 'AI will keep your exact facial features, skin tone, and body proportions, replacing your outfit with these pieces in a soft-lit lifestyle setting.'
                      : 'Upload a full-body photo or selfie to see this exact outfit realistically generated on you!'}
                  </p>
                </div>

                {/* Garments Preview Grid matching user instructions */}
                <div className="w-full bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block text-left">
                      Pieces to Fit On Body:
                    </span>
                    <span className="text-[9px] text-emerald-400 font-medium">
                      Tailored to Image 1
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {pairedItems.map((item, idx) => {
                      const cat = (item.category || '').toLowerCase();
                      let label = `'${item.category}' picture`;
                      let badgeColor = 'text-slate-400';
                      if (cat.includes('outerwear') || cat.includes('jacket') || cat.includes('coat')) {
                        label = "'outerwear' picture";
                        badgeColor = 'text-amber-400';
                      } else if (cat.includes('top') || cat.includes('shirt')) {
                        label = "'tops' picture";
                        badgeColor = 'text-sky-400';
                      } else if (cat.includes('bottom') || cat.includes('pant')) {
                        label = "'Bottoms' picture";
                        badgeColor = 'text-indigo-400';
                      } else if (cat.includes('shoe') || cat.includes('footwear')) {
                        label = "'Shoes' picture";
                        badgeColor = 'text-emerald-400';
                      }

                      return (
                        <div
                          key={item.id || idx}
                          className="bg-slate-900 rounded-lg p-1.5 border border-slate-800 text-center flex flex-col items-center"
                        >
                          <span className={`text-[7.5px] font-extrabold uppercase tracking-tight block mb-1 truncate w-full ${badgeColor}`}>
                            {label}
                          </span>
                          <img
                            src={item.image_uri}
                            alt={item.item_name}
                            className="w-full aspect-square object-cover rounded-md mb-1"
                          />
                          <span className="text-[8px] font-semibold text-slate-200 block truncate w-full">
                            {item.item_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="w-full pt-1">
                  {userPhoto ? (
                    <button
                      onClick={handleGenerateGeminiVisualization}
                      disabled={isGenerating}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Generate Photorealistic Look on You</span>
                    </button>
                  ) : (
                    <button
                      onClick={onOpenPhotoUpload}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Upload My Photo to Generate Look</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {generationError && (
            <div className="w-full mt-2 p-2 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Regenerate Button if image already exists */}
          {geminiImage && (
            <div className="w-full mt-2 flex gap-2">
              <button
                onClick={handleGenerateGeminiVisualization}
                disabled={isGenerating}
                className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate AI Look</span>
              </button>
            </div>
          )}

          {/* Head-to-Toe Styling Narrative */}
          <div className="mt-2.5 w-full p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
            <span className={`font-bold ${styleTheme.accent} block text-[10px] uppercase tracking-wider mb-0.5`}>
              ✨ Stylist Ensemble Breakdown:
            </span>
            {outfit.visual_summary ||
              `A head-to-toe ${outfit.style.toLowerCase()} ensemble combining ${pairedItems
                .map((i) => i.item_name)
                .join(', ')}, curated with balanced proportions for ${season} ${occasion}.`}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: FLAT-LAY COMPOSITE & PALETTE */}
      {/* ================================================================= */}
      {viewMode === 'flatlay' && (
        <div className={`p-3 bg-gradient-to-b ${styleTheme.gradient} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${styleTheme.bgTag}`}>
              {styleTheme.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Curated Ensemble</span>
          </div>

          <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {pairedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 p-1.5 flex flex-col"
                >
                  <img
                    src={item.image_uri}
                    alt={item.item_name}
                    className="w-full aspect-square object-cover rounded-md mb-1"
                  />
                  <span className="text-[10px] font-bold text-slate-200 truncate">
                    {item.item_name}
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase">
                    {item.category} • {item.primary_color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: PIECES LIST */}
      {/* ================================================================= */}
      {viewMode === 'pieces' && (
        <div className="p-3 bg-slate-950 space-y-2">
          <div className="text-[11px] font-bold text-slate-300">
            Selected Wardrobe Pieces for this Look:
          </div>
          <div className="space-y-1.5">
            {pairedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={item.image_uri}
                    alt={item.item_name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      {item.item_name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {item.category} • {item.primary_color} • {item.formality}
                    </span>
                  </div>
                </div>

                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
