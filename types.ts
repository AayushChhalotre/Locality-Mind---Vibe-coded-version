
export interface RevenueProjections {
  monthly: number;
  quarterly: number;
  yearly: number;
  currency: string;
}

export interface AreaDemographics {
  perCapitaIncome: number;
  socioeconomicTier: 'High' | 'Upper-Mid' | 'Mid' | 'Lower-Mid' | 'Economic';
  dominantCarTypes: string[];
  populationDensity: string;
  residentType: 'Residential' | 'Corporate' | 'Tourist' | 'Mixed';
}

export interface LocalityMetrics {
  footfallEstimate: {
    hourly: number;
    daily: number;
    peakTimes: string[];
    hourlyDistribution: { hour: number; traffic: number }[];
  };
  nearbyPOIs: {
    schools: number;
    premiumSchools: number;
    placesOfWorship: number;
    hotels: {
      luxury: number;
      midTier: number;
      budget: number;
    };
  };
  tourismProfile: string;
  storeCompetition: {
    type: string;
    avgPricePoint: string;
    count: number;
    description: string;
  }[];
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  localityName: string;
  demographics: AreaDemographics;
  metrics: LocalityMetrics;
  revenueProjections: RevenueProjections;
  strategicAdvice: string[];
  groundingSources: { title: string; uri: string }[];
  originalInput: StoreInput; 
}

export type PricingTier = 'Budget' | 'Mid-Range' | 'Premium' | 'Luxury';

export type StoreCategory = 
  | 'Premium Cafe (e.g., Starbucks)' 
  | 'Large Attraction (e.g., Zoo / Theme Park)' 
  | 'Supermarket (e.g., Reliance Fresh / DMart)' 
  | 'Luxury Fashion / Boutique' 
  | 'Pharmacy / Wellness' 
  | 'Fine Dining Restaurant' 
  | 'Workspace / Coworking' 
  | 'Quick Service Restaurant (QSR)'
  | 'Custom / Other';

export interface StoreInput {
  location: string;
  coordinates?: { lat: number; lng: number };
  category: StoreCategory;
  businessName?: string;
  businessDescription?: string; // Long-tail description
  pricingTier: PricingTier;
  skuCount: number; // Scale indicator
  avgOrderValue?: number;
  currency: string; // Dynamic currency support
  length: number; 
  breadth: number; 
  floors: number;
  heightPerFloor: number; 
  targetSegment: string[];
  extraDetails?: Record<string, string | boolean>;
}
