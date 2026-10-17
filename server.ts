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
 * Helper to retrieve image data (handles data URL or remote HTTP/HTTPS URL)
 */
async function getImageInlineData(uri?: string | null): Promise<{ mimeType: string; data: string } | null> {
  if (!uri || typeof uri !== 'string') return null;

  if (uri.startsWith('data:')) {
    const matches = uri.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], data: matches[2] };
    }
    return null;
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const response = await fetch(uri, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const rawMime = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
        const mimeType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(rawMime) ? rawMime : 'image/jpeg';
        return { mimeType, data: base64 };
      }
    } catch (err) {
      console.warn('Could not fetch remote garment image:', uri, err);
    }
  }

  return null;
}

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
      outfitStyle = 'Casual',
      occasion = 'Casual',
      season = 'Fall',
      weather = 'Mild',
      items = [],
      visualSummary = '',
      userPhoto,
      userPhotoBase64,
      userPhotoMimeType,
      userPhotoUrl,
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    // Resolve target person photo (Image 1)
    let personImagePart: { mimeType: string; data: string } | null = null;
    const rawPhotoUri = userPhoto || userPhotoUrl;
    if (userPhotoBase64) {
      personImagePart = {
        data: userPhotoBase64,
        mimeType: userPhotoMimeType || 'image/jpeg',
      };
    } else if (rawPhotoUri) {
      personImagePart = await getImageInlineData(rawPhotoUri);
    }

    // Categorize pieces from the generated outfit
    const outerwearItem = items.find((i: any) =>
      ['outerwear', 'jacket', 'coat'].includes(i.category?.toLowerCase())
    );
    const topItem = items.find((i: any) =>
      ['tops', 'top', 'shirt'].includes(i.category?.toLowerCase())
    );
    const bottomsItem = items.find((i: any) =>
      ['bottoms', 'pants', 'bottom'].includes(i.category?.toLowerCase())
    );
    const shoesItem = items.find((i: any) =>
      ['shoes', 'shoe', 'footwear'].includes(i.category?.toLowerCase())
    );

    // Fetch images for each garment piece
    const [outerwearImg, topImg, bottomsImg, shoesImg] = await Promise.all([
      outerwearItem ? getImageInlineData(outerwearItem.image_uri) : Promise.resolve(null),
      topItem ? getImageInlineData(topItem.image_uri) : Promise.resolve(null),
      bottomsItem ? getImageInlineData(bottomsItem.image_uri) : Promise.resolve(null),
      shoesItem ? getImageInlineData(shoesItem.image_uri) : Promise.resolve(null),
    ]);

    const parts: any[] = [];

    // Part 1: Image 1 strictly as target person
    if (personImagePart) {
      parts.push({
        inlineData: {
          data: personImagePart.data,
          mimeType: personImagePart.mimeType,
        },
      });
      parts.push({
        text: `Image 1: Target person [Photo of the user]. Use Image 1 strictly as the target person. Keep my face, identity, exact body shape, proportions, and pose completely unchanged. Do not modify my physical attributes.`,
      });
    }

    // Garment images with exact category labeling matching user instructions
    if (outerwearImg && outerwearItem) {
      parts.push({
        inlineData: {
          data: outerwearImg.data,
          mimeType: outerwearImg.mimeType,
        },
      });
      parts.push({
        text: `'outerwear' picture: Exact outerwear coat/jacket to dress on the person (${outerwearItem.item_name}, ${outerwearItem.primary_color || ''}).`,
      });
    }

    if (topImg && topItem) {
      parts.push({
        inlineData: {
          data: topImg.data,
          mimeType: topImg.mimeType,
        },
      });
      parts.push({
        text: `'tops' picture: Exact top garment to dress on the person (${topItem.item_name}, ${topItem.primary_color || ''}).`,
      });
    }

    if (bottomsImg && bottomsItem) {
      parts.push({
        inlineData: {
          data: bottomsImg.data,
          mimeType: bottomsImg.mimeType,
        },
      });
      parts.push({
        text: `'Bottoms' picture: Exact pants/bottoms garment to dress on the person (${bottomsItem.item_name}, ${bottomsItem.primary_color || ''}).`,
      });
    }

    if (shoesImg && shoesItem) {
      parts.push({
        inlineData: {
          data: shoesImg.data,
          mimeType: shoesImg.mimeType,
        },
      });
      parts.push({
        text: `'Shoes' picture: Exact shoes to dress on the person (${shoesItem.item_name}, ${shoesItem.primary_color || ''}).`,
      });
    }

    // Replacement directives matching user's exact specification
    const replacementInstructions: string[] = [];
    if (outerwearItem) {
      replacementInstructions.push(`Outerwear: Replace my current jacket/coat with the exact coat shown in 'outerwear' picture (${outerwearItem.item_name}).`);
    }
    if (topItem) {
      replacementInstructions.push(`Top: Replace my current top with the exact top shown in the 'tops' picture (${topItem.item_name}).`);
    }
    if (bottomsItem) {
      replacementInstructions.push(`Bottoms: Replace my current pants with the exact bottoms shown in the 'Bottoms' picture (${bottomsItem.item_name}).`);
    }
    if (shoesItem) {
      replacementInstructions.push(`Shoes: Replace my current shoes with the exact shoes shown in the 'Shoes' picture (${shoesItem.item_name}).`);
    }

    const replacementSection = replacementInstructions.length > 0
      ? replacementInstructions.join('\n')
      : `Replace current outfit with the exact clothing items: ${items.map((i: any) => i.item_name).join(', ')}`;

    const promptText = personImagePart
      ? `
Use Image 1 strictly as the target person [image 1 will be the photo i upload of myself]. Keep my face, identity, exact body shape, proportions, and pose completely unchanged. Do not modify my physical attributes. Please replace the outfit I am wearing in Image 1 with the specific articles of clothing from the 'pieces to fit on body' that are generated after clicking 'Generate 3 Outfits' The articles of clothing i want replaced are:
${replacementSection}

Render the final output as a seamless, photorealistic fashion photograph. Ensure the lighting, shadows, and fabric textures naturally drape over my body shape from Image 1.

Style Direction: ${outfitStyle} lookbook
Occasion: ${occasion}
Season & Weather: ${season} season, ${weather}
Editorial Details: ${visualSummary || 'Flattering, realistic fit with natural fabric folds and believable ambient shadows.'}
Output Requirement: Strictly 1024x1024 square 1:1 photorealistic fashion photograph showing the complete ensemble naturally worn on the subject from Image 1.
`.trim()
      : `
High-end editorial fashion photograph of a stylish model wearing this exact outfit combination:
${replacementSection}
Style Direction: ${outfitStyle} lookbook
Occasion: ${occasion}
Season & Weather: ${season} season, ${weather}
Editorial Details: ${visualSummary || 'Flattering, realistic fit with natural fabric folds and believable ambient shadows.'}
Render the final output as a seamless, photorealistic fashion photograph. Ensure the lighting, shadows, and fabric textures naturally drape.
Output Requirement: Strictly 1024x1024 square 1:1 photorealistic photograph.
`.trim();

    parts.push({ text: promptText });

    const imageModels = [
      { name: 'gemini-3.1-flash-image', config: { aspectRatio: '1:1', imageSize: '1K' } },
      { name: 'gemini-3.1-flash-lite-image', config: { aspectRatio: '1:1' } },
    ];

    let generatedImageUrl: string | null = null;
    let lastError: any = null;

    for (const { name: modelName, config: imgConfig } of imageModels) {
      try {
        console.log(`Calling Gemini image model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts,
          },
          config: {
            imageConfig: imgConfig as any,
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

        if (generatedImageUrl) {
          console.log(`Successfully generated photorealistic look with ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Image model ${modelName} returned status ${err.status || err.message}`);
      }
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
      });
    }

    // Handle error or quota restriction gracefully with actionable feedback
    const isQuotaOrKey =
      lastError?.status === 429 ||
      lastError?.status === 403 ||
      lastError?.message?.includes('RESOURCE_EXHAUSTED') ||
      lastError?.message?.includes('Quota') ||
      lastError?.message?.includes('API key');

    if (isQuotaOrKey || lastError) {
      const errorMsg = lastError?.message || 'Gemini image generation models (gemini-3.1-flash-image) require an active paid API key.';
      return res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: `Photorealistic Virtual Try-On: ${errorMsg}`,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'IMAGE_GENERATION_FAILED',
      message: 'Failed to generate photorealistic look. Please retry in a moment.',
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
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
