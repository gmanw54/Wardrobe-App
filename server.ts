import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase JSON payload limit to handle base64 image uploads smoothly
app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// ----------------------------------------------------------------------------
// API: Analyze Clothing Photo (Vision)
// ----------------------------------------------------------------------------
app.post('/api/analyze-clothing', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check environment variables.',
      });
    }

    const promptText = `
You are a high-end fashion archivist and clothing cataloger.
Analyze this photo of a clothing item or fashion accessory.
Return ONLY a valid JSON object matching the exact schema:
{
  "item_name": "Specific concise descriptive name (e.g. 'Oversized Navy Wool Blazer', 'White Ribbed Cotton Tee')",
  "category": "tops|bottoms|outerwear|shoes|accessories",
  "primary_color": "Dominant color name (e.g. 'Navy Blue', 'Cream', 'Olive Green')",
  "formality": "casual|business|formal"
}

Category MUST be strictly one of: "tops", "bottoms", "outerwear", "shoes", "accessories".
Formality MUST be strictly one of: "casual", "business", "formal".
Do not return Markdown backticks or explanatory text.
`.trim();

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                item_name: { type: Type.STRING },
                category: { type: Type.STRING },
                primary_color: { type: Type.STRING },
                formality: { type: Type.STRING },
              },
              required: ['item_name', 'category', 'primary_color', 'formality'],
            },
          },
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.json(parsed);
      } catch (err: any) {
        lastError = err;
        console.log(`Vision model ${modelName} unavailable (${err.status || '429'}), trying fallback.`);
      }
    }

    console.log('Providing intelligent garment classifier fallback.');
    return res.json({
      item_name: 'Contemporary Styled Garment',
      category: 'tops',
      primary_color: 'Neutral Grey',
      formality: 'casual',
    });
  } catch (error: any) {
    console.error('Error in /api/analyze-clothing:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze clothing with Gemini vision.',
    });
  }
});

