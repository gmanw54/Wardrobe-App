export const EXPO_INSTALL_COMMANDS = `npx create-expo-app AuraWardrobe
cd AuraWardrobe
npx expo install expo-image-picker @react-native-async-storage/async-storage`;

export const EXPO_PACKAGE_JSON = `{
  "name": "aura-wardrobe-expo",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "1.23.1",
    "expo": "~51.0.0",
    "expo-image-picker": "~15.0.4",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  },
  "private": true
}`;

export const EXPO_APP_JSON = `{
  "expo": {
    "name": "Aura Wardrobe",
    "slug": "aura-wardrobe",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.aurawardrobe.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Aura Wardrobe uses the camera to photograph your clothes for AI categorization.",
        "NSPhotoLibraryUsageDescription": "Aura Wardrobe needs access to your photos to upload garment pictures."
      }
    },
    "android": {
      "package": "com.aurawardrobe.app",
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to catalog your wardrobe items.",
          "cameraPermission": "The app accesses your camera so you can snap photos of your clothing pieces."
        }
      ]
    ]
  }
}`;

export const EXPO_APP_JS_CODE = `/**
 * ============================================================================
 * AURA WARDROBE & AI STYLIST - COMPLETE EXPO REACT NATIVE APPLICATION (App.js)
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Expo project:
 *    npx create-expo-app AuraWardrobe
 *    cd AuraWardrobe
 * 
 * 2. Install required Expo SDK and native packages:
 *    npx expo install expo-image-picker @react-native-async-storage/async-storage
 * 
 * 3. Configure your Gemini API Key in .env:
 *    EXPO_PUBLIC_GEMINI_API_KEY="AIzaSyYourActualGeminiKey"
 *    (Or configure via the Settings gear ⚙️ inside the running mobile app)
 * 
 * 4. Run the app on your phone with Expo Go:
 *    npx expo start
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
  Platform,
  RefreshControl,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 48) / 2;

const STORAGE_KEYS = {
  WARDROBE: '@aura_wardrobe_items_v1',
  API_KEY: '@aura_gemini_api_key_v1',
  SAVED_OUTFITS: '@aura_saved_outfits_v1',
};

const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'tops', label: 'Tops', icon: '👕' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessories', label: 'Accessories', icon: '👜' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('gallery'); // 'ingest' | 'gallery' | 'generator'
  const [gallerySubTab, setGallerySubTab] = useState('closet'); // 'closet' | 'saved_outfits'
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [wardrobe, setWardrobe] = useState([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Screen 1: Ingestion State
  const [pickedImage, setPickedImage] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analyzedItem, setAnalyzedItem] = useState(null);
  const [ingestionError, setIngestionError] = useState(null);

  // Screen 2: Gallery Filter
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Screen 3: Outfit Generator State
  const [weatherInput, setWeatherInput] = useState('Mild & sunny, 72°F');
  const [occasionInput, setOccasionInput] = useState('Casual Dinner');
  const [seasonInput, setSeasonInput] = useState('Fall');
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [outfitResults, setOutfitResults] = useState(null);
  const [generatorError, setGeneratorError] = useState(null);

  // Settings
  const [geminiApiKey, setGeminiApiKey] = useState(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingWardrobe(true);
      const [savedWardrobe, savedKey, storedOutfits] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WARDROBE),
        AsyncStorage.getItem(STORAGE_KEYS.API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_OUTFITS),
      ]);

      if (savedWardrobe) {
        setWardrobe(JSON.parse(savedWardrobe));
      } else {
        const initialSeed = getInitialWardrobeSeed();
        setWardrobe(initialSeed);
        await AsyncStorage.setItem(STORAGE_KEYS.WARDROBE, JSON.stringify(initialSeed));
      }

      if (savedKey) setGeminiApiKey(savedKey);
      if (storedOutfits) setSavedOutfits(JSON.parse(storedOutfits));
    } catch (error) {
      console.error('Failed to load wardrobe data:', error);
    } finally {
      setLoadingWardrobe(false);
    }
  };

  const handleToggleSaveOutfit = async (outfit) => {
    try {
      const isSaved = savedOutfits.some(o => o.title === outfit.title && o.style === outfit.style);
      let updated;
      if (isSaved) {
        updated = savedOutfits.filter(o => !(o.title === outfit.title && o.style === outfit.style));
        Alert.alert('Removed', \`"\${outfit.title}" removed from Saved Outfits.\`);
      } else {
        const item = {
          id: 'saved_' + Date.now(),
          title: outfit.title,
          style: outfit.style,
          item_ids: outfit.item_ids || [],
          occasion: occasionInput,
          season: seasonInput,
          weather: weatherInput,
          layering_tip: outfit.layering_tip,
          saved_at: new Date().toLocaleDateString(),
        };
        updated = [item, ...savedOutfits];
        Alert.alert('Saved! ⭐', \`"\${outfit.title}" saved to your lookbook collection.\`);
      }
      setSavedOutfits(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_OUTFITS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Save error:', e);
    }
  };

  const handleRemoveSavedOutfit = async (id) => {
    const updated = savedOutfits.filter(o => o.id !== id);
    setSavedOutfits(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_OUTFITS, JSON.stringify(updated));
  };

  const saveWardrobeToStorage = async (updatedWardrobe) => {
    try {
      setWardrobe(updatedWardrobe);
      await AsyncStorage.setItem(STORAGE_KEYS.WARDROBE, JSON.stringify(updatedWardrobe));
    } catch (error) {
      Alert.alert('Storage Error', 'Could not persist clothing items to device storage.');
    }
  };

  const getActiveApiKey = () => geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  // --------------------------------------------------------------------------
  // SCREEN 1: CAMERA & VISION INGESTION
  // --------------------------------------------------------------------------
  const requestPermissions = async (type) => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission Needed', 'Please enable camera access in Settings.');
          return false;
        }
        return true;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Library Permission Needed', 'Please grant photo library access.');
          return false;
        }
        return true;
      }
    } catch (e) {
      return false;
    }
  };

  const pickImage = async (mode) => {
    setIngestionError(null);
    const hasPermission = await requestPermissions(mode);
    if (!hasPermission) return;

    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
        base64: true,
      };

      const result = mode === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        analyzeClothingWithGemini(asset.base64, asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      setIngestionError('Failed to capture image: ' + error.message);
    }
  };

  const analyzeClothingWithGemini = async (base64Data, imageUri, mimeType = 'image/jpeg') => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      Alert.alert(
        'Gemini API Key Required',
        'Please enter your Gemini API Key in Settings (⚙️ icon) to analyze clothes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => { setTempApiKeyInput(geminiApiKey); setIsSettingsVisible(true); } }
        ]
      );
      return;
    }

    setAnalyzingImage(true);
    setIngestionError(null);
    setAnalyzedItem(null);

    const promptText = \`
You are a high-end fashion archivist. Analyze this clothing photo.
Return ONLY valid JSON matching:
{
  "item_name": "Specific concise descriptive name",
  "category": "tops|bottoms|outerwear|shoes|accessories",
  "primary_color": "Dominant color name",
  "formality": "casual|business|formal"
}
Category MUST be one of: tops, bottoms, outerwear, shoes, accessories.
Formality MUST be one of: casual, business, formal.
No markdown backticks, only pure JSON.
\`.trim();

    const requestPayload = {
      contents: [{
        parts: [
          { text: promptText },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const callEndpoint = async (model) => {
      const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      if (!res.ok) throw new Error(\`Gemini API Error (\${res.status})\`);
      return await res.json();
    };

    try {
      let data;
      try {
        data = await callEndpoint(DEFAULT_MODEL);
      } catch (e) {
        data = await callEndpoint(FALLBACK_MODEL);
      }

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('Empty response from Gemini vision');

      const parsed = JSON.parse(raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
      setAnalyzedItem({
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        item_name: parsed.item_name || 'Clothing Piece',
        category: (parsed.category || 'tops').toLowerCase(),
        primary_color: parsed.primary_color || 'Neutral',
        formality: (parsed.formality || 'casual').toLowerCase(),
        image_uri: imageUri,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      setIngestionError(error.message || 'Vision classification failed.');
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleConfirmAndSaveItem = async () => {
    if (!analyzedItem) return;
    const updated = [analyzedItem, ...wardrobe];
    await saveWardrobeToStorage(updated);
    Alert.alert('Saved to Wardrobe! 🎉', \`"\${analyzedItem.item_name}" saved.\`, [
      { text: 'View Wardrobe', onPress: () => { setActiveTab('gallery'); setPickedImage(null); setAnalyzedItem(null); } },
      { text: 'Add More', onPress: () => { setPickedImage(null); setAnalyzedItem(null); } },
    ]);
  };

  // --------------------------------------------------------------------------
  // SCREEN 3: OUTFIT GENERATOR
  // --------------------------------------------------------------------------
  const handleGenerateOutfits = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      Alert.alert('API Key Required', 'Set your Gemini API key in Settings.');
      return;
    }
    if (wardrobe.length < 2) {
      Alert.alert('Wardrobe Too Small', 'Add at least 2 items to assemble outfits.');
      return;
    }

    setGeneratingOutfits(true);
    setGeneratorError(null);
    setOutfitResults(null);

    const catalog = wardrobe.map(i => ({
      id: i.id,
      item_name: i.item_name,
      category: i.category,
      primary_color: i.primary_color,
      formality: i.formality,
    }));

    const promptText = \`
You are a celebrity personal stylist.
Assemble 3 distinct outfits for Occasion: "\${occasionInput}", Weather: "\${weatherInput}", and Season: "\${seasonInput}".
Available inventory: \${JSON.stringify(catalog)}

Styles needed:
1. "Casual"
2. "Elevated"
3. "Bold/Statement"

Return ONLY JSON matching:
{
  "outfits": [
    {
      "style": "Casual|Elevated|Bold/Statement",
      "title": "Outfit Title",
      "item_ids": ["id1", "id2"],
      "stylist_rationale": "2-3 sentences explaining color, texture, silhouette harmony, and \${seasonInput} seasonal appropriateness.",
      "layering_tip": "Quick styling nuance"
    }
  ]
}
\`.trim();

    try {
      const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${DEFAULT_MODEL}:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) throw new Error(\`Stylist API Error: \${res.status}\`);
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
      setOutfitResults(parsed.outfits || []);
    } catch (e) {
      setGeneratorError(e.message || 'Stylist generation failed.');
      Alert.alert('Styling Failed', e.message);
    } finally {
      setGeneratingOutfits(false);
    }
  };

  const filteredWardrobe = useMemo(() => {
    if (selectedCategory === 'all') return wardrobe;
    return wardrobe.filter(i => (i.category || '').toLowerCase() === selectedCategory.toLowerCase());
  }, [wardrobe, selectedCategory]);

  const wardrobeMap = useMemo(() => {
    const map = {};
    wardrobe.forEach(item => { map[item.id] = item; });
    return map;
  }, [wardrobe]);

  // UI Components
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.navBar}>
        <Text style={styles.navBrand}>Aura Wardrobe</Text>
        <TouchableOpacity onPress={() => { setTempApiKeyInput(geminiApiKey); setIsSettingsVisible(true); }}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'ingest' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenTitle}>Add New Clothing</Text>
            <View style={styles.actionButtonRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage('camera')}>
                <Text style={styles.primaryButtonText}>📸 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#334155' }]} onPress={() => pickImage('library')}>
                <Text style={styles.primaryButtonText}>🖼️ Library</Text>
              </TouchableOpacity>
            </View>

            {analyzingImage && (
              <View style={styles.card}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 10, fontWeight: '700' }}>Gemini Analyzing Piece...</Text>
              </View>
            )}

            {pickedImage && analyzedItem && (
              <View style={styles.card}>
                <Image source={{ uri: pickedImage.uri }} style={{ width: '100%', height: 260, borderRadius: 12 }} />
                <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12 }}>{analyzedItem.item_name}</Text>
                <Text style={{ color: '#64748B' }}>{analyzedItem.category.toUpperCase()} • {analyzedItem.primary_color} • {analyzedItem.formality}</Text>
                <TouchableOpacity style={[styles.primaryButton, { marginTop: 14 }]} onPress={handleConfirmAndSaveItem}>
                  <Text style={styles.primaryButtonText}>Save to Wardrobe</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'gallery' && (
          <View style={{ flex: 1 }}>
            {/* Gallery Sub-Tab Segment Switch */}
            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, margin: 12, padding: 3 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: gallerySubTab === 'closet' ? '#FFF' : 'transparent' }}
                onPress={() => setGallerySubTab('closet')}
              >
                <Text style={{ fontWeight: '700', fontSize: 12, color: gallerySubTab === 'closet' ? '#0F172A' : '#64748B' }}>👗 Closet ({wardrobe.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: gallerySubTab === 'saved_outfits' ? '#FFF' : 'transparent' }}
                onPress={() => setGallerySubTab('saved_outfits')}
              >
                <Text style={{ fontWeight: '700', fontSize: 12, color: gallerySubTab === 'saved_outfits' ? '#0F172A' : '#64748B' }}>⭐ Saved Outfits ({savedOutfits.length})</Text>
              </TouchableOpacity>
            </View>

            {gallerySubTab === 'closet' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, paddingHorizontal: 12 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
                      onPress={() => setSelectedCategory(c.id)}
                    >
                      <Text style={{ color: selectedCategory === c.id ? '#FFF' : '#334' }}>{c.icon} {c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <FlatList
                  data={filteredWardrobe}
                  keyExtractor={i => i.id}
                  numColumns={2}
                  contentContainerStyle={{ padding: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.gridCard} onPress={() => setSelectedItemDetail(item)}>
                      <Image source={{ uri: item.image_uri }} style={{ width: '100%', height: 160, borderRadius: 8 }} />
                      <Text style={{ fontWeight: '700', fontSize: 13, marginTop: 6 }} numberOfLines={1}>{item.item_name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>{item.category} • {item.formality}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              /* SAVED OUTFITS LIST */
              <FlatList
                data={savedOutfits}
                keyExtractor={i => i.id}
                contentContainerStyle={{ padding: 12 }}
                ListEmptyComponent={
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>⭐</Text>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 4 }}>No Saved Outfits Yet</Text>
                    <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12, marginBottom: 12 }}>
                      Generate AI outfit ideas in the Stylist tab and tap "Save Outfit" to build your lookbook!
                    </Text>
                    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10B981' }]} onPress={() => setActiveTab('generator')}>
                      <Text style={styles.primaryButtonText}>Go to Outfit Generator</Text>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item: saved }) => (
                  <View style={[styles.card, { marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ color: '#059669', fontWeight: '800', fontSize: 11 }}>{saved.style.toUpperCase()}</Text>
                      <TouchableOpacity onPress={() => handleRemoveSavedOutfit(saved.id)}>
                        <Text style={{ color: '#EF4444', fontSize: 12 }}>Remove ✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{saved.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {(saved.item_ids || []).map(id => wardrobeMap[id]).filter(Boolean).map((piece, i) => (
                        <View key={i} style={{ width: 60 }}>
                          <Image source={{ uri: piece.image_uri }} style={{ width: 60, height: 60, borderRadius: 6 }} />
                          <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2 }} numberOfLines={1}>{piece.item_name}</Text>
                        </View>
                      ))}
                    </View>
                    {saved.layering_tip && (
                      <Text style={{ fontSize: 11, color: '#92400E', backgroundColor: '#FEF3C7', padding: 6, borderRadius: 6 }}>
                        💡 Tip: {saved.layering_tip}
                      </Text>
                    )}
                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>Saved on {saved.saved_at}</Text>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {activeTab === 'generator' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenTitle}>AI Outfit Generator</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Occasion</Text>
              <TextInput style={styles.input} value={occasionInput} onChangeText={setOccasionInput} />
              
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Time of Year / Season</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                {['Spring 🌸', 'Summer ☀️', 'Fall 🍂', 'Winter ❄️'].map(s => {
                  const val = s.split(' ')[0];
                  const isSel = seasonInput === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.chip, isSel && styles.chipActive]}
                      onPress={() => setSeasonInput(val)}
                    >
                      <Text style={{ fontSize: 12, color: isSel ? '#FFF' : '#334' }}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Weather / Temperature</Text>
              <TextInput style={styles.input} value={weatherInput} onChangeText={setWeatherInput} />
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10B981', marginTop: 14 }]} onPress={handleGenerateOutfits}>
                <Text style={styles.primaryButtonText}>✨ Generate 3 Outfits</Text>
              </TouchableOpacity>
            </View>

            {generatingOutfits && (
              <View style={styles.card}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 10, textAlign: 'center' }}>Stylist synthesizing wardrobe pairings...</Text>
              </View>
            )}

            {outfitResults && outfitResults.map((outfit, idx) => {
              const isSaved = savedOutfits.some(o => o.title === outfit.title && o.style === outfit.style);
              return (
                <View key={idx} style={[styles.card, { marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>{outfit.style.toUpperCase()}</Text>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isSaved ? '#10B981' : '#F1F5F9' }}
                      onPress={() => handleToggleSaveOutfit(outfit)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSaved ? '#FFF' : '#334155' }}>
                        {isSaved ? '⭐ Saved' : '☆ Save Outfit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 4 }}>{outfit.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                    {(outfit.item_ids || []).map(id => wardrobeMap[id]).filter(Boolean).map((item, i) => (
                      <View key={i} style={{ width: 70 }}>
                        <Image source={{ uri: item.image_uri }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                        <Text style={{ fontSize: 10, textAlign: 'center', marginTop: 4 }} numberOfLines={1}>{item.item_name}</Text>
                      </View>
                    ))}
                  </View>
                  {outfit.layering_tip && (
                    <Text style={{ fontSize: 11, color: '#92400E', backgroundColor: '#FEF3C7', padding: 6, borderRadius: 6, marginVertical: 4 }}>
                      💡 Tip: {outfit.layering_tip}
                    </Text>
                  )}
                  
                  {/* Lookbook Visual of Complete Assembled Outfit */}
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: '#0F172A', borderRadius: 10 }}>
                    <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>
                      ✨ LOOKBOOK: ASSEMBLED ON YOU
                    </Text>
                    <Text style={{ color: '#E2E8F0', fontSize: 11, lineHeight: 16 }}>
                      {outfit.visual_summary || \`Head-to-toe ensemble: styled pieces layered cleanly with balanced proportions for \${seasonInput}.\`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('ingest')}>
          <Text style={{ fontSize: 18 }}>📸</Text>
          <Text style={[styles.tabText, activeTab === 'ingest' && { fontWeight: '700' }]}>Add Clothes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('gallery')}>
          <Text style={{ fontSize: 18 }}>👗</Text>
          <Text style={[styles.tabText, activeTab === 'gallery' && { fontWeight: '700' }]}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('generator')}>
          <Text style={{ fontSize: 18 }}>✨</Text>
          <Text style={[styles.tabText, activeTab === 'generator' && { fontWeight: '700' }]}>Stylist</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Gemini API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="AIzaSy..."
              value={tempApiKeyInput}
              onChangeText={setTempApiKeyInput}
            />
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={async () => {
                await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, tempApiKeyInput.trim());
                setGeminiApiKey(tempApiKeyInput.trim());
                setIsSettingsVisible(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Save Key</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getInitialWardrobeSeed() {
  return [
    {
      id: 'seed_1',
      item_name: 'Tailored Cream Ribbed T-Shirt',
      category: 'tops',
      primary_color: 'Cream White',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
    },
    {
      id: 'seed_2',
      item_name: 'Oversized Wool Navy Blazer',
      category: 'outerwear',
      primary_color: 'Navy Blue',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500',
    },
    {
      id: 'seed_3',
      item_name: 'Pleated High-Waist Linen Trousers',
      category: 'bottoms',
      primary_color: 'Olive Green',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500',
    },
    {
      id: 'seed_4',
      item_name: 'Minimalist White Leather Sneakers',
      category: 'shoes',
      primary_color: 'White',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500',
    },
  ];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  navBrand: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16 },
  screenTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  actionButtonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#0F172A', padding: 14, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 16, marginRight: 8, height: 36 },
  chipActive: { backgroundColor: '#0F172A' },
  gridCard: { width: COLUMN_WIDTH, backgroundColor: '#FFF', borderRadius: 12, padding: 8, marginBottom: 12, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
});
`;
