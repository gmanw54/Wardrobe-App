import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Layers,
  Grid,
  Plus,
  Trash2,
  X,
  Check,
  RefreshCw,
  Sun,
  CloudRain,
  Briefcase,
  Coffee,
  PartyPopper,
  Compass,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Settings,
  User,
  Bookmark,
  BookmarkCheck,
  Heart,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { WardrobeItem, OutfitRecommendation, ClothingCategory, FormalityLevel, SavedOutfit, OutfitGenerationHistoryItem } from '../types';
import { INITIAL_WARDROBE_SEED, SAMPLE_PRESETS_TO_TEST } from '../data/seedWardrobe';
import { OutfitLookbookVisual } from './OutfitLookbookVisual';

interface PhoneSimulatorProps {
  onOpenCodeViewer?: () => void;
}

const CATEGORIES: { id: ClothingCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'tops', label: 'Tops', icon: '👕' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessories', label: 'Bags/Acc', icon: '👜' },
];

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ onOpenCodeViewer }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'ingest' | 'gallery' | 'generator'>('gallery');

  // Wardrobe state
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => {
    try {
      const saved = localStorage.getItem('aura_wardrobe_items');
      return saved ? JSON.parse(saved) : INITIAL_WARDROBE_SEED;
    } catch {
      return INITIAL_WARDROBE_SEED;
    }
  });

  // Screen 1: Ingestion state
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analyzedItem, setAnalyzedItem] = useState<{
    item_name: string;
    category: ClothingCategory;
    primary_color: string;
    formality: FormalityLevel;
  } | null>(null);
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Screen 2: Gallery state
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemDetail, setSelectedItemDetail] = useState<WardrobeItem | null>(null);

  // Screen 3: Outfit Generator state
  const [occasionInput, setOccasionInput] = useState('Casual Dinner');
  const [weatherInput, setWeatherInput] = useState('Mild & sunny, 70°F');
  const [seasonInput, setSeasonInput] = useState<'Spring' | 'Summer' | 'Fall' | 'Winter'>('Fall');
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [outfitResults, setOutfitResults] = useState<OutfitRecommendation[] | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generatorSubTab, setGeneratorSubTab] = useState<'create' | 'history'>('create');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Outfit Generation History (persisted)
  const [generationHistory, setGenerationHistory] = useState<OutfitGenerationHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('aura_outfit_generation_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'hist-seed-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        occasion: 'Casual Dinner',
        season: 'Fall',
        weather: 'Mild & crisp, 64°F',
        outfits: [
          {
            style: 'Casual',
            title: 'Effortless Fall Neutral',
            item_ids: ['wardrobe-item-1', 'wardrobe-item-2', 'wardrobe-item-3'],
            stylist_rationale: 'Balanced autumnal palette with rich knit textures and structured dark bottoms.',
            layering_tip: 'Half-tuck top to accentuate waistline proportions.',
            visual_summary: 'Chic autumn dinner ensemble pairing a structured knit with tailored trousers.',
          },
          {
            style: 'Elevated',
            title: 'Architectural Fall Chic',
            item_ids: ['wardrobe-item-4', 'wardrobe-item-2', 'wardrobe-item-3'],
            stylist_rationale: 'Adding structured outerwear transforms the foundation into a sharp ensemble tailored for a Fall dinner.',
            layering_tip: 'Drape outerwear over shoulders for effortless authority.',
            visual_summary: 'Structured blazer layered over sleek foundations for a dinner setting.',
          },
          {
            style: 'Bold/Statement',
            title: 'High-Contrast Fall Direction',
            item_ids: ['wardrobe-item-1', 'wardrobe-item-4', 'wardrobe-item-3'],
            stylist_rationale: 'Plays with silhouette tension and bold character with dark tones and statement color.',
            layering_tip: 'Add a distinctive watch or accent chain to anchor the focal point.',
            visual_summary: 'High-contrast pairing featuring statement top and dark trousers.',
          },
        ],
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_outfit_generation_history', JSON.stringify(generationHistory));
    } catch {}
  }, [generationHistory]);

  // User styling model / photo of me state
  const [userPhoto, setUserPhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem('aura_user_styling_photo');
    } catch {
      return null;
    }
  });
  const [modelPersona, setModelPersona] = useState<string>('Alex (Modern Classic)');

  // Saved Outfits state (persisted to localStorage in web, AsyncStorage in native)
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(() => {
    try {
      const stored = localStorage.getItem('aura_saved_outfits');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Gallery Sub-Tab: 'closet' vs 'saved_outfits'
  const [galleryTab, setGalleryTab] = useState<'closet' | 'saved_outfits'>('closet');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Settings / Info modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);

  // Sync saved outfits to storage safely
  useEffect(() => {
    try {
      localStorage.setItem('aura_saved_outfits', JSON.stringify(savedOutfits));
    } catch {
      // Storage quota exceeded; keep in memory
    }
  }, [savedOutfits]);

  // Handle saving / unsaving an outfit
  const handleToggleSaveOutfit = (outfit: OutfitRecommendation) => {
    setSavedOutfits((prev) => {
      const isAlreadySaved = prev.some((o) => o.title === outfit.title && o.style === outfit.style);
      if (isAlreadySaved) {
        setSaveToast(`Removed "${outfit.title}" from saved outfits`);
        setTimeout(() => setSaveToast(null), 2500);
        return prev.filter((o) => !(o.title === outfit.title && o.style === outfit.style));
      } else {
        const newSaved: SavedOutfit = {
          id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: outfit.title,
          style: outfit.style,
          item_ids: outfit.item_ids || [],
          occasion: occasionInput,
          season: seasonInput,
          weather: weatherInput,
          layering_tip: outfit.layering_tip,
          visual_summary: outfit.visual_summary,
          saved_at: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        };
        setSaveToast(`Saved "${outfit.title}" to Gallery!`);
        setTimeout(() => setSaveToast(null), 2500);
        return [newSaved, ...prev];
      }
    });
  };

  const handleRemoveSavedOutfit = (outfitId: string) => {
    setSavedOutfits((prev) => prev.filter((o) => o.id !== outfitId));
  };

  // Sync user photo to storage safely
  useEffect(() => {
    try {
      if (userPhoto) {
        localStorage.setItem('aura_user_styling_photo', userPhoto);
      } else {
        localStorage.removeItem('aura_user_styling_photo');
      }
    } catch {
      // Storage quota exceeded for large base64; keep in memory
    }
  }, [userPhoto]);

  // Sync wardrobe to local storage safely
  useEffect(() => {
    try {
      localStorage.setItem('aura_wardrobe_items', JSON.stringify(wardrobe));
    } catch {
      // Storage quota exceeded; keep in memory
    }
  }, [wardrobe]);

  // Handle image selection (file upload or camera)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngestionError(null);
    setSaveSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPickedImageUri(dataUrl);

      // Extract raw base64
      const base64Data = dataUrl.split(',')[1] || '';
      setPickedBase64(base64Data);

      // Trigger Gemini Analysis
      analyzeClothing(base64Data, file.type || 'image/jpeg', dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle user's personal selfie/photo upload for lookbook
  const handleUserPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUserPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick select a sample preset to test ingestion
  const handlePickSamplePreset = async (preset: typeof SAMPLE_PRESETS_TO_TEST[0]) => {
    setIngestionError(null);
    setSaveSuccessMessage(null);
    setPickedImageUri(preset.url);
    setAnalyzingImage(true);

    try {
      // Fetch the sample image and convert to base64
      const response = await fetch(preset.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setPickedBase64(base64);
        analyzeClothing(base64, blob.type || 'image/jpeg', preset.url);
      };
      reader.readAsDataURL(blob);
    } catch {
      // Direct fallback if fetch is blocked
      setTimeout(() => {
        setAnalyzedItem({
          item_name: preset.name,
          category: preset.category,
          primary_color: preset.color,
          formality: preset.formality,
        });
        setAnalyzingImage(false);
      }, 900);
    }
  };

  // Call backend API for Gemini Vision Analysis
  const analyzeClothing = async (base64Data: string, mimeType: string, imageUri: string) => {
    setAnalyzingImage(true);
    setIngestionError(null);
    setAnalyzedItem(null);

    try {
      const res = await fetch('/api/analyze-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const parsed = await res.json();
      setAnalyzedItem({
        item_name: parsed.item_name || 'Fashion Item',
        category: (parsed.category || 'tops').toLowerCase() as ClothingCategory,
        primary_color: parsed.primary_color || 'Neutral',
        formality: (parsed.formality || 'casual').toLowerCase() as FormalityLevel,
      });
    } catch (err: any) {
      console.warn('Backend Gemini API call error:', err);
      // Friendly fallback recognition if running without server key or mock
      setAnalyzedItem({
        item_name: 'Contemporary Styled Garment',
        category: 'tops',
        primary_color: 'Neutral Grey',
        formality: 'casual',
      });
      setIngestionError(
        'Gemini API note: ' + (err.message || 'Used local smart heuristics. You can edit the detected fields below.')
      );
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Confirm and save analyzed item to wardrobe
  const handleSaveItem = () => {
    if (!analyzedItem || !pickedImageUri) return;

    const newItem: WardrobeItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      item_name: analyzedItem.item_name,
      category: analyzedItem.category,
      primary_color: analyzedItem.primary_color,
      formality: analyzedItem.formality,
      image_uri: pickedImageUri,
      created_at: new Date().toISOString(),
    };

    setWardrobe([newItem, ...wardrobe]);
    setSaveSuccessMessage(`"${newItem.item_name}" saved to your wardrobe!`);

    setTimeout(() => {
      setActiveTab('gallery');
      setPickedImageUri(null);
      setAnalyzedItem(null);
      setSaveSuccessMessage(null);
    }, 1200);
  };

  // Delete item from wardrobe
  const handleDeleteItem = (id: string) => {
    setWardrobe(wardrobe.filter((i) => i.id !== id));
    if (selectedItemDetail?.id === id) {
      setSelectedItemDetail(null);
    }
  };

  // Reset wardrobe to default seeds
  const handleConfirmReset = () => {
    setWardrobe(INITIAL_WARDROBE_SEED);
    setSelectedItemDetail(null);
    setShowResetConfirm(false);
    setSaveToast('Wardrobe reset to starter collection');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Generate Outfits via Gemini backend
  const handleGenerateOutfits = async () => {
    if (wardrobe.length < 2) {
      setGeneratorError('Please add at least 2 wardrobe items before generating outfits.');
      return;
    }

    setGeneratingOutfits(true);
    setGeneratorError(null);
    setOutfitResults(null);

    try {
      const res = await fetch('/api/generate-outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardrobe,
          occasion: occasionInput,
          weather: weatherInput,
          season: seasonInput,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!data.outfits || !Array.isArray(data.outfits)) {
        throw new Error('Invalid outfit structure returned.');
      }
      setOutfitResults(data.outfits);
      recordGenerationHistory(data.outfits, occasionInput, seasonInput, weatherInput);
    } catch (err: any) {
      console.warn('Outfit generation error:', err);
      // Stylist intelligent fallback assembly from user inventory
      generateLocalFallbackOutfits();
    } finally {
      setGeneratingOutfits(false);
    }
  };

  // Helper to record successful generation in history
  const recordGenerationHistory = (
    outfits: OutfitRecommendation[],
    occasion: string,
    season: string,
    weather: string
  ) => {
    if (!outfits || outfits.length === 0) return;
    const newEntry: OutfitGenerationHistoryItem = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      occasion: occasion.trim() || 'Casual',
      season,
      weather,
      outfits,
    };
    setGenerationHistory((prev) => [newEntry, ...prev]);
  };

  const handleLoadHistoryGeneration = (historyItem: OutfitGenerationHistoryItem) => {
    setOccasionInput(historyItem.occasion);
    setSeasonInput(historyItem.season as any);
    setWeatherInput(historyItem.weather);
    setOutfitResults(historyItem.outfits);
    setGeneratorSubTab('create');
    setSaveToast(`Restored ${historyItem.occasion} looks`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGenerationHistory((prev) => prev.filter((item) => item.id !== id));
    if (expandedHistoryId === id) setExpandedHistoryId(null);
  };

  const handleConfirmClearHistory = () => {
    setGenerationHistory([]);
    setExpandedHistoryId(null);
    setShowClearHistoryConfirm(false);
    setSaveToast('Outfit history cleared');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const formatHistoryTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return { relative: 'Recently', full: 'Recent Look' };
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else if (diffDays === 1) relative = 'Yesterday';
      else relative = `${diffDays}d ago`;

      const formattedDate = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      return {
        relative,
        full: `${formattedDate} at ${formattedTime}`,
      };
    } catch {
      return { relative: 'Past Look', full: isoString };
    }
  };

  // Fallback intelligent outfit generator if API key is not yet set in environment
  const generateLocalFallbackOutfits = () => {
    const tops = wardrobe.filter((i) => i.category === 'tops');
    const bottoms = wardrobe.filter((i) => i.category === 'bottoms');
    const outers = wardrobe.filter((i) => i.category === 'outerwear');
    const shoes = wardrobe.filter((i) => i.category === 'shoes');

    const top1 = tops[0] || wardrobe[0];
    const bot1 = bottoms[0] || wardrobe[1] || wardrobe[0];
    const shoe1 = shoes[0] || wardrobe[2] || wardrobe[0];
    const outer1 = outers[0] || wardrobe[3];

    const fallback: OutfitRecommendation[] = [
      {
        style: 'Casual',
        title: `Effortless ${seasonInput} Neutral`,
        item_ids: [top1?.id, bot1?.id, shoe1?.id].filter(Boolean),
        stylist_rationale: `Pairing the ${top1?.primary_color || 'relaxed'} ${top1?.item_name || 'top'} with ${bot1?.item_name || 'bottoms'} creates a grounded silhouette ideal for ${weatherInput} during ${seasonInput}. The footwear keeps the energy approachable yet intentional.`,
        layering_tip: 'Roll up cuffs slightly to expose ankles for casual proportional balance.',
        visual_summary: `Relaxed ${top1?.item_name || 'top'} paired cleanly with ${bot1?.item_name || 'trousers'} and ${shoe1?.item_name || 'footwear'} for an effortless ${seasonInput} ensemble.`,
      },
      {
        style: 'Elevated',
        title: `Architectural ${seasonInput} Chic`,
        item_ids: [outer1?.id || top1?.id, bot1?.id, shoe1?.id].filter(Boolean),
        stylist_rationale: `Adding structured outerwear transforms the foundation into a sharp ensemble tailored for a ${seasonInput} ${occasionInput}. Clean lines and tonal contrast deliver subtle sophistication.`,
        layering_tip: 'Drape the outerwear over shoulders or push sleeves up for effortless authority.',
        visual_summary: `A structured ${outer1?.item_name || 'blazer'} layered over ${bot1?.item_name || 'trousers'} for a polished, elegant ${occasionInput} appearance.`,
      },
      {
        style: 'Bold/Statement',
        title: `High-Contrast ${seasonInput} Direction`,
        item_ids: [top1?.id, bot1?.id, shoe1?.id].filter(Boolean),
        stylist_rationale: `Plays with silhouette tension and bold character. The mix of ${bot1?.primary_color || 'dark tone'} with ${top1?.primary_color || 'statement color'} creates immediate visual intrigue that stands out at ${occasionInput} this ${seasonInput}.`,
        layering_tip: 'Add a distinctive watch or accent chain to anchor the focal point.',
        visual_summary: `High-contrast pairing featuring ${top1?.item_name || 'statement top'} and ${bot1?.item_name || 'bottoms'} that commands attention for ${occasionInput}.`,
      },
    ];

    setOutfitResults(fallback);
    recordGenerationHistory(fallback, occasionInput, seasonInput, weatherInput);
  };

  // Filtered wardrobe
  const filteredWardrobe = useMemo(() => {
    return wardrobe.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.primary_color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [wardrobe, selectedCategory, searchQuery]);

  // Wardrobe map for lookups
  const wardrobeMap = useMemo(() => {
    const map: Record<string, WardrobeItem> = {};
    wardrobe.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [wardrobe]);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={userPhotoInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleUserPhotoChange}
      />

      {/* Phone Hardware Shell */}
      <div className="relative w-full max-w-[400px] h-[780px] bg-slate-950 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-800 shadow-slate-900/60 flex flex-col overflow-hidden">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-28 h-5 bg-slate-900 rounded-full flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 ring-1 ring-emerald-500/40" />
          <div className="w-2 h-2 rounded-full bg-slate-800" />
        </div>

        {/* Screen Bezel Content */}
        <div className="relative flex-1 bg-slate-50 dark:bg-slate-900 rounded-[34px] overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 font-sans">
          
          {/* iOS / Mobile Status Bar */}
          <div className="h-10 pt-2 px-6 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>5G</span>
              <span className="w-4 h-2 border border-current rounded-sm flex items-center p-0.5">
                <span className="h-full w-full bg-current rounded-2xs" />
              </span>
            </div>
          </div>

          {/* App Header */}
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  Aura Wardrobe
                </h1>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Expo React Native Mobile App</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Settings & Info"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
              {onOpenCodeViewer && (
                <button
                  onClick={onOpenCodeViewer}
                  title="View Expo App.js Code"
                  className="px-2 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold shadow-xs hover:bg-emerald-500 transition"
                >
                  Code
                </button>
              )}
            </div>
          </div>

          {/* Screen Content Scroll Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">

            {/* Notification Toast for Saved Outfit */}
            {saveToast && (
              <div className="sticky top-0 z-40 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{saveToast}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('gallery');
                    setGalleryTab('saved_outfits');
                  }}
                  className="underline text-[10px] hover:text-emerald-100 ml-2 shrink-0 font-extrabold"
                >
                  View Saved Looks →
                </button>
              </div>
            )}
            
            {/* ============================================================= */}
            {/* SCREEN 1: ADD CLOTHES (INGESTION) */}
            {/* ============================================================= */}
            {activeTab === 'ingest' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add to Wardrobe</h2>
                  <p className="text-xs text-slate-500">
                    Snap clothing or pick from photo library. Gemini automatically detects category, palette & formality.
                  </p>
                </div>

                {/* Camera / Library Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={analyzingImage}
                    className="flex flex-col items-center justify-center p-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xs hover:bg-slate-800 transition active:scale-98"
                  >
                    <Camera className="w-6 h-6 mb-1 text-emerald-400" />
                    <span className="text-xs font-bold">Take Photo</span>
                    <span className="text-[9px] text-slate-400">Rear/Front Camera</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzingImage}
                    className="flex flex-col items-center justify-center p-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl shadow-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-98"
                  >
                    <Upload className="w-6 h-6 mb-1 text-sky-500" />
                    <span className="text-xs font-bold">Photo Library</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">Choose Image</span>
                  </button>
                </div>

                {/* Quick Presets for Instant Demo Testing */}
                <div className="bg-slate-100/70 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      ⚡ Quick-Test Samples:
                    </span>
                    <span className="text-[10px] text-slate-500">Tap to analyze</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SAMPLE_PRESETS_TO_TEST.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePickSamplePreset(preset)}
                        className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition aspect-square"
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 flex items-end p-1">
                          <span className="text-[8px] font-bold text-white leading-tight truncate">
                            {preset.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analyzing Loading Card */}
                {analyzingImage && (
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-500/30 shadow-xs flex flex-col items-center text-center space-y-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Sparkles className="w-5 h-5 animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Gemini Vision Analyzing Fabric & Cut...
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Classifying category, dominant color, and formality level...
                    </p>
                  </div>
                )}

                {/* Success Notification */}
                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}

                {/* Ingestion Error Notice */}
                {ingestionError && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{ingestionError}</div>
                  </div>
                )}

                {/* Image Preview & Analyzed Form */}
                {pickedImageUri && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                    <div className="relative h-44 bg-slate-100 dark:bg-slate-900">
                      <img
                        src={pickedImageUri}
                        alt="Picked clothing"
                        className="w-full h-full object-cover"
                      />
                      {analyzedItem && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AI CLASSIFIED</span>
                        </div>
                      )}
                    </div>

                    {analyzedItem && (
                      <div className="p-3.5 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Item Name
                          </label>
                          <input
                            type="text"
                            value={analyzedItem.item_name}
                            onChange={(e) =>
                              setAnalyzedItem({ ...analyzedItem, item_name: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 outline-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Category
                            </label>
                            <select
                              value={analyzedItem.category}
                              onChange={(e) =>
                                setAnalyzedItem({
                                  ...analyzedItem,
                                  category: e.target.value as ClothingCategory,
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden uppercase"
                            >
                              <option value="tops">Tops</option>
                              <option value="bottoms">Bottoms</option>
                              <option value="outerwear">Outerwear</option>
                              <option value="shoes">Shoes</option>
                              <option value="accessories">Accessories</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Formality
                            </label>
                            <select
                              value={analyzedItem.formality}
                              onChange={(e) =>
                                setAnalyzedItem({
                                  ...analyzedItem,
                                  formality: e.target.value as FormalityLevel,
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden capitalize"
                            >
                              <option value="casual">Casual</option>
                              <option value="business">Business</option>
                              <option value="formal">Formal</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Primary Color
                          </label>
                          <input
                            type="text"
                            value={analyzedItem.primary_color}
                            onChange={(e) =>
                              setAnalyzedItem({ ...analyzedItem, primary_color: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden"
                          />
                        </div>

                        <button
                          onClick={handleSaveItem}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save to Wardrobe</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* SCREEN 2: WARDROBE GALLERY */}
            {/* ============================================================= */}
            {activeTab === 'gallery' && (
              <div className="space-y-3">
                {/* Segmented Switch: Closet Pieces vs Saved Outfits */}
                <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setGalleryTab('closet')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      galleryTab === 'closet'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Closet ({wardrobe.length})</span>
                  </button>

                  <button
                    onClick={() => setGalleryTab('saved_outfits')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      galleryTab === 'saved_outfits'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Saved Outfits ({savedOutfits.length})</span>
                  </button>
                </div>

                {/* SUB-VIEW A: CLOSET PIECES */}
                {galleryTab === 'closet' && (
                  <>
                    {/* Search Bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search closet (e.g. linen, navy)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder:text-slate-400 outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Category Horizontal Filter Bar */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const count =
                          cat.id === 'all'
                            ? wardrobe.length
                            : wardrobe.filter((i) => i.category === cat.id).length;

                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                              isSelected
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1 rounded-full font-mono ${
                                isSelected
                                  ? 'bg-slate-700 dark:bg-slate-200 text-slate-200 dark:text-slate-800'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Items Grid */}
                    {filteredWardrobe.length === 0 ? (
                      <div className="py-12 px-4 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-3xl mb-2 block">👗</span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                          No Items in {selectedCategory.toUpperCase()}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          Add clothes with the camera or pick from the preset samples!
                        </p>
                        <button
                          onClick={() => setActiveTab('ingest')}
                          className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-500"
                        >
                          + Add New Clothing
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {filteredWardrobe.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItemDetail(item)}
                            className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-xs hover:shadow-md transition cursor-pointer flex flex-col"
                          >
                            <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden">
                              <img
                                src={item.image_uri}
                                alt={item.item_name}
                                className="w-full h-full object-cover group-hover:scale-104 transition duration-300"
                              />
                              <span
                                className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs ${
                                  item.formality === 'formal'
                                    ? 'bg-purple-500/90 text-white'
                                    : item.formality === 'business'
                                    ? 'bg-blue-600/90 text-white'
                                    : 'bg-emerald-600/90 text-white'
                                }`}
                              >
                                {item.formality}
                              </span>
                            </div>

                            <div className="p-2.5 flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                  {item.item_name}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                  <span className="uppercase font-semibold tracking-wider">
                                    {item.category}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">{item.primary_color}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reset button footer */}
                    <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400">
                      <span>{wardrobe.length} Total Closet Pieces</span>
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="hover:text-slate-600 dark:hover:text-slate-300 underline"
                      >
                        Reset Starter Items
                      </button>
                    </div>
                  </>
                )}

                {/* SUB-VIEW B: SAVED OUTFITS */}
                {galleryTab === 'saved_outfits' && (
                  <div className="space-y-3">
                    {savedOutfits.length === 0 ? (
                      <div className="py-12 px-4 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                          <BookmarkCheck className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                          No Saved Outfits Yet
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto leading-relaxed">
                          Generate AI outfit combinations in the Stylist tab and tap <strong className="text-emerald-600 font-semibold">Save Outfit</strong> to curate your personal lookbook!
                        </p>
                        <button
                          onClick={() => setActiveTab('generator')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                        >
                          ✨ Generate AI Outfits
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            My Saved Looks ({savedOutfits.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Persisted in storage
                          </span>
                        </div>

                        {savedOutfits.map((saved) => {
                          const pairedItems = (saved.item_ids || [])
                            .map((id) => wardrobeMap[id])
                            .filter(Boolean);

                          const badgeTheme =
                            saved.style === 'Elevated'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : saved.style === 'Bold/Statement'
                              ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';

                          return (
                            <div
                              key={saved.id}
                              className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${badgeTheme}`}>
                                      {saved.style}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {saved.occasion || 'Everyday'} • {saved.season || 'Current'}
                                    </span>
                                  </div>
                                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    {saved.title}
                                  </h3>
                                </div>

                                <button
                                  onClick={() => handleRemoveSavedOutfit(saved.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                  title="Remove from saved outfits"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Paired Pieces */}
                              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                                {pairedItems.map((item, iIdx) => (
                                  <div
                                    key={item.id || iIdx}
                                    className="w-16 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-center"
                                  >
                                    <img
                                      src={item.image_uri}
                                      alt={item.item_name}
                                      className="w-full aspect-square object-cover rounded-md mb-1"
                                    />
                                    <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                                      {item.item_name}
                                    </span>
                                    <span className="text-[8px] text-slate-400 uppercase">
                                      {item.category}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Styling Tip */}
                              {saved.layering_tip && (
                                <div className="text-xs leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                                  <span className="text-xs">💡</span>
                                  <span>
                                    <strong className="font-bold text-amber-900 dark:text-amber-200">Tip:</strong> {saved.layering_tip}
                                  </span>
                                </div>
                              )}

                              {/* Interactive Lookbook Component */}
                              <OutfitLookbookVisual
                                outfit={{
                                  title: saved.title,
                                  style: saved.style,
                                  item_ids: saved.item_ids,
                                  stylist_rationale: '',
                                  layering_tip: saved.layering_tip,
                                  visual_summary: saved.visual_summary,
                                }}
                                pairedItems={pairedItems}
                                userPhoto={userPhoto}
                                modelPersona={modelPersona}
                                season={saved.season || seasonInput}
                                occasion={saved.occasion || occasionInput}
                                weather={saved.weather || weatherInput}
                                onOpenPhotoUpload={() => userPhotoInputRef.current?.click()}
                              />

                              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                                <span>Saved on {saved.saved_at}</span>
                                <span className="text-emerald-500 font-medium">✓ In Lookbook</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* SCREEN 3: OUTFIT GENERATOR */}
            {/* ============================================================= */}
            {activeTab === 'generator' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Outfit Stylist</h2>
                  <p className="text-xs text-slate-500">
                    Input your destination event & weather. Gemini curates 3 tailored looks and visualizes the complete ensemble together on you.
                  </p>
                </div>

                {/* Generator Mode Sub-Tabs: Generate vs History */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <button
                    onClick={() => setGeneratorSubTab('create')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      generatorSubTab === 'create'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Generate Looks</span>
                  </button>
                  <button
                    onClick={() => setGeneratorSubTab('history')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      generatorSubTab === 'history'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    <span>History</span>
                    {generationHistory.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                        {generationHistory.length}
                      </span>
                    )}
                  </button>
                </div>

                {generatorSubTab === 'create' && (
                  <>
                {/* Styling Avatar / My Photo Profile Card */}
                <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-800 ring-2 ring-emerald-500/50 shrink-0">
                      {userPhoto ? (
                        <img src={userPhoto} alt="Your profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-emerald-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <button
                        onClick={() => userPhotoInputRef.current?.click()}
                        className="absolute inset-0 bg-slate-950/60 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white"
                        title="Change Photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {userPhoto ? 'Styling Model: You' : `Model: ${modelPersona}`}
                        </span>
                        {userPhoto && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {userPhoto ? 'Your photo is used in lookbook visuals' : 'Tap to upload a photo of yourself'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => userPhotoInputRef.current?.click()}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{userPhoto ? 'Change Photo' : 'Upload Me'}</span>
                    </button>
                    {userPhoto && (
                      <button
                        onClick={() => setUserPhoto(null)}
                        className="p-1 hover:text-rose-400 text-slate-500 text-[10px]"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Generator Input Form Card */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Occasion
                      </label>
                      <span className="text-[10px] text-slate-400">Where are you headed?</span>
                    </div>
                    <input
                      type="text"
                      value={occasionInput}
                      onChange={(e) => setOccasionInput(e.target.value)}
                      placeholder="e.g. Casual Dinner, Client Pitch, Weekend Brunch"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Quick Occasion Pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Casual Dinner', 'Business Casual', 'Weekend Brunch', 'Date Night'].map((occ) => (
                        <button
                          key={occ}
                          onClick={() => setOccasionInput(occ)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                            occasionInput === occ
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {occ}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time of Year / Season Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Time of Year (Season)
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {seasonInput}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'Spring', label: 'Spring', icon: '🌸', desc: 'Fresh & Light' },
                        { id: 'Summer', label: 'Summer', icon: '☀️', desc: 'Warm & Airy' },
                        { id: 'Fall', label: 'Fall', icon: '🍂', desc: 'Layered & Rich' },
                        { id: 'Winter', label: 'Winter', icon: '❄️', desc: 'Warm & Heavy' },
                      ].map((season) => {
                        const isSelected = seasonInput === season.id;
                        return (
                          <button
                            key={season.id}
                            type="button"
                            onClick={() => setSeasonInput(season.id as any)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center border transition ${
                              isSelected
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs font-bold scale-[1.02]'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-sm mb-0.5">{season.icon}</span>
                            <span className="text-[11px] leading-tight font-bold">{season.label}</span>
                            <span className="text-[8px] opacity-70 leading-tight mt-0.5">{season.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Weather / Temperature
                      </label>
                      <span className="text-[10px] text-slate-400">Outdoor Conditions</span>
                    </div>
                    <input
                      type="text"
                      value={weatherInput}
                      onChange={(e) => setWeatherInput(e.target.value)}
                      placeholder="e.g. Mild 70°F, Cold 42°F & Rainy, Summer 85°F"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Quick Weather Pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Mild 70°F Sunny', 'Cold 45°F Rain', 'Hot 86°F Summer', 'Breezy 62°F'].map((w) => (
                        <button
                          key={w}
                          onClick={() => setWeatherInput(w)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                            weatherInput === w
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateOutfits}
                    disabled={generatingOutfits}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    {generatingOutfits ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Stylist Assembling Looks...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate 3 Outfits</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Loading Banner */}
                {generatingOutfits && (
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-500/40 text-center space-y-2 animate-pulse">
                    <div className="inline-flex p-2 bg-emerald-500/10 text-emerald-500 rounded-full">
                      <Sparkles className="w-5 h-5 animate-spin" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Evaluating Seasonal Harmony & Proportions...
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Selecting garments from your closet for {occasionInput} in {seasonInput} ({weatherInput}).
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {generatorError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
                    {generatorError}
                  </div>
                )}

                {/* Outfits List */}
                {outfitResults && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Curated Looks ({outfitResults.length})
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{seasonInput} Season</span>
                    </div>

                    {outfitResults.map((outfit, idx) => {
                      const pairedItems = (outfit.item_ids || [])
                        .map((id) => wardrobeMap[id])
                        .filter(Boolean);

                      const badgeTheme =
                        outfit.style === 'Elevated'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : outfit.style === 'Bold/Statement'
                          ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';

                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${badgeTheme}`}>
                                {outfit.style}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{seasonInput} • Look {idx + 1} of 3</span>
                            </div>

                            {/* Save Outfit Button */}
                            {(() => {
                              const isSaved = savedOutfits.some((o) => o.title === outfit.title && o.style === outfit.style);
                              return (
                                <button
                                  onClick={() => handleToggleSaveOutfit(outfit)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 ${
                                    isSaved
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                                  }`}
                                  title={isSaved ? 'Remove from Saved Outfits' : 'Save to Gallery Saved Outfits'}
                                >
                                  {isSaved ? (
                                    <>
                                      <BookmarkCheck className="w-3.5 h-3.5 text-white" />
                                      <span>Saved</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                                      <span>Save Outfit</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>

                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {outfit.title}
                          </h3>

                          {/* Paired Wardrobe Item Thumbnails */}
                          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                            {pairedItems.map((item, itemIdx) => (
                              <div
                                key={item.id || itemIdx}
                                className="w-16 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 text-center"
                              >
                                <img
                                  src={item.image_uri}
                                  alt={item.item_name}
                                  className="w-full aspect-square object-cover rounded-md mb-1"
                                />
                                <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                                  {item.item_name}
                                </span>
                                <span className="text-[8px] text-slate-400 uppercase">
                                  {item.category}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Styling Tip */}
                          {outfit.layering_tip && (
                            <div className="text-xs leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                              <span className="text-xs">💡</span>
                              <span>
                                <strong className="font-bold text-amber-900 dark:text-amber-200">Tip:</strong> {outfit.layering_tip}
                              </span>
                            </div>
                          )}

                          {/* Lookbook Visual of Complete Outfit Assembled On the Person */}
                          <OutfitLookbookVisual
                            outfit={outfit}
                            pairedItems={pairedItems}
                            userPhoto={userPhoto}
                            modelPersona={modelPersona}
                            season={seasonInput}
                            occasion={occasionInput}
                            weather={weatherInput}
                            onOpenPhotoUpload={() => userPhotoInputRef.current?.click()}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                </>
                )}

                {/* ============================================================= */}
                {/* GENERATOR SUB-TAB: HISTORY VIEW */}
                {/* ============================================================= */}
                {generatorSubTab === 'history' && (
                  <div className="space-y-4">
                    {/* History Header & Controls */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <History className="w-4 h-4 text-indigo-500" />
                          <span>Past Generations</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {generationHistory.length === 0
                            ? 'No styling records saved yet'
                            : `${generationHistory.length} recorded session${generationHistory.length === 1 ? '' : 's'}`}
                        </p>
                      </div>

                      {generationHistory.length > 0 && (
                        <button
                          onClick={() => setShowClearHistoryConfirm(true)}
                          className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold px-2 py-1 rounded-md border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Empty State */}
                    {generationHistory.length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 border border-indigo-200 dark:border-indigo-800">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            No Styling History Yet
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            Generate outfits for any occasion, and each session will be preserved here with timestamps and recommendations for quick reference.
                          </p>
                        </div>
                        <button
                          onClick={() => setGeneratorSubTab('create')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-xs transition inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Your First Outfits</span>
                        </button>
                      </div>
                    ) : (
                      /* History List */
                      <div className="space-y-3">
                        {generationHistory.map((item) => {
                          const timeInfo = formatHistoryTimestamp(item.timestamp);
                          const isExpanded = expandedHistoryId === item.id;

                          return (
                            <div
                              key={item.id}
                              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden transition"
                            >
                              {/* Entry Header */}
                              <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-md border border-indigo-200/80 dark:border-indigo-800/80">
                                        {item.occasion}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {timeInfo.relative}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-0.5">
                                      <span>{timeInfo.full}</span>
                                      <span>•</span>
                                      <span>{item.season}</span>
                                      {item.weather && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate max-w-[120px]">{item.weather}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDeleteHistoryItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                                      title="Remove from history"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleLoadHistoryGeneration(item)}
                                    className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-2xs transition flex items-center justify-center gap-1.5"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restore & View Looks</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      setExpandedHistoryId(isExpanded ? null : item.id)
                                    }
                                    className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition flex items-center gap-1"
                                    title={isExpanded ? 'Collapse' : 'Inspect Looks'}
                                  >
                                    <span>{item.outfits.length} looks</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Outfits Preview */}
                              {isExpanded && (
                                <div className="p-3.5 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
                                  {item.outfits.map((outfit, oIdx) => {
                                    const pairedItems = outfit.item_ids
                                      .map((id) => wardrobe.find((w) => w.id === id))
                                      .filter(Boolean) as WardrobeItem[];

                                    return (
                                      <div
                                        key={oIdx}
                                        className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                              {outfit.style}
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                              {outfit.title}
                                            </span>
                                          </div>
                                        </div>

                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                                          "{outfit.stylist_rationale}"
                                        </p>

                                        {/* Paired Wardrobe Item Thumbnails */}
                                        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                                          {pairedItems.map((pi, piIdx) => (
                                            <div
                                              key={pi.id || piIdx}
                                              className="w-12 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-md p-1 border border-slate-200 dark:border-slate-700 text-center"
                                            >
                                              <img
                                                src={pi.image_uri}
                                                alt={pi.item_name}
                                                className="w-full aspect-square object-cover rounded mb-0.5"
                                              />
                                              <span className="text-[8px] font-medium text-slate-700 dark:text-slate-300 block truncate">
                                                {pi.item_name}
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        {outfit.layering_tip && (
                                          <p className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                                            💡 {outfit.layering_tip}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* BOTTOM MOBILE TAB BAR */}
          {/* ============================================================= */}
          <div className="h-14 px-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-30">
            <button
              onClick={() => setActiveTab('ingest')}
              className={`flex flex-col items-center py-1 transition ${
                activeTab === 'ingest'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Add Clothes</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex flex-col items-center py-1 transition ${
                activeTab === 'gallery'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">Wardrobe ({wardrobe.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`flex flex-col items-center py-1 transition ${
                activeTab === 'generator'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sparkles className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">AI Stylist</span>
            </button>
          </div>

          {/* Home indicator bar */}
          <div className="h-4 bg-white dark:bg-slate-900 flex justify-center items-center pb-1">
            <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* ============================================================= */}
          {/* ITEM DETAIL MODAL */}
          {/* ============================================================= */}
          {selectedItemDetail && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex flex-col justify-end p-2 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-h-[85%] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative h-56 bg-slate-100 dark:bg-slate-950">
                  <img
                    src={selectedItemDetail.image_uri}
                    alt={selectedItemDetail.item_name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedItemDetail(null)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {selectedItemDetail.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {selectedItemDetail.formality}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedItemDetail.item_name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Primary Color</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedItemDetail.primary_color}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Classification</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Gemini Vision
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(selectedItemDetail.id)}
                    className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from Wardrobe</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* SETTINGS / ARCHITECTURE MODAL */}
          {/* ============================================================= */}
          {isSettingsOpen && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex flex-col justify-end p-2 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 max-h-[85%] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Expo Mobile & AI Config
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    This app is configured as an <strong>Expo React Native</strong> mobile application.
                    The pristine native code is stored in <code className="text-emerald-500 font-mono">/expo-app/App.js</code> and ready to run with <code className="text-emerald-500 font-mono">npx expo start</code>.
                  </p>
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 text-[11px]">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Camera / Vision:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">expo-image-picker</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Persistence:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">@react-native-async-storage</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Styling AI:</span>
                      <span className="font-bold text-emerald-500">Google Gemini</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenCodeViewer?.();
                  }}
                  className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs shadow-xs"
                >
                  Inspect React Native Source Code →
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* RESET STARTER WARDROBE CONFIRMATION MODAL */}
          {/* ============================================================= */}
          {showResetConfirm && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 max-w-xs w-full text-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Reset Starter Collection?
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This will restore the 8 default starter garments. Any custom pieces you added will be replaced.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReset}
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* CLEAR ALL HISTORY CONFIRMATION MODAL */}
          {/* ============================================================= */}
          {showClearHistoryConfirm && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 max-w-xs w-full text-center">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Clear Styling History?
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    All past generated outfit sessions will be permanently deleted from history.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowClearHistoryConfirm(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClearHistory}
                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
