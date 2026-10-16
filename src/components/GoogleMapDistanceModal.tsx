// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  APIProvider, 
  Map, 
  useMap, 
  useMapsLibrary 
} from "@vis.gl/react-google-maps";
import { 
  X, 
  MapPin, 
  Navigation, 
  ArrowRight, 
  ArrowLeftRight,
  Check, 
  Car, 
  Train, 
  Bike, 
  Footprints, 
  Search,
  RotateCcw,
  ExternalLink,
  Map as MapIcon
} from "lucide-react";
import { resolveRailwayPlace, POPULAR_RAILWAY_STATIONS } from "../utils/stationResolver";

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAGojLFvYL8PY_im6ZsFjy7NBqSfWbVMC4";

export interface RouteDetails {
  distanceMeters: number;
  durationMillis: number;
  formattedDistanceKm: number;
  originAddress?: string;
  destinationAddress?: string;
  travelModeName: string;
}

interface MapRouteRendererProps {
  origin: string;
  destination: string;
  travelMode: 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING';
  onRouteCalculated: (details: RouteDetails | null) => void;
  onError: (err: string | null) => void;
  onLoading: (loading: boolean) => void;
}

function MapRouteRenderer({
  origin,
  destination,
  travelMode,
  onRouteCalculated,
  onError,
  onLoading,
}: MapRouteRendererProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map) return;
    const currentMap = map;
    if (!origin.trim() || !destination.trim()) {
      onRouteCalculated(null);
      return;
    }

    // Cleanup previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onError(null);
    onLoading(true);

    const resolvedOrigin = resolveRailwayPlace(origin);
    const resolvedDest = resolveRailwayPlace(destination);

    const request = {
      origin: resolvedOrigin,
      destination: resolvedDest,
      travelMode: travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    (routesLib.Route as any)
      .computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        onLoading(false);
        if (!routes || routes.length === 0) {
          // If TRANSIT fails between stations where direct transit schedule isn't loaded in Maps API,
          // try fallback to DRIVING road route for distance approximation
          if (travelMode === 'TRANSIT') {
            return (routesLib.Route as any).computeRoutes({
              origin: resolvedOrigin,
              destination: resolvedDest,
              travelMode: 'DRIVING',
              fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
            }).then(({ routes: fallbackRoutes }: { routes: any[] }) => {
              if (!fallbackRoutes || fallbackRoutes.length === 0) {
                onError("No route found between these locations. Try entering full station name or city.");
                onRouteCalculated(null);
                return;
              }
              renderRoute(fallbackRoutes[0], resolvedOrigin, resolvedDest, 'Driving (Transit Fallback)');
            });
          }

          onError("No route found between these locations. Try entering city or full station name.");
          onRouteCalculated(null);
          return;
        }

        renderRoute(routes[0], resolvedOrigin, resolvedDest, travelMode);
      })
      .catch((err: any) => {
        onLoading(false);
        console.warn('Google Maps computeRoutes error:', err);
        const errStr = String(err?.message || err);
        if (errStr.includes("OverQuota") || errStr.includes("RESOURCE_EXHAUSTED")) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onError(err.message || "Failed to calculate route on Google Maps.");
        onRouteCalculated(null);
      });

    function renderRoute(primaryRoute: any, startAddr: string, endAddr: string, modeName: string) {
      // Draw polylines
      if (primaryRoute.createPolylines) {
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline: google.maps.Polyline) => {
          polyline.setOptions({
            strokeColor: '#f2a93b',
            strokeWeight: 6,
            strokeOpacity: 0.85,
          });
          polyline.setMap(currentMap);
        });
        polylinesRef.current = newPolylines;
      }

      // Auto-fit bounds
      if (primaryRoute.viewport) {
        currentMap.fitBounds(primaryRoute.viewport);
      }

      const distMeters = primaryRoute.distanceMeters ?? 0;
      const durMillis = primaryRoute.durationMillis ?? 0;
      const km = Math.round((distMeters / 1000) * 10) / 10;

      onRouteCalculated({
        distanceMeters: distMeters,
        durationMillis: durMillis,
        formattedDistanceKm: km,
        originAddress: startAddr,
        destinationAddress: endAddr,
        travelModeName: modeName,
      });
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destination, travelMode]);

  return null;
}