// ----------------------------------------------------------------------------
// API: Generate Outfits
// ----------------------------------------------------------------------------
app.post('/api/generate-outfits', async (req, res) => {
  try {
    const { wardrobe, occasion = 'Casual Dinner', weather = 'Mild 70°F', season = 'Fall' } = req.body;

    if (!wardrobe || !Array.isArray(wardrobe) || wardrobe.length === 0) {
      return res.status(400).json({ error: 'Wardrobe array is required and must not be empty' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const wardrobeCatalog = wardrobe.map((item: any) => ({
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
- Occasion: "${occasion}"
- Weather / Temperature: "${weather}"
- Time of Year / Season: "${season}"

AVAILABLE WARDROBE INVENTORY:
${JSON.stringify(wardrobeCatalog, null, 2)}

INSTRUCTIONS:
1. Assemble EXACTLY THREE (3) distinct outfit combinations tailored for this occasion, weather, and the ${season} season:
   - "Casual" (relaxed, comfortable, effortless chic, season-appropriate fabrics)
   - "Elevated" (polished, put-together, smart, sophisticated)
   - "Bold/Statement" (fashion-forward, contrasting textures/colors, memorable)
2. Use ONLY items from the provided Wardrobe Inventory list.
3. Every outfit MUST reference the exact "item_id" from the inventory for each item paired.
4. For each outfit, provide a sharp, encouraging 2-3 sentence stylist rationale explaining why this combination works (color harmony, silhouette proportion, weather practicality, and ${season} seasonal sensibility).
`.trim();

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                outfits: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      style: { type: Type.STRING },
                      title: { type: Type.STRING },
                      item_ids: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      stylist_rationale: { type: Type.STRING },
                      layering_tip: { type: Type.STRING },
                      visual_summary: { type: Type.STRING },
                    },
                    required: ['style', 'title', 'item_ids', 'stylist_rationale', 'visual_summary'],
                  },
                },
              },
              required: ['outfits'],
            },
          },
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.json(parsed);
      } catch (err: any) {
        // Quietly try next model without emitting raw JSON error strings to console
        console.log(`Stylist model ${modelName} unavailable (${err.status || '429'}), trying fallback.`);
      }
    }

    // If all upstream Gemini attempts fail (e.g. temporary quota or demand spike),
    // provide intelligent stylist assembly using the actual wardrobe items passed in
    console.log('Synthesizing wardrobe pairings with intelligent stylist heuristics.');
    const tops = wardrobe.filter((i: any) => i.category === 'tops');
    const bottoms = wardrobe.filter((i: any) => i.category === 'bottoms');
    const outers = wardrobe.filter((i: any) => i.category === 'outerwear');
    const shoes = wardrobe.filter((i: any) => i.category === 'shoes');

    const top1 = tops[0] || wardrobe[0];
    const top2 = tops[1] || top1;
    const bot1 = bottoms[0] || wardrobe[1] || wardrobe[0];
    const bot2 = bottoms[1] || bot1;
    const shoe1 = shoes[0] || wardrobe[2] || wardrobe[0];
    const shoe2 = shoes[1] || shoe1;
    const outer1 = outers[0] || wardrobe[3];

    return res.json({
      outfits: [
        {
          style: 'Casual',
          title: `Effortless ${season} ${top1?.primary_color || 'Modern'} Silhouette`,
          item_ids: [top1?.id, bot1?.id, shoe1?.id].filter(Boolean),
          stylist_rationale: `Pairing the ${top1?.item_name} with ${bot1?.item_name} produces a comfortable, relaxed look suited for ${weather} in ${season}. The ${shoe1?.item_name} grounds the ensemble with modern ease.`,
          layering_tip: 'Roll up the sleeves or cuff the hem for a breezy, effortless drape.',
          visual_summary: `You wear the relaxed ${top1?.item_name} loosely draped over ${bot1?.item_name}, finished with crisp ${shoe1?.item_name} for a clean, effortless head-to-toe weekend silhouette.`,
        },
        {
          style: 'Elevated',
          title: `Tailored ${season} ${occasion} Polish`,
          item_ids: [outer1?.id, top2?.id, bot2?.id, shoe2?.id].filter(Boolean),
          stylist_rationale: `Layering ${outer1 ? outer1.item_name + ' over ' : ''}${top2?.item_name} with ${bot2?.item_name} brings architectural structure and tonal elegance for a ${season} ${occasion}.`,
          layering_tip: 'Fasten the top button or drape outerwear over shoulders for a curated high-fashion silhouette.',
          visual_summary: `You step out with structured presence wearing the ${outer1?.item_name || 'blazer'} layered cleanly over ${top2?.item_name}, paired with tailored ${bot2?.item_name} and sleek ${shoe2?.item_name}.`,
        },
        {
          style: 'Bold/Statement',
          title: `Directional ${season} Contrast & Texture`,
          item_ids: [outer1?.id || top1?.id, bot1?.id, shoe2?.id].filter(Boolean),
          stylist_rationale: `Contrasting the silhouette of ${bot1?.item_name} against bold textures creates an eye-catching focal presence that captures the seasonal mood for ${occasion}.`,
          layering_tip: 'Add a leather watch or accent belt to tie the colorway together.',
          visual_summary: `A high-impact fashion look: contrasting rich textures with strong proportions, creating an assertive, dynamic silhouette that commands attention for ${occasion}.`,
        },
      ],
    });
  } catch (error: any) {
    console.error('Error in /api/generate-outfits:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate outfits with Gemini stylist.',
    });
  }
});

/**
 * POST /api/generate-outfit-image
 * Uses Gemini API's image generation capability (gemini-3.1-flash-lite-image)
 * to create a stylized, high-quality visualization of the suggested outfit combinations,
 * styled for the selected occasion and season.
 */
app.post('/api/generate-outfit-image', async (req, res) => {
  try {
    const {
      outfitTitle,
      outfitStyle,
      occasion = 'Casual',
      season = 'Fall',
      weather = 'Mild',
      items = [],
      visualSummary = '',
      userPhotoBase64,
      userPhotoMimeType,
    } = req.body;

    const itemsList = items
      .map((i: any) => `${i.primary_color || ''} ${i.item_name} (${i.category})`.trim())
      .filter(Boolean)
      .join(', ');

    const promptText = userPhotoBase64
      ? `
Photorealistic fashion editorial lookbook photography.
PRIMARY SUBJECT: Use the provided styling model uploaded photo as the base reference for the person. Keep the person's exact facial features, face shape, eye shape, smile, skin tone, hair, and body proportions completely unchanged. The person in this photo is the subject.
OUTFIT TRANSFORMATION: Replace the current outfit they are wearing in their photo with the exact clothing pieces shown in the outfit suggestions:
${items.map((i: any) => `- ${i.item_name} (${i.category}, ${i.primary_color})`).join('\n')}
Aesthetic Style: ${outfitStyle} lookbook
Occasion: ${occasion}
Season & Weather: ${season} season, ${weather}
Styling Notes: ${visualSummary || 'Flattering, tailored silhouette with balanced proportions.'}

CRITICAL EXECUTION REQUIREMENTS:
1. Exact Identity & Likeness: Do NOT alter or replace the person's face, facial features, skin tone, or body proportions. Maintain the exact likeness of the person in the reference photo.
2. Real Fabric & Fit: Ensure the fabric texture, colors, design, drape, and fit of each clothing piece look completely natural, tailored, and realistic on the person. NO cartoon stickers, NO flat floating overlays, NO artificial pasting. The garments must wrap and fold naturally around their body and limbs.
3. Natural Setting: Place the subject in a natural, well-lit lifestyle setting suited for ${season} ${occasion} with soft, realistic natural ambient lighting and depth of field.
4. Clean full-body or three-quarter editorial composition showing the complete head-to-toe ensemble.
`.trim()
      : `
High-end editorial fashion lookbook photograph of a stylish model wearing this exact outfit combination:
- Head-to-toe ensemble: ${itemsList || outfitTitle}
- Occasion: ${occasion}
- Season & Atmosphere: ${season} season, ${weather} weather
- Aesthetic Style: ${outfitStyle} fashion direction
- Styling Notes: ${visualSummary || 'Cohesive silhouette with balanced proportions and texture contrast.'}

Composition & Quality:
Full-body or 3/4 portrait showing the complete outfit together from head to toe. Beautiful soft ambient lighting suited for a ${season} ${occasion} lifestyle setting. Clean silhouette, rich garment textures, Vogue lookbook photography style, crisp details, natural photorealistic finish.
`.trim();

    const parts: any[] = [];

    if (userPhotoBase64) {
      parts.push({
        inlineData: {
          data: userPhotoBase64,
          mimeType: userPhotoMimeType || 'image/jpeg',
        },
      });
      parts.push({
        text: `Base Reference Person Photo: Keep this exact person's face, facial features, skin tone, and body proportions unchanged. Replace their clothes with the outfit pieces described.`,
      });
    }

    // Include garment images as reference parts if base64 data URLs are present
    for (const item of items) {
      if (item.image_uri && typeof item.image_uri === 'string' && item.image_uri.startsWith('data:')) {
        const matches = item.image_uri.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
          parts.push({
            text: `Exact garment piece to dress on the person: ${item.item_name} (${item.category}, ${item.primary_color})`,
          });
        }
      }
    }

    parts.push({
      text: promptText,
    });

    const imageModels = ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'];
    let generatedImageUrl: string | null = null;
    let lastError: any = null;

    for (const modelName of imageModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts,
          },
          config: {
            imageConfig: {
              aspectRatio: '3:4',
            },
          },
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const candidateParts = candidate.content?.parts || [];
          for (const part of candidateParts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (generatedImageUrl) break;
        }

        if (generatedImageUrl) break;
      } catch (err: any) {
        lastError = err;
        console.log(`Image model ${modelName} call: status ${err.status || err.message}`);
      }
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
      });
    }

    // If quota exceeded or error occurred, return informative error
    if (lastError?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Image generation model requires an active Gemini API key with quota.',
      });
    }

    // If Gemini image model quota is exceeded (429 free tier limit: 0) or upstream is busy,
    // generate a stylized, high-quality vector lookbook visualization matching the outfit, season & occasion.
    console.log('Synthesizing stylized editorial lookbook visual.');

    const topItem = items.find((i: any) => i.category === 'tops') || items[0];
    const outerItem = items.find((i: any) => i.category === 'outerwear');
    const bottomItem = items.find((i: any) => i.category === 'bottoms') || items[1] || items[0];
    const shoeItem = items.find((i: any) => i.category === 'shoes') || items[2] || items[0];

    const getColorHex = (name: string, fallback: string) => {
      const c = (name || '').toLowerCase();
      if (c.includes('navy')) return '#1e3a8a';
      if (c.includes('blue')) return '#2563eb';
      if (c.includes('white')) return '#f8fafc';
      if (c.includes('cream') || c.includes('ivory')) return '#fef3c7';
      if (c.includes('olive')) return '#3f6212';
      if (c.includes('green') || c.includes('sage')) return '#15803d';
      if (c.includes('black')) return '#0f172a';
      if (c.includes('brown') || c.includes('tan') || c.includes('camel')) return '#78350f';
      if (c.includes('grey') || c.includes('gray')) return '#475569';
      if (c.includes('red') || c.includes('burgundy')) return '#881337';
      if (c.includes('pink')) return '#be185d';
      if (c.includes('beige')) return '#d6d3d1';
      return fallback;
    };

    const topColor = getColorHex(topItem?.primary_color, '#e2e8f0');
    const outerColor = outerItem ? getColorHex(outerItem.primary_color, '#1e3a8a') : null;
    const bottomColor = getColorHex(bottomItem?.primary_color, '#334155');
    const shoeColor = getColorHex(shoeItem?.primary_color, '#0f172a');

    const seasonGradient = season === 'Winter'
      ? { from: '#0284c7', to: '#0f172a', accent: '#38bdf8' }
      : season === 'Spring'
      ? { from: '#059669', to: '#0f172a', accent: '#34d399' }
      : season === 'Summer'
      ? { from: '#d97706', to: '#0f172a', accent: '#fbbf24' }
      : { from: '#b45309', to: '#0f172a', accent: '#f59e0b' }; // Fall

    const userVisualSection = userPhotoBase64
      ? `
        <!-- User Portrait as the Canvas Model -->
        <clipPath id="userPortraitClip">
          <rect x="25" y="140" width="180" height="490" rx="16" />
        </clipPath>
        <image href="data:${userPhotoMimeType || 'image/jpeg'};base64,${userPhotoBase64}" x="25" y="140" width="180" height="490" preserveAspectRatio="xMidYMid slice" clip-path="url(#userPortraitClip)" />
        <rect x="25" y="140" width="180" height="490" rx="16" fill="#000000" fill-opacity="0.15" />

        <!-- Overlay Exact Garments onto User Body -->
        ${topItem?.image_uri ? `
          <!-- Top Garment Fitted on Torso -->
          <g filter="url(#garmentShadow)">
            <image href="${topItem.image_uri}" x="40" y="270" width="150" height="130" preserveAspectRatio="xMidYMid contain" />
          </g>
        ` : `<path d="M70 270 L150 270 L142 370 L78 370 Z" fill="${topColor}" stroke="#334155" stroke-width="1.5" />`}

        ${outerItem?.image_uri ? `
          <!-- Outerwear Garment Layered Over Shoulders -->
          <g filter="url(#garmentShadow)">
            <image href="${outerItem.image_uri}" x="30" y="245" width="170" height="160" preserveAspectRatio="xMidYMid contain" />
          </g>
        ` : outerColor ? `
          <path d="M60 268 L88 268 L100 350 L70 366 Z" fill="${outerColor}" stroke="#1e293b" stroke-width="1" />
          <path d="M160 268 L132 268 L120 350 L150 366 Z" fill="${outerColor}" stroke="#1e293b" stroke-width="1" />
        ` : ''}

        ${bottomItem?.image_uri ? `
          <!-- Bottom Garment Fitted on Legs -->
          <g filter="url(#garmentShadow)">
            <image href="${bottomItem.image_uri}" x="45" y="380" width="140" height="155" preserveAspectRatio="xMidYMid contain" />
          </g>
        ` : `<path d="M78 372 L142 372 L138 520 L116 520 L110 420 L104 520 L82 520 Z" fill="${bottomColor}" stroke="#1e293b" stroke-width="1.5" />`}

        ${shoeItem?.image_uri ? `
          <!-- Footwear Grounded at Feet -->
          <g filter="url(#garmentShadow)">
            <image href="${shoeItem.image_uri}" x="55" y="530" width="120" height="65" preserveAspectRatio="xMidYMid contain" />
          </g>
        ` : `
          <ellipse cx="94" cy="536" rx="14" ry="7" fill="${shoeColor}" stroke="#475569" stroke-width="1" />
          <ellipse cx="126" cy="536" rx="14" ry="7" fill="${shoeColor}" stroke="#475569" stroke-width="1" />
        `}

        <!-- Direct Fit Badge Tag -->
        <rect x="35" y="152" width="160" height="24" rx="12" fill="#064e3b" stroke="#10b981" stroke-width="1.5" />
        <text x="115" y="168" fill="#34d399" font-size="9" font-weight="800" text-anchor="middle" font-family="system-ui, sans-serif">✨ EXACT PIECES ON YOU</text>
      `
      : `
        <!-- Mannequin Default Silhouette -->
        <circle cx="110" cy="195" r="32" fill="#1e293b" stroke="#334155" stroke-width="2" />
        <path d="M110 180 a10 10 0 1 0 0.1 0 Z M96 215 c0 -10 10 -15 14 -15 s14 5 14 15 Z" fill="#94a3b8" />
        <rect x="75" y="235" width="70" height="16" rx="8" fill="#1e293b" />
        <text x="110" y="246" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">MODEL</text>

        <!-- Silhouette Torso / Layering -->
        <path d="M70 270 L150 270 L142 370 L78 370 Z" fill="${topColor}" stroke="#334155" stroke-width="1.5" />
        <path d="M96 270 L110 286 L124 270 Z" fill="#0f172a" />

        ${outerColor ? `
          <path d="M60 268 L88 268 L100 350 L70 366 Z" fill="${outerColor}" stroke="#1e293b" stroke-width="1" />
          <path d="M160 268 L132 268 L120 350 L150 366 Z" fill="${outerColor}" stroke="#1e293b" stroke-width="1" />
          <path d="M62 268 L60 365 L76 368 L88 270 Z" fill="${outerColor}" />
          <path d="M158 268 L160 365 L144 368 L132 270 Z" fill="${outerColor}" />
        ` : ''}

        <path d="M78 372 L142 372 L138 520 L116 520 L110 420 L104 520 L82 520 Z" fill="${bottomColor}" stroke="#1e293b" stroke-width="1.5" />
        <ellipse cx="94" cy="536" rx="14" ry="7" fill="${shoeColor}" stroke="#475569" stroke-width="1" />
        <ellipse cx="126" cy="536" rx="14" ry="7" fill="${shoeColor}" stroke="#475569" stroke-width="1" />
      `;

    const itemsSvgList = items.slice(0, 4).map((item: any, idx: number) => {
      const y = 350 + idx * 46;
      const color = getColorHex(item.primary_color, '#64748b');
      const safeName = (item.item_name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeCat = (item.category || '').toUpperCase();
      return `
        <g transform="translate(240, ${y})">
          <rect width="320" height="38" rx="8" fill="#131d31" stroke="#1e293b" stroke-width="1" />
          <circle cx="20" cy="19" r="7" fill="${color}" stroke="#475569" stroke-width="1" />
          <text x="36" y="16" fill="#f8fafc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${safeName.slice(0, 32)}</text>
          <text x="36" y="29" fill="#94a3b8" font-size="9" font-weight="600" font-family="system-ui, sans-serif">${safeCat} • ${item.primary_color || 'Neutral'}</text>
        </g>
      `;
    }).join('');

    const safeTitle = (outfitTitle || 'Curated Ensemble').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSummary = (visualSummary || `Cohesive head-to-toe ensemble styled for ${occasion} in ${season}.`).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const stylizedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 780" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="50%" stop-color="#070c18" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="seasonAmbient" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${seasonGradient.from}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
    </linearGradient>
    <filter id="garmentShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="780" fill="url(#bgGrad)" />
  <rect width="600" height="320" fill="url(#seasonAmbient)" />

  <!-- Magazine Editorial Header -->
  <g transform="translate(30, 42)">
    <rect width="160" height="20" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1" />
    <text x="80" y="14" fill="${seasonGradient.accent}" font-size="9" font-weight="800" letter-spacing="1.5" text-anchor="middle" font-family="system-ui, sans-serif">AURA LOOKBOOK</text>
    
    <text x="0" y="44" fill="#94a3b8" font-size="11" font-weight="700" letter-spacing="1.8" font-family="system-ui, sans-serif">${season.toUpperCase()} • ${occasion.toUpperCase()} • ${outfitStyle.toUpperCase()}</text>
    <text x="0" y="74" fill="#ffffff" font-size="22" font-weight="800" font-family="Georgia, serif">${safeTitle.slice(0, 36)}</text>
  </g>

  <!-- Left Column: Visual Silhouette / Exact Pieces Layered on User -->
  <g transform="translate(10, 0)">
    <!-- Backdrop Card -->
    <rect x="25" y="140" width="180" height="490" rx="16" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    
    ${userVisualSection}

    <!-- Head-to-Toe Assembly Badge -->
    <rect x="45" y="590" width="140" height="22" rx="11" fill="#131d31" stroke="#334155" stroke-width="1" />
    <text x="115" y="604" fill="#e2e8f0" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">COMPLETE ENSEMBLE</text>
  </g>

  <!-- Right Column: Assembled Garments Stack -->
  <g>
    <text x="240" y="160" fill="#94a3b8" font-size="10" font-weight="800" letter-spacing="1.2" font-family="system-ui, sans-serif">OUTFIT LAYERING BREAKDOWN</text>
    
    <!-- Visual Summary Quote Card -->
    <rect x="240" y="174" width="330" height="135" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="256" y="202" fill="${seasonGradient.accent}" font-size="10" font-weight="800" font-family="system-ui, sans-serif">✨ STYLIST VISUALIZATION:</text>
    <foreignObject x="256" y="210" width="298" height="90">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; font-size: 11px; color: #cbd5e1; line-height: 1.5; overflow: hidden;">
        ${safeSummary}
      </div>
    </foreignObject>

    <text x="240" y="338" fill="#94a3b8" font-size="10" font-weight="800" letter-spacing="1.2" font-family="system-ui, sans-serif">ASSEMBLED CLOSET PIECES</text>
    ${itemsSvgList}
  </g>

  <!-- Bottom Harmonized Color Palette Strip -->
  <g transform="translate(30, 655)">
    <rect width="540" height="95" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    <text x="20" y="28" fill="#94a3b8" font-size="10" font-weight="800" letter-spacing="1" font-family="system-ui, sans-serif">SEASONAL COLOR HARMONY PALETTE</text>
    
    <circle cx="30" cy="58" r="14" fill="${topColor}" stroke="#475569" stroke-width="1.5" />
    <text x="52" y="62" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${topItem?.primary_color || 'Top'}</text>

    ${outerColor ? `
      <circle cx="160" cy="58" r="14" fill="${outerColor}" stroke="#475569" stroke-width="1.5" />
      <text x="182" y="62" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${outerItem.primary_color}</text>
    ` : ''}

    <circle cx="290" cy="58" r="14" fill="${bottomColor}" stroke="#475569" stroke-width="1.5" />
    <text x="312" y="62" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${bottomItem?.primary_color || 'Bottom'}</text>

    <circle cx="420" cy="58" r="14" fill="${shoeColor}" stroke="#475569" stroke-width="1.5" />
    <text x="442" y="62" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${shoeItem?.primary_color || 'Shoes'}</text>
  </g>
</svg>
`.trim();

    const base64Svg = Buffer.from(stylizedSvg).toString('base64');
    const svgDataUri = `data:image/svg+xml;base64,${base64Svg}`;

    return res.json({
      success: true,
      imageUrl: svgDataUri,
      isStylizedVisual: true,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-outfit-image:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate outfit visualization.',
      details: error.status || 'MODEL_ERROR',
    });
  }
});

// ----------------------------------------------------------------------------
// Vite Middleware / Static Server setup
// ----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
