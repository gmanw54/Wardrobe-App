# Closet Calculator & AI Stylist (Expo React Native)

A cross-platform mobile wardrobe archivist and personal styling application built with React Native and Expo SDK 51, powered by Google Gemini AI vision and reasoning models.

---

## 🚀 Quick Start (Run on your Phone in 2 Minutes)

### 1. Prerequisites
- Install [Node.js (v18+)](https://nodejs.org)
- Install **Expo Go** on your physical phone:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107442)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Project Setup
```bash
# Initialize project directory (or copy these files)
npx create-expo-app ClosetCalculator
cd ClosetCalculator

# Install required native & Expo SDK dependencies
npx expo install expo-image-picker @react-native-async-storage/async-storage
```

### 3. Add your Gemini API Key
Create a `.env` file in the root folder:
```env
EXPO_PUBLIC_GEMINI_API_KEY="AIzaSyYourActualGeminiKey"
```
*(Tip: You can also tap the Settings ⚙️ gear icon in the top right corner of the mobile app to enter or update your Gemini API key anytime on your phone!)*

### 4. Launch the Dev Server
```bash
npx expo start
```
- **iOS:** Open the native Camera app and scan the terminal QR code. Tap the notification banner to open in Expo Go.
- **Android:** Open the Expo Go app, tap "Scan QR code", and point at the terminal screen.

---

## 📱 Features & Screen Breakdown

### Screen 1: Wardrobe Ingestion (`Add Clothes`)
- **Native Camera & Media Library Pickers:** Powered by `expo-image-picker` with real-time permission handling.
- **Instant Base64 Vision Analysis:** Compresses and pipes image data directly to Google Gemini REST endpoint.
- **Structured JSON Classification:** Extracts:
  - `item_name`: e.g. "Oversized Navy Wool Blazer"
  - `category`: `tops` | `bottoms` | `outerwear` | `shoes` | `accessories`
  - `primary_color`: e.g. "Navy Blue"
  - `formality`: `casual` | `business` | `formal`
- **Verification & Local Persistence:** Review the detected labels before saving to device storage via `@react-native-async-storage/async-storage`.

### Screen 2: Wardrobe Gallery
- **Modern 2-Column Responsive Grid:** Optimized with `FlatList` and dynamic column sizing based on screen dimensions.
- **Horizontal Category Filter Bar:** Filter by All, Tops, Bottoms, Outerwear, Shoes, or Accessories with real-time counts.
- **Item Details & Management:** Tap any card to view full-resolution photo, metadata chips, and delete items with confirmation dialogs.
- **Pull-to-Refresh:** Syncs immediately with local storage.

### Screen 3: AI Outfit Generator
- **Contextual Inputs:** Weather/temperature conditions (e.g. "Mild & sunny, 72°F") and occasion (e.g. "Casual Dinner", "Meeting").
- **Multi-Style Pairing:** Gemini analyzes your real inventory items and outputs 3 distinct outfits:
  1. **Casual:** Effortless, laid-back comfort.
  2. **Elevated:** Polished, smart, and sophisticated.
  3. **Bold/Statement:** High fashion, contrasting accents, memorable presence.
- **Visual Card Matching:** Directly connects the generated recommendations to your wardrobe thumbnail photos and provides stylist notes and layering tips.

---

## 🛠️ Production Build (EAS)

When you are ready to compile standalone `.apk` or `.ipa` binaries:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
eas build -p ios --profile preview
```
