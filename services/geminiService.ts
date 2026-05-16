
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { StoreInput, AnalysisResult } from "../types";

export class GeminiService {
  private static getAi() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Safely extracts text parts from a response to avoid warnings about 
   * non-text modalities like 'thoughtSignature' in Gemini 3 models.
   */
  private static extractText(response: GenerateContentResponse): string {
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) return "";
    
    return candidate.content.parts
      .filter(part => part.text)
      .map(part => part.text)
      .join("");
  }

  static async analyzeMarket(input: StoreInput): Promise<AnalysisResult> {
    const ai = this.getAi();
    const storeFootprint = input.length * input.breadth;
    const totalArea = storeFootprint * input.floors;
    
    // 1. Spatial Reconnaissance
    const mapsResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const mapsText = this.extractText(mapsResponse);
    const mapsSources = (mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter(chunk => chunk.web || chunk.maps)
      .map(chunk => ({
        title: (chunk.web?.title || chunk.maps?.title || 'Map Node'),
        uri: (chunk.web?.uri || chunk.maps?.uri || '')
      }));

    // 2. High-Fidelity Synthesis
    const proResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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

    const proText = this.extractText(proResponse);

    try {
      const result: AnalysisResult = JSON.parse(proText || "{}");
      return {
        ...result,
        groundingSources: mapsSources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i)
      };
    } catch (e) {
      throw new Error("Strategic synthesis engine timed out or returned malformed data.");
    }
  }
}
