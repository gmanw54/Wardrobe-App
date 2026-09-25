/**
 * ============================================================================
 * AURA WARDROBE & AI STYLIST - COMPLETE EXPO REACT NATIVE APPLICATION (App.js)
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Expo project (if not already created):
 *    npx create-expo-app AuraWardrobe
 *    cd AuraWardrobe
 * 
 * 2. Install required Expo SDK and native packages:
 *    npx expo install expo-image-picker @react-native-async-storage/async-storage
 * 
 * 3. Configure your Gemini API Key:
 *    Create a `.env` file in your project root:
 *    EXPO_PUBLIC_GEMINI_API_KEY="your_actual_gemini_api_key_here"
 *    (Alternatively, tap the "Settings" gear in the app UI to paste your key anytime!)
 * 
 * 4. Run the app on your phone with Expo Go:
 *    npx expo start
 *    - Scan the QR code using the Expo Go app on Android or Camera app on iOS.
 * 
 * 5. Build for production (optional, when ready):
 *    npx eas build -p ios
 *    npx eas build -p android
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Storage Keys
const STORAGE_KEYS = {
  WARDROBE: '@aura_wardrobe_items_v1',
  API_KEY: '@aura_gemini_api_key_v1',
};

// Default Gemini Model Endpoint (supports gemini-3.8-flash and gemini-flash-latest)
const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

// Category definitions & colors
const CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'tops', label: 'Tops', icon: '👕' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessories', label: 'Accessories', icon: '👜' },
];

export default function App() {
  // Navigation State: 'ingest' | 'gallery' | 'generator'
  const [activeTab, setActiveTab] = useState('gallery');

  // Wardrobe Data State
  const [wardrobe, setWardrobe] = useState([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Screen 1: Ingestion State
  const [pickedImage, setPickedImage] = useState(null); // { uri, base64 }
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analyzedItem, setAnalyzedItem] = useState(null);
  const [ingestionError, setIngestionError] = useState(null);

  // Screen 2: Gallery Filter State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Screen 3: Outfit Generator State
  const [weatherInput, setWeatherInput] = useState('Mild & sunny, 72°F');
  const [occasionInput, setOccasionInput] = useState('Casual Dinner');
  const [seasonInput, setSeasonInput] = useState('Fall');
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [outfitResults, setOutfitResults] = useState(null);
  const [generatorError, setGeneratorError] = useState(null);

  // Settings / API Key State
  const [geminiApiKey, setGeminiApiKey] = useState(
    process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''
  );
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  // --------------------------------------------------------------------------
  // LIFECYCLE & STORAGE
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingWardrobe(true);
      const [savedWardrobe, savedKey] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WARDROBE),
        AsyncStorage.getItem(STORAGE_KEYS.API_KEY),
      ]);

      if (savedWardrobe) {
        setWardrobe(JSON.parse(savedWardrobe));
      } else {
        // Pre-populate with realistic demo items on first install if empty
        const initialSeed = getInitialWardrobeSeed();
        setWardrobe(initialSeed);
        await AsyncStorage.setItem(STORAGE_KEYS.WARDROBE, JSON.stringify(initialSeed));
      }

      if (savedKey) {
        setGeminiApiKey(savedKey);
      }
    } catch (error) {
      console.error('Failed to load wardrobe data:', error);
      Alert.alert('Storage Error', 'Could not load your saved wardrobe from local storage.');
    } finally {
      setLoadingWardrobe(false);
    }
  };

  const saveWardrobeToStorage = async (updatedWardrobe) => {
    try {
      setWardrobe(updatedWardrobe);
      await AsyncStorage.setItem(STORAGE_KEYS.WARDROBE, JSON.stringify(updatedWardrobe));
    } catch (error) {
      console.error('Failed to save wardrobe to storage:', error);
      Alert.alert('Storage Error', 'Could not persist clothing items to device storage.');
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = tempApiKeyInput.trim();
    setGeminiApiKey(trimmed);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, trimmed);
      setIsSettingsVisible(false);
      Alert.alert('Success', 'Gemini API Key saved securely to device.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save API key to local storage.');
    }
  };

  // Helper to get effective API key
  const getActiveApiKey = () => {
    return geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  };

  // --------------------------------------------------------------------------
  // SCREEN 1: WARDROBE INGESTION (IMAGE PICKER & GEMINI VISION ANALYSIS)
  // --------------------------------------------------------------------------

  const requestPermissions = async (type) => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Needed',
            'Please enable camera permissions in your device settings to photograph clothing.'
          );
          return false;
        }
        return true;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Library Permission Needed',
            'Please grant photo library access in settings to upload clothing photos.'
          );
          return false;
        }
        return true;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
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

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedImage({
          uri: asset.uri,
          base64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        // Automatically trigger Gemini AI analysis
        analyzeClothingWithGemini(asset.base64, asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('Image picking error:', error);
      setIngestionError('Failed to capture or pick image: ' + error.message);
    }
  };

  /**
   * Calls Google Gemini REST API with Base64 Image and Structured Prompt
   */
  const analyzeClothingWithGemini = async (base64Data, imageUri, mimeType = 'image/jpeg') => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      Alert.alert(
        'Gemini API Key Required',
        'Please enter your Gemini API Key in Settings (gear icon top right) to analyze clothes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { setTempApiKeyInput(geminiApiKey); setIsSettingsVisible(true); } }
        ]
      );
      return;
    }

    setAnalyzingImage(true);
    setIngestionError(null);
    setAnalyzedItem(null);

    const promptText = `
You are a high-end fashion archivist and clothing cataloger.
Analyze this photo of a clothing item or fashion accessory.
Return ONLY a valid JSON object with EXACTLY the following structure and enum constraints:
{
  "item_name": "Specific concise descriptive name (e.g., 'Oversized Navy Wool Blazer', 'White Ribbed Cotton Tee')",
  "category": "tops|bottoms|outerwear|shoes|accessories",
  "primary_color": "Dominant color name (e.g., 'Navy Blue', 'Cream', 'Olive Green')",
  "formality": "casual|business|formal"
}

Category MUST be one of: "tops", "bottoms", "outerwear", "shoes", "accessories".
Formality MUST be one of: "casual", "business", "formal".
Do not return Markdown code blocks. Do not add any text before or after the JSON.
`.trim();

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    };

    // Helper to call REST endpoint
    const callEndpoint = async (modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
      }
      return await response.json();
    };

    try {
      let data;
      try {
        data = await callEndpoint(DEFAULT_MODEL);
      } catch (err) {
        console.warn(`Primary model ${DEFAULT_MODEL} failed, attempting fallback:`, err.message);
        data = await callEndpoint(FALLBACK_MODEL);
      }

      const candidate = data.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned an empty response. Please try another angle or lighting.');
      }

      // Clean JSON if model returned markdown backticks
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate & normalize returned keys
      const normalizedItem = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        item_name: parsed.item_name || 'Fashion Item',
        category: (parsed.category || 'tops').toLowerCase(),
        primary_color: parsed.primary_color || 'Neutral',
        formality: (parsed.formality || 'casual').toLowerCase(),
        image_uri: imageUri,
        created_at: new Date().toISOString(),
      };

      setAnalyzedItem(normalizedItem);
    } catch (error) {
      console.error('Clothing analysis failed:', error);
      setIngestionError(error.message || 'Failed to analyze clothing with Gemini.');
      Alert.alert('Analysis Failed', error.message || 'Could not analyze clothing photo.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleConfirmAndSaveItem = async () => {
    if (!analyzedItem) return;

    const updated = [analyzedItem, ...wardrobe];
    await saveWardrobeToStorage(updated);

    Alert.alert(
      'Saved to Wardrobe! 🎉',
      `"${analyzedItem.item_name}" has been categorized under ${analyzedItem.category.toUpperCase()} and added to your collection.`,
      [
        {
          text: 'View in Gallery',
          onPress: () => {
            setActiveTab('gallery');
            setPickedImage(null);
            setAnalyzedItem(null);
          },
        },
        {
          text: 'Add Another',
          onPress: () => {
            setPickedImage(null);
            setAnalyzedItem(null);
          },
        },
      ]
    );
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this piece from your wardrobe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = wardrobe.filter((i) => i.id !== itemId);
            await saveWardrobeToStorage(updated);
            if (selectedItemDetail?.id === itemId) {
              setSelectedItemDetail(null);
            }
          },
        },
      ]
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 3: OUTFIT GENERATOR
  // --------------------------------------------------------------------------

  const handleGenerateOutfits = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      Alert.alert(
        'Gemini API Key Required',
        'Please enter your Gemini API Key in Settings to generate outfit combinations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { setTempApiKeyInput(geminiApiKey); setIsSettingsVisible(true); } }
        ]
      );
      return;
    }

    if (wardrobe.length < 2) {
      Alert.alert(
        'Wardrobe Too Small',
        'Please add at least 2 or 3 clothing items to your wardrobe before generating outfits!',
        [{ text: 'Add Clothes Now', onPress: () => setActiveTab('ingest') }]
      );
      return;
    }

    setGeneratingOutfits(true);
    setGeneratorError(null);
    setOutfitResults(null);

    // Prepare wardrobe catalog summary for Gemini prompt
    const wardrobeCatalog = wardrobe.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      category: item.category,
      primary_color: item.primary_color,
      formality: item.formality,
    }));

    const promptText = `
You are a world-class celebrity personal stylist and color theory expert.
The user has a digital wardrobe of clothing items and needs outfit recommendations.

USER CONTEXT:
- Occasion: "${occasionInput || 'Casual Dinner'}"
- Weather / Temperature: "${weatherInput || 'Mild 70°F'}"
- Time of Year / Season: "${seasonInput || 'Fall'}"

AVAILABLE WARDROBE INVENTORY (JSON):
${JSON.stringify(wardrobeCatalog, null, 2)}

INSTRUCTIONS:
1. Assemble EXACTLY THREE (3) distinct outfit combinations tailored for this occasion, weather, and the ${seasonInput || 'Fall'} season:
   - "Casual" (relaxed, comfortable, effortless chic, season-appropriate fabrics)
   - "Elevated" (polished, put-together, smart, sophisticated)
   - "Bold/Statement" (fashion-forward, contrasting textures/colors, memorable)
2. Use ONLY items from the provided Wardrobe Inventory list.
3. Every outfit MUST reference the exact "item_id" from the inventory for each item paired.
4. For each outfit, provide a sharp, encouraging 2-3 sentence stylist rationale explaining why this combination works (color harmony, silhouette proportion, weather practicality, and ${seasonInput} seasonal sensibility).

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema without Markdown formatting:
{
  "outfits": [
    {
      "style": "Casual",
      "title": "Short catchy name (e.g. 'Effortless Weekend Linen')",
      "item_ids": ["id1", "id2", "id3"],
      "stylist_rationale": "2-3 sentences of stylist advice and pairing rationale.",
      "layering_tip": "One quick tip on how to wear it (e.g. cuff the trousers, unbutton top collar)"
    },
    {
      "style": "Elevated",
      "title": "Short catchy name",
      "item_ids": ["id1", "id2", "id3"],
      "stylist_rationale": "Stylist advice...",
      "layering_tip": "Styling tip..."
    },
    {
      "style": "Bold/Statement",
      "title": "Short catchy name",
      "item_ids": ["id1", "id2", "id3"],
      "stylist_rationale": "Stylist advice...",
      "layering_tip": "Styling tip..."
    }
  ]
}
`.trim();

    const requestPayload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    };

    const callEndpoint = async (modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Stylist Error (${response.status}): ${errText}`);
      }
      return await response.json();
    };

    try {
      let data;
      try {
        data = await callEndpoint(DEFAULT_MODEL);
      } catch (err) {
        console.warn(`Primary stylist model failed, trying fallback:`, err.message);
        data = await callEndpoint(FALLBACK_MODEL);
      }

      const candidate = data.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned an empty styling response.');
      }

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (!parsed.outfits || !Array.isArray(parsed.outfits)) {
        throw new Error('Invalid outfit structure returned by Gemini.');
      }

      setOutfitResults(parsed.outfits);
    } catch (error) {
      console.error('Outfit generation error:', error);
      setGeneratorError(error.message || 'Failed to generate outfits.');
      Alert.alert('Styling Failed', error.message || 'Could not assemble outfits. Please try again.');
    } finally {
      setGeneratingOutfits(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED GALLERY ITEMS
  // --------------------------------------------------------------------------

  const filteredWardrobe = useMemo(() => {
    if (selectedCategory === 'all') return wardrobe;
    return wardrobe.filter(
      (item) => (item.category || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [wardrobe, selectedCategory]);

  // Lookup map for fast rendering in outfit cards
  const wardrobeMap = useMemo(() => {
    const map = {};
    wardrobe.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [wardrobe]);

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  const renderFormalityBadge = (formality) => {
    const colorMap = {
      casual: { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
      business: { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
      formal: { bg: '#F3E5F5', text: '#7B1FA2', border: '#E1BEE7' },
    };
    const conf = colorMap[(formality || 'casual').toLowerCase()] || colorMap.casual;
    return (
      <View style={[styles.badgeContainer, { backgroundColor: conf.bg, borderColor: conf.border }]}>
        <Text style={[styles.badgeText, { color: conf.text }]}>
          {(formality || 'casual').toUpperCase()}
        </Text>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 1 CONTENT: INGESTION
  // --------------------------------------------------------------------------
  const renderIngestScreen = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Add New Clothing</Text>
          <Text style={styles.screenSubtitle}>
            Snap a photo or choose from library. Gemini AI vision automatically identifies category, color, and formality.
          </Text>
        </View>

        {/* Photo Selection Action Buttons */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.primaryButton, styles.cameraButton]}
            onPress={() => pickImage('camera')}
            activeOpacity={0.8}
            disabled={analyzingImage}
          >
            <Text style={styles.buttonIcon}>📸</Text>
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, styles.libraryButton]}
            onPress={() => pickImage('library')}
            activeOpacity={0.8}
            disabled={analyzingImage}
          >
            <Text style={styles.buttonIcon}>🖼️</Text>
            <Text style={styles.primaryButtonText}>Photo Library</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner for Gemini Analysis */}
        {analyzingImage && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingTitle}>Gemini AI Analyzing Piece...</Text>
            <Text style={styles.loadingSubtitle}>
              Classifying item name, fabric silhouette, color profile, and formality level...
            </Text>
          </View>
        )}

        {/* Error Notification */}
        {ingestionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Analysis Notice</Text>
            <Text style={styles.errorText}>{ingestionError}</Text>
            {!getActiveApiKey() && (
              <TouchableOpacity
                style={styles.errorFixButton}
                onPress={() => { setTempApiKeyInput(geminiApiKey); setIsSettingsVisible(true); }}
              >
                <Text style={styles.errorFixButtonText}>Set Gemini API Key →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Preview of Selected Image & AI Detection Result */}
        {pickedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: pickedImage.uri }} style={styles.mainPreviewImage} />

            {analyzedItem && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeaderRow}>
                  <Text style={styles.aiTag}>✨ GEMINI CLASSIFIED</Text>
                  {renderFormalityBadge(analyzedItem.formality)}
                </View>

                {/* Editable / Verified Details */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Item Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={analyzedItem.item_name}
                    onChangeText={(val) => setAnalyzedItem({ ...analyzedItem, item_name: val })}
                    placeholder="e.g. Navy Linen Blazer"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <View style={styles.staticField}>
                      <Text style={styles.staticFieldText}>
                        {analyzedItem.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.fieldLabel}>Color</Text>
                    <TextInput
                      style={styles.textInput}
                      value={analyzedItem.primary_color}
                      onChangeText={(val) => setAnalyzedItem({ ...analyzedItem, primary_color: val })}
                    />
                  </View>
                </View>

                {/* Confirm Save Button */}
                <TouchableOpacity
                  style={styles.saveWardrobeButton}
                  onPress={handleConfirmAndSaveItem}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveWardrobeButtonText}>Save to Wardrobe</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Helpful Tips for Best Scanning */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsHeading}>💡 Pro Tips for Best Recognition</Text>
          <Text style={styles.tipItem}>• Lay garments flat against a neutral, high-contrast surface.</Text>
          <Text style={styles.tipItem}>• Ensure even lighting with minimal strong shadows.</Text>
          <Text style={styles.tipItem}>• Capture one clothing item per photo for accurate pairings.</Text>
        </View>
      </ScrollView>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 2 CONTENT: WARDROBE GALLERY
  // --------------------------------------------------------------------------
  const renderGalleryScreen = () => {
    return (
      <View style={styles.galleryContainer}>
        {/* Category Filter Horizontal Scroll */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContainer}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? wardrobe.length
                  : wardrobe.filter((i) => i.category === cat.id).length;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterChipIcon}>{cat.icon}</Text>
                  <Text
                    style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}
                  >
                    {cat.label}
                  </Text>
                  <View
                    style={[
                      styles.filterCountBadge,
                      isSelected && styles.filterCountBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        isSelected && styles.filterCountTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Wardrobe Items Grid */}
        <FlatList
          data={filteredWardrobe}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadInitialData();
                setRefreshing(false);
              }}
              colors={['#10B981']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyGalleryContainer}>
              <Text style={styles.emptyEmoji}>👗</Text>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'all'
                  ? 'Your Wardrobe is Empty'
                  : `No ${selectedCategory} found`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Add your clothing items by snapping photos so Gemini can start styling your outfits!
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => setActiveTab('ingest')}
              >
                <Text style={styles.emptyAddButtonText}>+ Add First Clothing Item</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              activeOpacity={0.85}
              onPress={() => setSelectedItemDetail(item)}
            >
              <View style={styles.thumbnailWrapper}>
                <Image
                  source={{ uri: item.image_uri }}
                  style={styles.gridThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.thumbnailFormalityTag}>
                  {renderFormalityBadge(item.formality)}
                </View>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.item_name}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.itemCategoryText}>
                    {item.category.toUpperCase()}
                  </Text>
                  <Text style={styles.itemColorDot}>•</Text>
                  <Text style={styles.itemColorText} numberOfLines={1}>
                    {item.primary_color}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 3 CONTENT: OUTFIT GENERATOR
  // --------------------------------------------------------------------------
  const renderGeneratorScreen = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>AI Outfit Generator</Text>
          <Text style={styles.screenSubtitle}>
            Specify your destination weather & occasion. Gemini personal stylist pairs your real wardrobe items into 3 curated styles.
          </Text>
        </View>

        {/* Input Parameters Card */}
        <View style={styles.generatorControlCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Occasion</Text>
            <TextInput
              style={styles.textInput}
              value={occasionInput}
              onChangeText={setOccasionInput}
              placeholder="e.g. Casual Dinner, Client Pitch, Weekend Trip"
            />
            {/* Quick preset pills */}
            <View style={styles.presetPillsRow}>
              {['Dinner Date', 'Business Casual', 'Weekend Brunch', 'Cocktail Event'].map((occ) => (
                <TouchableOpacity
                  key={occ}
                  style={styles.presetPill}
                  onPress={() => setOccasionInput(occ)}
                >
                  <Text style={styles.presetPillText}>{occ}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.fieldGroup, { marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.fieldLabel}>Time of Year / Season</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>{seasonInput}</Text>
            </View>
            <View style={styles.seasonRow}>
              {[
                { id: 'Spring', label: 'Spring', icon: '🌸' },
                { id: 'Summer', label: 'Summer', icon: '☀️' },
                { id: 'Fall', label: 'Fall', icon: '🍂' },
                { id: 'Winter', label: 'Winter', icon: '❄️' },
              ].map((season) => {
                const isSelected = seasonInput === season.id;
                return (
                  <TouchableOpacity
                    key={season.id}
                    style={[styles.seasonCard, isSelected && styles.seasonCardSelected]}
                    onPress={() => setSeasonInput(season.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.seasonIcon}>{season.icon}</Text>
                    <Text style={[styles.seasonLabel, isSelected && styles.seasonLabelSelected]}>
                      {season.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.fieldGroup, { marginTop: 12 }]}>
            <Text style={styles.fieldLabel}>Weather / Temperature</Text>
            <TextInput
              style={styles.textInput}
              value={weatherInput}
              onChangeText={setWeatherInput}
              placeholder="e.g. Sunny 72°F, Rainy 55°F, Cold 35°F"
            />
            <View style={styles.presetPillsRow}>
              {['Sunny 75°F', 'Chilly 52°F Rain', 'Hot Summer 88°F', 'Breezy 64°F'].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={styles.presetPill}
                  onPress={() => setWeatherInput(w)}
                >
                  <Text style={styles.presetPillText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.primaryButton, styles.generateButton]}
            onPress={handleGenerateOutfits}
            disabled={generatingOutfits}
            activeOpacity={0.8}
          >
            {generatingOutfits ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>✨</Text>
                <Text style={styles.primaryButtonText}>Generate Outfits</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {generatingOutfits && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingTitle}>Consulting Gemini Fashion AI...</Text>
            <Text style={styles.loadingSubtitle}>
              Synthesizing silhouette proportions, color palettes, and layering for "{occasionInput}" in {weatherInput}...
            </Text>
          </View>
        )}

        {/* Generator Error */}
        {generatorError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Styling Error</Text>
            <Text style={styles.errorText}>{generatorError}</Text>
          </View>
        )}

        {/* Outfit Results (Casual, Elevated, Bold/Statement) */}
        {outfitResults && (
          <View style={styles.outfitsContainer}>
            <Text style={styles.outfitsSectionHeading}>
              Curated Combinations ({outfitResults.length})
            </Text>

            {outfitResults.map((outfit, index) => {
              // Retrieve corresponding clothing item objects
              const pairedItems = (outfit.item_ids || [])
                .map((id) => wardrobeMap[id])
                .filter(Boolean);

              const styleColorBadge = {
                Casual: { bg: '#E0F2FE', text: '#0284C7' },
                Elevated: { bg: '#FEF3C7', text: '#D97706' },
                'Bold/Statement': { bg: '#FCE7F3', text: '#DB2777' },
              }[outfit.style] || { bg: '#F3F4F6', text: '#4B5563' };

              return (
                <View key={index} style={styles.outfitCard}>
                  {/* Outfit Card Header */}
                  <View style={styles.outfitHeader}>
                    <View style={[styles.styleBadge, { backgroundColor: styleColorBadge.bg }]}>
                      <Text style={[styles.styleBadgeText, { color: styleColorBadge.text }]}>
                        {outfit.style.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.outfitTitle}>{outfit.title}</Text>
                  </View>

                  {/* Paired Wardrobe Thumbnails */}
                  <View style={styles.pairedItemsRow}>
                    {pairedItems.map((item, i) => (
                      <View key={item.id || i} style={styles.pairedItemCol}>
                        <Image
                          source={{ uri: item.image_uri }}
                          style={styles.pairedItemImage}
                        />
                        <Text style={styles.pairedItemName} numberOfLines={2}>
                          {item.item_name}
                        </Text>
                        <Text style={styles.pairedItemCat}>
                          {item.category}
                        </Text>
                      </View>
                    ))}
                    {pairedItems.length === 0 && (
                      <Text style={styles.noItemsMatchedText}>
                        Items paired by Gemini are identified in description.
                      </Text>
                    )}
                  </View>

                  {/* Stylist Rationale */}
                  <View style={styles.rationaleBox}>
                    <Text style={styles.rationaleHeading}>Stylist Rationale:</Text>
                    <Text style={styles.rationaleText}>{outfit.stylist_rationale}</Text>
                    {outfit.layering_tip && (
                      <View style={styles.stylingTipRow}>
                        <Text style={styles.tipIcon}>💡</Text>
                        <Text style={styles.tipText}>
                          <Text style={{ fontWeight: '700' }}>Pro Tip: </Text>
                          {outfit.layering_tip}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // --------------------------------------------------------------------------
  // ITEM DETAIL MODAL
  // --------------------------------------------------------------------------
  const renderItemDetailModal = () => {
    if (!selectedItemDetail) return null;
    return (
      <Modal
        visible={!!selectedItemDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedItemDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Item Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedItemDetail(null)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Image
              source={{ uri: selectedItemDetail.image_uri }}
              style={styles.modalImage}
              resizeMode="cover"
            />

            <View style={styles.modalBody}>
              <View style={styles.modalTagRow}>
                {renderFormalityBadge(selectedItemDetail.formality)}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {selectedItemDetail.category.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalItemName}>{selectedItemDetail.item_name}</Text>
              
              <View style={styles.modalMetaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Primary Color</Text>
                  <Text style={styles.metaCellValue}>{selectedItemDetail.primary_color}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Formality</Text>
                  <Text style={styles.metaCellValue}>{selectedItemDetail.formality}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Added</Text>
                  <Text style={styles.metaCellValue}>
                    {selectedItemDetail.created_at
                      ? new Date(selectedItemDetail.created_at).toLocaleDateString()
                      : 'Recent'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(selectedItemDetail.id)}
              >
                <Text style={styles.deleteButtonText}>Remove Item from Wardrobe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // --------------------------------------------------------------------------
  // SETTINGS MODAL (API KEY)
  // --------------------------------------------------------------------------
  const renderSettingsModal = () => {
    return (
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gemini API Settings</Text>
              <TouchableOpacity
                onPress={() => setIsSettingsVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.settingsExplainer}>
                Enter your Google Gemini API Key to enable instant AI clothing classification and outfit recommendations.
              </Text>

              <Text style={styles.fieldLabel}>Gemini API Key</Text>
              <TextInput
                style={[styles.textInput, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
                value={tempApiKeyInput}
                onChangeText={setTempApiKeyInput}
                placeholder="AIzaSy..."
                secureTextEntry={false}
                autoCapitalize="none"
              />

              <Text style={styles.settingsSubnote}>
                Note: In production Expo builds, configure EXPO_PUBLIC_GEMINI_API_KEY in your .env file.
              </Text>

              <TouchableOpacity
                style={styles.saveWardrobeButton}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.saveWardrobeButtonText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // --------------------------------------------------------------------------
  // MAIN APP CONTAINER
  // --------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* App Top Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navBrand}>Aura Wardrobe</Text>
          <Text style={styles.navSubBrand}>AI Vision & Personal Stylist</Text>
        </View>

        <TouchableOpacity
          style={styles.gearButton}
          onPress={() => {
            setTempApiKeyInput(geminiApiKey);
            setIsSettingsVisible(true);
          }}
        >
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Viewport */}
      <View style={styles.mainViewport}>
        {activeTab === 'ingest' && renderIngestScreen()}
        {activeTab === 'gallery' && renderGalleryScreen()}
        {activeTab === 'generator' && renderGeneratorScreen()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ingest' && styles.tabItemActive]}
          onPress={() => setActiveTab('ingest')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>📸</Text>
          <Text style={[styles.tabLabel, activeTab === 'ingest' && styles.tabLabelActive]}>
            Add Clothes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'gallery' && styles.tabItemActive]}
          onPress={() => setActiveTab('gallery')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>👗</Text>
          <Text style={[styles.tabLabel, activeTab === 'gallery' && styles.tabLabelActive]}>
            Wardrobe ({wardrobe.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'generator' && styles.tabItemActive]}
          onPress={() => setActiveTab('generator')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>✨</Text>
          <Text style={[styles.tabLabel, activeTab === 'generator' && styles.tabLabelActive]}>
            AI Stylist
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderItemDetailModal()}
      {renderSettingsModal()}
    </SafeAreaView>
  );
}

// ----------------------------------------------------------------------------
// INITIAL SEED DATA (High quality Unsplash clothing items for instant testing)
// ----------------------------------------------------------------------------
function getInitialWardrobeSeed() {
  return [
    {
      id: 'seed_top_1',
      item_name: 'Tailored Cream Ribbed T-Shirt',
      category: 'tops',
      primary_color: 'Cream White',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_top_2',
      item_name: 'Structured Oxford Button-Down Shirt',
      category: 'tops',
      primary_color: 'Light Blue',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_outer_1',
      item_name: 'Oversized Wool Navy Blazer',
      category: 'outerwear',
      primary_color: 'Navy Blue',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_outer_2',
      item_name: 'Vintage Distressed Leather Moto Jacket',
      category: 'outerwear',
      primary_color: 'Espresso Brown',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_bottom_1',
      item_name: 'Pleated High-Waist Linen Trousers',
      category: 'bottoms',
      primary_color: 'Olive Green',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_bottom_2',
      item_name: 'Selvedge Straight-Leg Raw Denim Jeans',
      category: 'bottoms',
      primary_color: 'Indigo',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_shoes_1',
      item_name: 'Italian Leather Suede Chelsea Boots',
      category: 'shoes',
      primary_color: 'Tobacco Tan',
      formality: 'business',
      image_uri: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed_shoes_2',
      item_name: 'Minimalist White Low-Top Leather Sneakers',
      category: 'shoes',
      primary_color: 'Crisp White',
      formality: 'casual',
      image_uri: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    },
  ];
}

// ----------------------------------------------------------------------------
// STYLESHEET
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  navSubBrand: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  gearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  gearIcon: {
    fontSize: 18,
  },
  mainViewport: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  screenHeader: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  // Buttons & Controls
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cameraButton: {
    backgroundColor: '#0F172A',
  },
  libraryButton: {
    backgroundColor: '#334155',
  },
  generateButton: {
    backgroundColor: '#10B981',
    marginTop: 16,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Loading Card
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Error Notification
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  errorFixButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  errorFixButtonText: {
    color: '#991B1B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Preview & Result Card
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  mainPreviewImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#F1F5F9',
  },
  resultCard: {
    padding: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  staticField: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  staticFieldText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  saveWardrobeButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveWardrobeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tipsCard: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipsHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 18,
  },

  // SCREEN 2: GALLERY
  galleryContainer: {
    flex: 1,
  },
  filterScrollWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipSelected: {
    backgroundColor: '#0F172A',
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    marginLeft: 6,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountBadgeSelected: {
    backgroundColor: '#334155',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterCountTextSelected: {
    color: '#FFFFFF',
  },
  gridContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  gridCard: {
    width: COLUMN_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 170,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFormalityTag: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  cardDetails: {
    padding: 10,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  itemColorDot: {
    fontSize: 10,
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  itemColorText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  emptyGalleryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  emptyAddButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // SCREEN 3: GENERATOR
  generatorControlCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  seasonCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seasonCardSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  seasonIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  seasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  seasonLabelSelected: {
    color: '#FFFFFF',
  },
  presetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  outfitsContainer: {
    marginTop: 8,
  },
  outfitsSectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  outfitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  outfitHeader: {
    marginBottom: 12,
  },
  styleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  styleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outfitTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  pairedItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  pairedItemCol: {
    width: 80,
    alignItems: 'center',
  },
  pairedItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  pairedItemName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  pairedItemCat: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  noItemsMatchedText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  rationaleBox: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  rationaleHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  stylingTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tipText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },

  // Badges & Common
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    padding: 20,
  },
  modalTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  modalItemName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
  },
  metaCellLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  metaCellValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  settingsExplainer: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  settingsSubnote: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 16,
  },

  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabItemActive: {
    transform: [{ scale: 1.02 }],
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
