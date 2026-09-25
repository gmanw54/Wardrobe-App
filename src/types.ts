export type ClothingCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories';
export type FormalityLevel = 'casual' | 'business' | 'formal';

export interface WardrobeItem {
  id: string;
  item_name: string;
  category: ClothingCategory;
  primary_color: string;
  formality: FormalityLevel;
  image_uri: string;
  created_at?: string;
}

export interface OutfitRecommendation {
  style: 'Casual' | 'Elevated' | 'Bold/Statement' | string;
  title: string;
  item_ids: string[];
  stylist_rationale: string;
  layering_tip?: string;
  lookbook_image_url?: string;
  visual_summary?: string;
  model_persona?: string;
}

export interface SavedOutfit {
  id: string;
  title: string;
  style: string;
  item_ids: string[];
  occasion?: string;
  season?: string;
  weather?: string;
  layering_tip?: string;
  visual_summary?: string;
  saved_at: string;
}

export interface AnalysisResult {
  item_name: string;
  category: ClothingCategory;
  primary_color: string;
  formality: FormalityLevel;
}
