
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MapPin, Users, Sparkles, 
  Loader2, ExternalLink, LayoutGrid,
  CircleDollarSign, Building2,
  Globe, Home, Check, AlertCircle,
  Activity, ShoppingBag, Info, Compass, Target,
  History, X, ChevronRight, BarChart3, ArrowRightLeft,
  Trash2, PlusCircle, Maximize2, Menu, GraduationCap, Hotel, Landmark, Navigation, Search, Layers, Settings2, Box, RotateCcw, ChevronDown, 
  Coffee, Utensils, Zap, Briefcase, Pill, ShoppingCart, Ticket, Shirt, MoreHorizontal, IndianRupee, Hash, DollarSign, Euro, Banknote, LocateFixed,
  Clock, Flame, Play, Pause, Database, Link as LinkIcon
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { StoreInput, AnalysisResult, StoreCategory, PricingTier } from './types';
import { GeminiService } from './services/geminiService';
import { MetricCard } from './components/MetricCard';
import { RevenueChart } from './components/RevenueChart';
import { TrafficLandscape } from './components/TrafficLandscape';
import { CompetitionPanel } from './components/CompetitionPanel';

const CURRENCIES = [
  { code: 'INR', label: '₹ Indian Rupee', icon: IndianRupee },
  { code: 'USD', label: '$ US Dollar', icon: DollarSign },
  { code: 'EUR', label: '€ Euro', icon: Euro },
  { code: 'GBP', label: '£ British Pound', icon: Banknote },
  { code: 'AED', label: 'د.إ UAE Dirham', icon: Globe },
];

const SMART_ARCHETYPES = [
  { label: 'Artisanal Specialty Coffee House', category: 'Premium Cafe (e.g., Starbucks)' as StoreCategory, tier: 'Premium' as PricingTier, icon: Coffee },
  { label: 'Budget Neighborhood Tea Stall / Tapri', category: 'Quick Service Restaurant (QSR)' as StoreCategory, tier: 'Budget' as PricingTier, icon: Coffee },
  { label: 'Minimalist Budget Cafe', category: 'Premium Cafe (e.g., Starbucks)' as StoreCategory, tier: 'Budget' as PricingTier, icon: Coffee },
  { label: 'Mid-Tier Family Multi-Cuisine Restaurant', category: 'Fine Dining Restaurant' as StoreCategory, tier: 'Mid-Range' as PricingTier, icon: Utensils },
  { label: 'High-End Luxury Vegan Bistro', category: 'Fine Dining Restaurant' as StoreCategory, tier: 'Luxury' as PricingTier, icon: Utensils },
  { label: 'Discount Grocery Warehouse', category: 'Supermarket (e.g., Reliance Fresh / DMart)' as StoreCategory, tier: 'Budget' as PricingTier, icon: ShoppingCart },
  { label: 'Organic Premium Deli & Gourmet Store', category: 'Supermarket (e.g., Reliance Fresh / DMart)' as StoreCategory, tier: 'Premium' as PricingTier, icon: ShoppingCart },
  { label: 'Generic Local Pharmacy', category: 'Pharmacy / Wellness' as StoreCategory, tier: 'Mid-Range' as PricingTier, icon: Pill },
  { label: 'Premium Holistic Wellness Center', category: 'Pharmacy / Wellness' as StoreCategory, tier: 'Premium' as PricingTier, icon: Pill },
  { label: 'Artisanal Boutique Fashion Label', category: 'Luxury Fashion / Boutique' as StoreCategory, tier: 'Luxury' as PricingTier, icon: Shirt },
  { label: 'Corporate Tech Coworking Hub', category: 'Workspace / Coworking' as StoreCategory, tier: 'Premium' as PricingTier, icon: Briefcase },
  { label: 'Childrens Theme Park / Play Zone', category: 'Large Attraction (e.g., Zoo / Theme Park)' as StoreCategory, tier: 'Mid-Range' as PricingTier, icon: Ticket },
  { label: 'Fast Food Burger Joint', category: 'Quick Service Restaurant (QSR)' as StoreCategory, tier: 'Mid-Range' as PricingTier, icon: Zap },
];