export interface GoogleMapDistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrom?: string;
  initialTo?: string;
  initialMode?: 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING';
  onApplyKm: (km: number) => void;
  contextTitle?: string;
}

export function GoogleMapDistanceModal({
  isOpen,
  onClose,
  initialFrom = "",
  initialTo = "",
  initialMode = "DRIVING",
  onApplyKm,
  contextTitle = "Distance Calculator",
}: GoogleMapDistanceModalProps) {
  const [fromLoc, setFromLoc] = useState(initialFrom);
  const [toLoc, setToLoc] = useState(initialTo);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING'>(initialMode);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFromLoc(initialFrom);
      setToLoc(initialTo);
      setTravelMode(initialMode);
      setRouteDetails(null);
      setErrorMsg(null);
    }
  }, [isOpen, initialFrom, initialTo, initialMode]);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = fromLoc;
    setFromLoc(toLoc);
    setToLoc(temp);
  };

  const handleApply = () => {
    if (routeDetails && routeDetails.formattedDistanceKm > 0) {
      onApplyKm(routeDetails.formattedDistanceKm);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-ink/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="relative w-full max-w-4xl rounded-3xl border border-line bg-coal shadow-paper overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-coal-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber/15 border border-amber/30 text-amber">
              <Navigation className="size-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-cream">
                Google Maps Distance & Route Finder
              </h3>
              <p className="font-mono text-[10px] text-mute uppercase tracking-wider">
                {contextTitle} • Verified Road & Railway KMs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold px-2 py-1 rounded bg-leaf/15 text-leaf border border-leaf/30 uppercase tracking-widest">
              LIVE API
            </span>
            <a
              href={
                fromLoc.trim() && toLoc.trim()
                  ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                      resolveRailwayPlace(fromLoc)
                    )}&destination=${encodeURIComponent(
                      resolveRailwayPlace(toLoc)
                    )}&travelmode=${travelMode === "TRANSIT" ? "transit" : travelMode === "WALKING" ? "walking" : travelMode === "TWO_WHEELER" ? "two_wheeler" : "driving"}`
                  : "https://www.google.com/maps"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-ink hover:bg-cream font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_-2px_rgba(242,169,59,0.3)] active:scale-95"
              title="Open Google Maps in a new browser tab"
            >
              <MapIcon className="size-3.5" />
              <span>Map</span>
              <ExternalLink className="size-3" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-mute hover:text-cream hover:bg-coal-3 border border-transparent hover:border-line transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-b border-line bg-coal space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            {/* From */}
            <div className="sm:col-span-5 relative">
              <label className="block font-mono text-[9px] uppercase tracking-wider text-mute mb-1">
                From (Station / Place / Workshop)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-signal" />
                <input
                  type="text"
                  className="field pl-9 py-1.5 uppercase font-mono text-xs"
                  placeholder="e.g. KGPW, KGP, HWH"
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="sm:col-span-2 flex justify-center pb-1">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2 rounded-xl border border-line bg-coal-2 text-mute hover:text-amber hover:border-amber/40 transition-colors cursor-pointer"
                title="Swap From and To"
              >
                <ArrowLeftRight className="size-3.5" />
              </button>
            </div>

            {/* To */}
            <div className="sm:col-span-5 relative">
              <label className="block font-mono text-[9px] uppercase tracking-wider text-mute mb-1">
                To (Station / Destination / Office)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-leaf" />
                <input
                  type="text"
                  className="field pl-9 py-1.5 uppercase font-mono text-xs"
                  placeholder="e.g. KGP Station, NBQ, NGP"
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Travel Mode Pills & Quick Station Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px]">
            {/* Mode selection */}
            <div className="flex items-center gap-1 bg-ink p-1 rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setTravelMode('TRANSIT')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  travelMode === 'TRANSIT' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
                }`}
                title="Railway / Train route distance"
              >
                <Train className="size-3" />
                <span>Train / Transit</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelMode('DRIVING')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  travelMode === 'DRIVING' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
                }`}
                title="Road / Taxi / Own Car distance"
              >
                <Car className="size-3" />
                <span>Road / Taxi</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelMode('TWO_WHEELER')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  travelMode === 'TWO_WHEELER' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
                }`}
                title="Auto-Rickshaw / Scooter"
              >
                <Bike className="size-3" />
                <span>Auto / 2W</span>
              </button>

              <button
                type="button"
                onClick={() => setTravelMode('WALKING')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  travelMode === 'WALKING' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
                }`}
                title="Walking / Porterage"
              >
                <Footprints className="size-3" />
                <span>Walk</span>
              </button>
            </div>

            {/* Quick Station Helpers */}
            <div className="hidden md:flex items-center gap-1 text-[9px] text-mute">
              <span className="text-amber">Quick Stations:</span>
              {['KGPW', 'KGP', 'SRC', 'HWH', 'TATA', 'NBQ', 'NDLS'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    if (!fromLoc) setFromLoc(code);
                    else if (!toLoc) setToLoc(code);
                    else setToLoc(code);
                  }}
                  className="px-1.5 py-0.5 rounded bg-coal-2 border border-line hover:border-amber/50 hover:text-cream cursor-pointer font-bold"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Interactive Map Area */}
        <div className="relative flex-1 min-h-[340px] bg-ink">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={{ lat: 22.345, lng: 87.32 }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="size-full min-h-[340px]"
            >
              <MapRouteRenderer
                origin={fromLoc}
                destination={toLoc}
                travelMode={travelMode}
                onRouteCalculated={setRouteDetails}
                onError={setErrorMsg}
                onLoading={setLoading}
              />
            </Map>
          </APIProvider>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-ink/90 border border-amber/40 text-cream px-4 py-2 rounded-xl shadow-paper flex items-center gap-2 font-mono text-xs z-10 backdrop-blur-sm">
              <div className="size-3.5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
              <span>Calculating route distance via Google Maps...</span>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="absolute top-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bg-signal/90 text-cream px-4 py-2.5 rounded-xl shadow-paper font-mono text-xs z-10 border border-signal text-center backdrop-blur-sm">
              {errorMsg}
            </div>
          )}

          {/* Distance Result Overlay Badge */}
          {routeDetails && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-coal/95 border border-amber/40 rounded-2xl p-4 shadow-paper backdrop-blur-md z-10 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-mute">
                    Computed Google Maps Distance
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-amber tabular-nums flex items-baseline gap-1.5">
                    <span>{routeDetails.formattedDistanceKm}</span>
                    <span className="text-xs text-cream font-normal">KMs</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-mute">
                  <div>Est. Duration</div>
                  <div className="text-cream font-bold">
                    {Math.round(routeDetails.durationMillis / 60000)} mins
                  </div>
                </div>
              </div>

              <div className="border-t border-line/60 pt-2 flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] text-mute truncate max-w-[200px]" title={`${routeDetails.originAddress} → ${routeDetails.destinationAddress}`}>
                  {routeDetails.originAddress?.split(',')[0]} → {routeDetails.destinationAddress?.split(',')[0]}
                </span>

                <button
                  type="button"
                  onClick={handleApply}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf text-ink font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-cream active:scale-95 transition-all cursor-pointer shrink-0 shadow-[0_0_12px_-2px_rgba(53,178,107,0.4)]"
                >
                  <Check className="size-3" strokeWidth={3} />
                  Apply {routeDetails.formattedDistanceKm} KMs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 bg-coal-2">
          <div className="flex items-center gap-2 font-mono text-[9.5px] text-mute">
            <span className="size-2 rounded-full bg-leaf animate-pulse" />
            <span>Google Maps Platform Routes API • Ready to apply KMs</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-line text-mute font-mono text-[10px] font-bold uppercase hover:text-cream cursor-pointer"
            >
              Cancel
            </button>
            {routeDetails && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-xl bg-amber text-ink font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-cream active:scale-95 transition-all cursor-pointer font-bold"
              >
                Insert {routeDetails.formattedDistanceKm} KMs
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
