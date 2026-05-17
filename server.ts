import express from 'express';
import path from 'path';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Security headers to allow embedding in Notion and other iframes
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  // Helper to extract text from Gemini response
  function extractText(response: GenerateContentResponse): string {
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) return "";
    
    return candidate.content.parts
      .filter(part => part.text)
      .map(part => part.text)
      .join("");
  }

  // API Route for Gemini integration
  app.post('/api/analyze', async (req, res) => {
    try {
      const input = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const storeFootprint = input.length * input.breadth;
      const totalArea = storeFootprint * input.floors;
      
      // 1. Spatial Reconnaissance
      const mapsResponse = await ai.models.generateContent({
        model: "gemini-3.0-flash",
        contents: `Perform a high-fidelity site reconnaissance for ${input.location}. 
        Context: User wants to open a ${input.pricingTier} tier ${input.category} 
        described as "${input.businessDescription || 'Standard store'}".
        Currency: ${input.currency}
        Identify:
        - Specific transit hubs, office clusters, or high-income residential blocks within 1km.
        - Direct and indirect competitor density for this specific archetype.
        - Estimated pedestrian traffic flow during peak and off-peak hours.
        - Socioeconomic per capita income proxies for the immediate 2km radius in ${input.currency}.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const mapsText = extractText(mapsResponse);
      const mapsSources = (mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || 'Web Node',
          uri: chunk.web?.uri || ''
        }));

      // 2. High-Fidelity Synthesis
      const proResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro",
        contents: `Generate a surgical-precision market feasibility report.
        LOCATION: ${input.location}
        ENTITY DESCRIPTION: ${input.businessDescription || input.category}
        PRICING STRATEGY: ${input.pricingTier}
        INVENTORY SCALE: ${input.skuCount} items
        CURRENCY: ${input.currency}
        SITE ARCHITECTURE: ${input.floors} levels, ${totalArea} total sq ft.
        
        CONTEXTUAL DATA (Spatial Analysis):
        ${mapsText}
        
        FEASIBILITY LOGIC:
        - Convert local traffic to revenue using the ${input.pricingTier} tier pricing model.
        - All financial projections must be in ${input.currency}.
        - Factor in efficiency per level for a ${input.floors}-story building in this specific micro-market.
        
        Respond in JSON:
        {
          "localityName": string,
          "demographics": { "perCapitaIncome": number, "socioeconomicTier": "High" | "Upper-Mid" | "Mid" | "Lower-Mid" | "Economic", "dominantCarTypes": string[], "populationDensity": string, "residentType": "Residential" | "Corporate" | "Tourist" | "Mixed" },
          "metrics": { 
            "footfallEstimate": { 
              "hourly": number, "daily": number, "peakTimes": string[],
              "hourlyDistribution": [ { "hour": number, "traffic": number } ]
            },
            "nearbyPOIs": { "schools": number, "premiumSchools": number, "placesOfWorship": number, "hotels": { "luxury": number, "midTier": number, "budget": number } },
            "tourismProfile": string,
            "spatialHotspots": [ { "name": string, "offset": { "lat": number, "lng": number }, "peakHours": [number] } ],
            "storeCompetition": [ { "type": string, "avgPricePoint": string, "count": number, "description": string } ]
          },
          "revenueProjections": { "monthly": number, "quarterly": number, "yearly": number, "currency": "${input.currency}" },
          "strategicAdvice": string[]
        }`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
        },
      });

      const proText = extractText(proResponse);

      let result;
      try {
        result = JSON.parse(proText);
        if (!result || !result.metrics || !result.metrics.footfallEstimate || !result.metrics.footfallEstimate.hourlyDistribution) {
          throw new Error("Incomplete synthesis data structure.");
        }
      } catch (parseErr: any) {
        throw new Error("Failed to parse strategic synthesis. The AI might have returned incomplete data. Try again.");
      }

      res.json({
        ...result,
        groundingSources: mapsSources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i)
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Strategic synthesis engine timed out or returned malformed data." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: Use absolute path mapping to standard distribution
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