const INITIAL_POS = { lat: 19.0596, lng: 72.8295 };

const App: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const searchTimeout = useRef<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  
  const [is3D, setIs3D] = useState(true);
  const [pitch, setPitch] = useState(60);
  const [bearing, setBearing] = useState(-20);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocality, setIsSearchingLocality] = useState(false);

  const [archetypeQuery, setArchetypeQuery] = useState('');
  const [showArchetypeSuggestions, setShowArchetypeSuggestions] = useState(false);

  // Heatmap & Time Scrubber State
  const [mapTime, setMapTime] = useState<number>(new Date().getHours());
  const [isAutoplay, setIsAutoplay] = useState(false);
  const autoplayRef = useRef<number | null>(null);
  
  const [input, setInput] = useState<StoreInput>({
    location: '',
    coordinates: { ...INITIAL_POS },
    category: 'Premium Cafe (e.g., Starbucks)',
    pricingTier: 'Mid-Range',
    skuCount: 50,
    currency: 'INR',
    length: 40,
    breadth: 50,
    floors: 1,
    heightPerFloor: 12,
    targetSegment: ['Gen-Z Trendsetters', 'Young Professionals'],
    extraDetails: {}
  });
  
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requestGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setLocationStatus('granted');
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationStatus(err.code === 1 ? 'denied' : 'error');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('error');
    }
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainer.current) return;
    (maplibregl as any).workerCount = 0;
    
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [INITIAL_POS.lng, INITIAL_POS.lat],
      zoom: 14,
      pitch: 60,
      bearing: -20,
      attributionControl: false,
    });

    mapInstance.on('load', () => {
      map.current = mapInstance;

      // 1. Add heatmap sources
      mapInstance.addSource('traffic-heatmap', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addSource('poi-density', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // 2. Add traffic heatmap layer
      mapInstance.addLayer({
        id: 'traffic-heat',
        type: 'heatmap',
        source: 'traffic-heatmap',
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, 1,
            18, 3
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(99, 102, 241, 0.2)',
            0.4, 'rgba(99, 102, 241, 0.5)',
            0.6, 'rgba(236, 72, 153, 0.7)',
            0.8, 'rgba(239, 68, 68, 0.9)',
            1, 'rgba(255, 255, 255, 1)'
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 2,
            18, 120
          ],
          'heatmap-opacity': 0.8
        }
      });

      // 3. Add 3D buildings layer
      const buildingsSource = mapInstance.getSource('openmaptiles') ? 'openmaptiles' : 
                             mapInstance.getSource('carto') ? 'carto' : null;

      if (buildingsSource) {
        mapInstance.addLayer({
          'id': '3d-buildings',
          'source': buildingsSource,
          'source-layer': 'building',
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#4f46e5',
            'fill-extrusion-height': ['get', 'render_height'],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.6
          }
        });
      }

      // 4. Add POI Density Heatmap layer after 3D buildings
      mapInstance.addLayer({
        id: 'poi-heat',
        type: 'heatmap',
        source: 'poi-density',
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, 1,
            18, 4
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(16, 185, 129, 0.2)', // Emerald
            0.4, 'rgba(16, 185, 129, 0.5)',
            0.6, 'rgba(245, 158, 11, 0.7)', // Amber
            0.8, 'rgba(245, 158, 11, 0.9)',
            1, 'rgba(255, 255, 255, 1)'
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 5,
            18, 80
          ],
          'heatmap-opacity': 0.6
        }
      });
    });

    mapInstance.on('rotate', () => setBearing(mapInstance.getBearing()));
    mapInstance.on('pitch', () => setPitch(mapInstance.getPitch()));
    
    return () => mapInstance?.remove();
  }, []);

  // Update Map Layers Data (Footfall & POIs)
  useEffect(() => {
    if (!map.current || !currentResult) return;

    // --- Update Footfall Heatmap ---
    const trafficSource = map.current.getSource('traffic-heatmap') as maplibregl.GeoJSONSource;
    if (trafficSource) {
      const trafficAtHour = currentResult.metrics.footfallEstimate.hourlyDistribution.find(d => d.hour === mapTime)?.traffic || 0;
      const maxTraffic = Math.max(...currentResult.metrics.footfallEstimate.hourlyDistribution.map(d => d.traffic));
      const globalIntensity = trafficAtHour / (maxTraffic || 1);

      const center = currentResult.originalInput.coordinates || INITIAL_POS;
      const trafficFeatures: any[] = [];
      
      const trafficHotspots = [
        { name: 'Transit Node', offset: { lat: 0.002, lng: -0.003 }, peakHours: [9, 18] },
        { name: 'Office District', offset: { lat: -0.002, lng: 0.004 }, peakHours: [12, 13, 14, 15] },
        { name: 'Residential Hub', offset: { lat: 0.003, lng: 0.002 }, peakHours: [19, 20, 21] }
      ];

      trafficHotspots.forEach(spot => {
        let localPeakIntensity = 0.2;
        if (spot.peakHours.includes(mapTime)) localPeakIntensity = 1.0;
        else if (spot.peakHours.some(h => Math.abs(h - mapTime) === 1)) localPeakIntensity = 0.6;

        const combinedIntensity = globalIntensity * localPeakIntensity;
        for (let i = 0; i < 20; i++) {
          const radius = 0.002 * Math.sqrt(Math.random());
          const angle = Math.random() * Math.PI * 2;
          trafficFeatures.push({
            type: 'Feature',
            properties: { weight: combinedIntensity * (0.5 + Math.random() * 0.5) },
            geometry: {
              type: 'Point',
              coordinates: [
                center.lng + spot.offset.lng + radius * Math.cos(angle) * 1.5,
                center.lat + spot.offset.lat + radius * Math.sin(angle)
              ]
            }
          });
        }
      });
      trafficSource.setData({ type: 'FeatureCollection', features: trafficFeatures });
    }

    // --- Update POI Density Heatmap ---
    const poiSource = map.current.getSource('poi-density') as maplibregl.GeoJSONSource;
    if (poiSource) {
      const center = currentResult.originalInput.coordinates || INITIAL_POS;
      const poiFeatures: any[] = [];
      const pois = currentResult.metrics.nearbyPOIs;

      // Helper to generate a cluster of points for a category
      const addPoiCluster = (count: number, weight: number, latOffset: number, lngOffset: number) => {
        for (let i = 0; i < Math.min(count * 5, 50); i++) {
          const radius = 0.004 * Math.sqrt(Math.random());
          const angle = Math.random() * Math.PI * 2;
          poiFeatures.push({
            type: 'Feature',
            properties: { weight: weight },
            geometry: {
              type: 'Point',
              coordinates: [
                center.lng + lngOffset + radius * Math.cos(angle),
                center.lat + latOffset + radius * Math.sin(angle)
              ]
            }
          });
        }
      };

      // Distribute clusters around the center
      addPoiCluster(pois.schools + pois.premiumSchools, 0.8, 0.003, -0.002); // Education Cluster
      addPoiCluster(pois.hotels.luxury + pois.hotels.midTier + pois.hotels.budget, 1.0, -0.004, 0.003); // Hospitality Cluster
      addPoiCluster(pois.placesOfWorship, 0.6, 0.001, 0.005); // Community Cluster

      poiSource.setData({ type: 'FeatureCollection', features: poiFeatures });
    }
  }, [currentResult, mapTime]);

  // Autoplay Logic
  useEffect(() => {
    if (isAutoplay) {
      autoplayRef.current = window.setInterval(() => {
        setMapTime(prev => (prev + 1) % 24);
      }, 800);
    } else {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    }
    return () => { if (autoplayRef.current) window.clearInterval(autoplayRef.current); };
  }, [isAutoplay]);

  const handleLocalityChange = (val: string) => {
    setInput(prev => ({ ...prev, location: val }));
    setShowSuggestions(true);
    if (val.trim().length > 1) {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
      setIsSearchingLocality(true);
      searchTimeout.current = window.setTimeout(async () => {
        try {
          const biasParams = userLocation ? `&lat=${userLocation.lat}&lon=${userLocation.lng}` : '';
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}${biasParams}&countrycodes=in&limit=10`);
          const data = await response.json();
          let results = data.map((item: any) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const distance = userLocation ? getDistance(userLocation.lat, userLocation.lng, lat, lng) : null;
            return {
              name: item.display_name,
              lat,
              lng,
              distance,
              isNear: distance !== null && distance < 20
            };
          });

          if (userLocation) {
            results = results.sort((a: any, b: any) => (a.distance || 99999) - (b.distance || 99999));
          }
          setSuggestions(results);
        } catch (err) {
          setSuggestions([]);
        } finally {
          setIsSearchingLocality(false);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const archetypeSuggestions = useMemo(() => {
    if (!archetypeQuery) return SMART_ARCHETYPES.slice(0, 5);
    return SMART_ARCHETYPES.filter(a => 
      a.label.toLowerCase().includes(archetypeQuery.toLowerCase())
    );
  }, [archetypeQuery]);

  const handleSelectLocality = (loc: any) => {
    setInput(p => ({ ...p, location: loc.name, coordinates: { lat: loc.lat, lng: loc.lng } }));
    setShowSuggestions(false);
    setIsPanelExpanded(false);
    if (map.current) map.current.flyTo({ center: [loc.lng, loc.lat], zoom: 15.8, duration: 2000 });
  };

  const handleSelectArchetype = (a: typeof SMART_ARCHETYPES[0]) => {
    setInput(p => ({ 
      ...p, 
      category: a.category, 
      pricingTier: a.tier,
      businessDescription: a.label
    }));
    setArchetypeQuery(a.label);
    setShowArchetypeSuggestions(false);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setIsPanelExpanded(false);
    try {
      const data = await GeminiService.analyzeMarket({
        ...input,
        businessDescription: input.businessDescription || archetypeQuery
      });
      const newResult: AnalysisResult = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        originalInput: { ...input }
      };
      setHistory(prev => [newResult, ...prev]);
      setCurrentResult(newResult);
      setCompareMode(false);
      setTimeout(() => scrollToResults(), 500);
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleComparisonItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
    if (currentResult?.id === id) setCurrentResult(null);
  };

  const resetCamera = () => {
    setPitch(60); setBearing(-20);
    if (map.current) { map.current.setPitch(60); map.current.setBearing(-20); }
  };
  const toggle3D = () => setIs3D(!is3D);
  const handlePitchChange = (val: number) => { setPitch(val); if (map.current) map.current.setPitch(val); };
  const handleBearingChange = (val: number) => { setBearing(val); if (map.current) map.current.setBearing(val); };

  const scrollToResults = () => {
    document.getElementById('results-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatCurrency = (val: number, currencyCode: string = 'INR') => {
    return new Intl.NumberFormat(undefined, { 
      style: 'currency', 
      currency: currencyCode, 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-900 overflow-hidden relative" onClick={() => { setShowSuggestions(false); setIsPanelExpanded(false); setShowArchetypeSuggestions(false); }}>
      <header className="h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between z-[60] flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200"><Sparkles size={18} /></div>
            <h1 className="font-black text-slate-900 tracking-tight text-xl">LocalityMind</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button onClick={() => setCompareMode(!compareMode)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${compareMode ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
              <ArrowRightLeft size={16} /> {compareMode ? 'Exit Comparison' : `Compare Synthesis (${selectedIds.length})`}
            </button>
          )}
          <button onClick={handleAnalyze} disabled={loading} className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />} Analyze
          </button>
        </div>
      </header>

      {sidebarOpen && <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[70]" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full w-96 bg-white shadow-2xl z-[80] transform transition-transform duration-500 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Synthesis Log</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {history.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => { setCurrentResult(item); setSidebarOpen(false); setCompareMode(false); }} 
                  className={`group relative p-5 rounded-[2rem] border transition-all cursor-pointer ${currentResult?.id === item.id ? 'bg-indigo-50/50 border-indigo-200' : 'border-slate-100 hover:bg-slate-50'}`}
                >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-black text-slate-900 truncate pr-16">{item.localityName}</h4>
                      <div className="flex items-center gap-1 opacity-100 group-hover:opacity-100 transition-opacity absolute top-4 right-4 z-20">
                         <button 
                           onClick={(e) => toggleComparisonItem(item.id, e)}
                           className={`p-2 rounded-xl transition-all ${selectedIds.includes(item.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-100'}`}
                           title="Add to Comparison"
                         >
                           {selectedIds.includes(item.id) ? <Check size={14} /> : <PlusCircle size={14} />}
                         </button>
                         <button 
                           onClick={(e) => deleteHistoryItem(item.id, e)}
                           className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 transition-all"
                           title="Delete Analysis"
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.originalInput.businessDescription || item.originalInput.category}</p>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-black">
                       <span className="text-indigo-600">{formatCurrency(item.revenueProjections?.monthly || 0, item.originalInput.currency)}/mo</span>
                       <span className="text-slate-300 uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}
            {history.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting spatial inputs</p>
              </div>
            )}
        </div>
      </aside>

      <main ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-white scroll-smooth">
        {compareMode ? (
          <div className="min-h-screen p-10 lg:p-24 bg-white animate-in fade-in slide-in-from-bottom-10 duration-700">
             <div className="flex items-end justify-between mb-16 border-b border-slate-100 pb-16">
                <div>
                   <h2 className="text-7xl font-black tracking-tighter text-slate-950 mb-4">Synthesis Matrix</h2>
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Side-by-side Revenue Correlation</p>
                </div>
                <button onClick={() => setCompareMode(false)} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-950"><X size={32}/></button>
             </div>
             
             <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                   <thead>
                      <tr className="bg-slate-50/50">
                         <th className="p-12 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 tracking-[0.3em]">Metric Node</th>
                         {history.filter(i => selectedIds.includes(i.id)).map(item => (
                            <th key={item.id} className="p-12 text-2xl font-black text-slate-950 border-b border-slate-100">
                               {item.localityName.split(',')[0]}
                               <div className="text-[10px] text-indigo-600 mt-2 uppercase tracking-widest">{item.originalInput.businessDescription || item.originalInput.category}</div>
                            </th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      <tr>
                         <td className="p-12 text-xs font-black uppercase text-slate-500 tracking-widest">Revenue/mo</td>
                         {history.filter(i => selectedIds.includes(i.id)).map(item => (
                            <td key={item.id} className="p-12 text-3xl font-black text-indigo-600">
                                {formatCurrency(item.revenueProjections?.monthly || 0, item.originalInput.currency)}
                            </td>
                         ))}
                      </tr>
                      <tr>
                         <td className="p-12 text-xs font-black uppercase text-slate-500 tracking-widest">Daily Traffic</td>
                         {history.filter(i => selectedIds.includes(i.id)).map(item => (
                            <td key={item.id} className="p-12 text-2xl font-black text-slate-900">{item.metrics.footfallEstimate.daily.toLocaleString()}</td>
                         ))}
                      </tr>
                      <tr>
                         <td className="p-12 text-xs font-black uppercase text-slate-500 tracking-widest">Economy Tier</td>
                         {history.filter(i => selectedIds.includes(i.id)).map(item => (
                            <td key={item.id} className="p-12 text-xl font-black text-slate-600">{item.demographics.socioeconomicTier}</td>
                         ))}
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <section className="relative w-full h-[calc(100vh-64px)] bg-slate-950 overflow-hidden flex-shrink-0">
              <div ref={mapContainer} className="w-full h-full" />
              
              <div className="absolute top-10 right-10 z-30 pointer-events-auto">
                 {currentResult && (
                   <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-2xl w-80 space-y-8 animate-in slide-in-from-right-10 duration-700">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Flame size={18} className="text-orange-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Spatial Layering</span>
                         </div>
                         <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Synthesis</div>
                      </div>
                      
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                               <Clock size={12} /> Recon Time
                            </span>
                            <span className="text-sm font-black text-indigo-400">{formatHour(mapTime)}</span>
                         </div>
                         
                         <div className="flex items-center gap-4">
                            <button 
                               onClick={() => setIsAutoplay(!isAutoplay)}
                               className={`p-4 rounded-2xl transition-all shadow-lg ${isAutoplay ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                               {isAutoplay ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <input 
                               type="range" min="0" max="23" value={mapTime} 
                               onChange={(e) => setMapTime(Number(e.target.value))}
                               className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                         </div>
                         
                         <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex justify-between text-[9px] font-black text-white/30 uppercase tracking-widest">
                               <span className="flex items-center gap-1"><Users size={10} className="text-indigo-400"/> Pedestrian Flow</span>
                               <span className="text-white">
                                 {Math.round((currentResult.metrics.footfallEstimate.hourlyDistribution.find(d => d.hour === mapTime)?.traffic || 0) / Math.max(...currentResult.metrics.footfallEstimate.hourlyDistribution.map(d => d.traffic)) * 100)}%
                               </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-red-500 transition-all duration-700" 
                                 style={{ width: `${(currentResult.metrics.footfallEstimate.hourlyDistribution.find(d => d.hour === mapTime)?.traffic || 0) / Math.max(...currentResult.metrics.footfallEstimate.hourlyDistribution.map(d => d.traffic)) * 100}%` }} 
                               />
                            </div>

                            <div className="flex justify-between text-[9px] font-black text-white/30 uppercase tracking-widest mt-2">
                               <span className="flex items-center gap-1"><MapPin size={10} className="text-emerald-400"/> POI Density</span>
                               <span className="text-emerald-400">High Resolution</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 w-[85%] animate-pulse" />
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="absolute bottom-12 right-12 z-30 pointer-events-auto">
                <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl space-y-6 w-64 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Spatial Matrix</span>
                    <button onClick={resetCamera} className="p-2 hover:bg-white/10 rounded-xl text-white/60 transition-all"><RotateCcw size={14} /></button>
                  </div>
                  <div className="space-y-4">
                    <button onClick={toggle3D} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border font-black text-[10px] uppercase tracking-widest ${is3D ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      <Box size={14} /> {is3D ? '3D Build-Out Active' : 'Engage 3D View'}
                    </button>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black text-white/30 uppercase tracking-widest"><span>Tilt</span><span className="text-indigo-400">{Math.round(pitch)}°</span></div>
                      <input type="range" min="0" max="85" value={pitch} onChange={(e) => handlePitchChange(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-y-0 left-0 z-40 w-full max-w-5xl p-10 flex flex-col justify-center pointer-events-none">
                <div className={`pointer-events-auto bg-slate-950/80 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/10 shadow-2xl space-y-10 text-white transition-all duration-700 ease-in-out overflow-hidden ${isPanelExpanded ? 'w-[800px]' : 'w-[550px]'}`}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3">
                      <Target size={14} className="text-indigo-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Site Recon Panel</h3>
                      {locationStatus === 'granted' && (
                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 border border-emerald-500/30">
                          <LocateFixed size={10} className="animate-pulse" /> Location Active
                        </div>
                      )}
                    </div>
                    {(isSearchingLocality || loading) && <Loader2 size={16} className="animate-spin text-indigo-400" />}
                  </div>

                  <div className="space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
                    <div className="relative">
                      <label className="block text-[10px] font-black text-white/30 mb-4 uppercase tracking-[0.2em] flex items-center justify-between">
                        Target Locality
                        {locationStatus === 'granted' && <span className="text-[8px] text-indigo-400 font-bold tracking-widest">NEARBY BIASING ENABLED</span>}
                      </label>
                      <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                        <input 
                          type="text" 
                          value={input.location} 
                          onChange={(e) => handleLocalityChange(e.target.value)}
                          onFocus={() => { setIsPanelExpanded(true); if (input.location.length > 1) setShowSuggestions(true); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-16 pr-6 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all"
                          placeholder="Search for a locality (e.g. Bandra, Surat)..."
                        />
                      </div>
                      {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-50">
                          <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-2">Refined Spatial Suggestions</p>
                            {suggestions.map((loc, i) => (
                              <button key={i} onClick={(e) => { e.stopPropagation(); handleSelectLocality(loc); }} className="w-full text-left p-5 rounded-3xl flex items-center gap-5 transition-all hover:bg-indigo-600/20 text-white/40 hover:text-white group">
                                <MapPin size={14} className="group-hover:text-indigo-400" />
                                <div className="flex-1 overflow-hidden">
                                  <span className="text-xs font-black block truncate">{loc.name}</span>
                                  {loc.isNear && (
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1 block">
                                      Near You • {(loc.distance).toFixed(1)} km
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-black text-white/30 mb-4 uppercase tracking-[0.2em]">Business Model Archetype (Long-tail)</label>
                      <div className="relative group">
                        <ShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                        <input 
                          type="text" 
                          value={archetypeQuery} 
                          onChange={(e) => { setArchetypeQuery(e.target.value); setShowArchetypeSuggestions(true); }}
                          onFocus={() => { setIsPanelExpanded(true); setShowArchetypeSuggestions(true); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-16 pr-6 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all"
                          placeholder="Describe your model (e.g. Organic Budget Cafe)..."
                        />
                      </div>
                      {showArchetypeSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-50">
                          <div className="p-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-2">Smart Match Suggestions</p>
                            {archetypeSuggestions.map((a, i) => (
                              <button key={i} onClick={(e) => { e.stopPropagation(); handleSelectArchetype(a); }} className="w-full text-left p-5 rounded-3xl flex items-center gap-5 transition-all hover:bg-indigo-600 text-white/50 hover:text-white group">
                                <a.icon size={16} className="text-white/20 group-hover:text-white/50" />
                                <div className="flex-1">
                                  <span className="text-xs font-black block truncate">{a.label}</span>
                                  <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{a.category} • {a.tier}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8 bg-white/5 p-8 rounded-[3rem] border border-white/5">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">Target Pricing Matrix</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['Budget', 'Mid-Range', 'Premium', 'Luxury'] as PricingTier[]).map(t => (
                              <button 
                                key={t}
                                onClick={(e) => { e.stopPropagation(); setInput(p => ({ ...p, pricingTier: t })); }}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${input.pricingTier === t ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">Base Currency</label>
                          <select 
                            value={input.currency}
                            onChange={(e) => setInput(p => ({ ...p, currency: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xs font-black text-white outline-none focus:bg-white/10 transition-all appearance-none cursor-pointer"
                          >
                            {CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-slate-900">{c.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><Hash size={12} className="text-indigo-400" /> Inventory Scale (Items)</label>
                          <span className="text-xs font-black text-indigo-400">{input.skuCount} SKUs</span>
                        </div>
                        <input 
                          type="range" min="1" max="2000" step="10" value={input.skuCount} 
                          onChange={(e) => setInput(p => ({ ...p, skuCount: Number(e.target.value) }))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/5">
                         <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Width (ft)</label>
                            <input type="number" value={input.length} onChange={(e) => setInput(p => ({...p, length: Number(e.target.value)}))} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm font-black text-white outline-none" />
                         </div>
                         <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Depth (ft)</label>
                            <input type="number" value={input.breadth} onChange={(e) => setInput(p => ({...p, breadth: Number(e.target.value)}))} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm font-black text-white outline-none" />
                         </div>
                         <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Floors</label>
                            <input type="number" min="1" max="10" value={input.floors} onChange={(e) => setInput(p => ({...p, floors: Number(e.target.value)}))} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm font-black text-white outline-none" />
                         </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleAnalyze} 
                      disabled={loading || !input.location}
                      className="w-full bg-indigo-600 text-white py-7 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.6em] hover:bg-indigo-700 transition-all shadow-2xl active:scale-[0.98]"
                    >
                      {loading ? 'Synthesizing Intelligence...' : 'Generate High-Fidelity Report'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto">
                <button 
                  onClick={scrollToResults}
                  className={`flex flex-col items-center gap-2 transition-all duration-700 ${currentResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                >
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] mb-2">Synthesis Synchronized</span>
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all animate-bounce shadow-2xl"><ChevronDown size={24} /></div>
                </button>
              </div>
            </section>

            <div id="results-view" className="bg-white min-h-screen relative z-30 shadow-[0_-40px_100px_rgba(0,0,0,0.1)] rounded-t-[5rem]">
              <div className="p-10 lg:p-24 space-y-32">
                {currentResult ? (
                  <div className="space-y-32 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                    <div className="flex flex-col lg:flex-row gap-16 items-end justify-between border-b border-slate-100 pb-24">
                       <div className="space-y-8 max-w-4xl">
                          <div className="flex items-center gap-4">
                            <span className="px-6 py-2.5 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-[0.4em]">Strategic Synthesis Complete</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{currentResult.originalInput.pricingTier} Tier • {currentResult.originalInput.currency}</span>
                          </div>
                          <h2 className="text-[10rem] font-black tracking-tighter text-slate-950 leading-[0.75] mb-8">{currentResult.localityName.split(',')[0]}</h2>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                      <MetricCard title="Footfall Velocity" value={currentResult.metrics.footfallEstimate.daily.toLocaleString()} Icon={Users} subtitle="Daily Visitors" />
                      <MetricCard title="Affluence Proxy" value={formatCurrency(currentResult.demographics.perCapitaIncome, currentResult.originalInput.currency)} Icon={CircleDollarSign} subtitle={currentResult.demographics.socioeconomicTier} />
                      <MetricCard title="Built Density" value={currentResult.demographics.populationDensity} Icon={Building2} subtitle="Built Form" />
                      <MetricCard title="Rival Count" value={currentResult.metrics.storeCompetition.length} Icon={ShoppingBag} subtitle="Active Rivals" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
                      <RevenueChart projections={currentResult.revenueProjections} />
                      <TrafficLandscape data={currentResult.metrics.footfallEstimate.hourlyDistribution} />
                    </div>

                    <div className="w-full">
                      <CompetitionPanel competition={currentResult.metrics.storeCompetition} />
                    </div>

                    {/* Grounding Sources Section */}
                    {currentResult.groundingSources && currentResult.groundingSources.length > 0 && (
                      <div className="bg-slate-50 p-16 lg:p-24 rounded-[4rem] border border-slate-100">
                        <div className="flex items-center gap-3 mb-10">
                           <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                             <Database size={16} />
                           </div>
                           <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Research Provenance</h3>
                        </div>
                        <p className="text-slate-900 text-3xl font-black tracking-tight leading-tight mb-4">Spatial Verification Nodes</p>
                        <p className="text-slate-500 text-sm font-medium mb-12 max-w-2xl">
                          Data synthesized from cross-referenced geospatial databases, local municipal records, and real-time mapping services.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {currentResult.groundingSources.map((source, idx) => (
                             <a 
                               key={idx} 
                               href={source.uri} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="group p-8 bg-white rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all flex flex-col justify-between gap-6 hover:shadow-xl hover:-translate-y-1"
                             >
                               <div className="flex justify-between items-start">
                                 <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-colors">
                                   <Globe size={18} />
                                 </div>
                                 <ExternalLink size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                               </div>
                               <div>
                                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Grounding Node {idx + 1}</p>
                                 <h5 className="text-sm font-black text-slate-900 line-clamp-2">{source.title}</h5>
                               </div>
                               <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                 <LinkIcon size={12} /> Visit Authority
                               </div>
                             </a>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-20 opacity-30">
                    <Activity size={100} className="text-indigo-600 mb-8" />
                    <h3 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Locality Processor Idle</h3>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-[0.5em]">Calibrate recon panel to initiate synthesis</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
