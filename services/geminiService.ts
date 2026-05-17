
import { StoreInput, AnalysisResult } from "../types";

export class GeminiService {
  static async analyzeMarket(input: StoreInput): Promise<AnalysisResult> {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Strategic synthesis engine timed out or returned malformed data.");
    }

    return response.json();
  }
}
