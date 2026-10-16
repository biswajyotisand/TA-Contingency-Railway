// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from "react";
import { 
  APIProvider, 
  Map, 
  useMap, 
  useMapsLibrary 
} from "@vis.gl/react-google-maps";
import { 
  Navigation, 
  MapPin, 
  ArrowLeftRight, 
  Car, 
  Train, 
  Bike, 
  Footprints, 
  Check, 
  Plus,
  Sparkles,
  ExternalLink,
  Map as MapIcon
} from "lucide-react";
import { resolveRailwayPlace, POPULAR_RAILWAY_STATIONS } from "../utils/stationResolver";
import { CalcState, JourneyGroup, calcContingencyRowAmount } from "../lib/calc";

const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyAGojLFvYL8PY_im6ZsFjy7NBqSfWbVMC4";

interface Props {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
  patchGroup: (gid: string, p: Partial<JourneyGroup>) => void;
}

interface RouteDetails {
  distanceMeters: number;
  durationMillis: number;
  formattedDistanceKm: number;
  originAddress?: string;
  destinationAddress?: string;
  travelModeName: string;
}

function EmbeddedRouteRenderer({
  origin,
  destination,
  travelMode,
  onRouteCalculated,
  onError,
  onLoading,
}: {
  origin: string;
  destination: string;
  travelMode: 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING';
  onRouteCalculated: (d: RouteDetails | null) => void;
  onError: (err: string | null) => void;
  onLoading: (l: boolean) => void;
}) {
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
              drawRoute(fallbackRoutes[0], resolvedOrigin, resolvedDest, 'Driving (Transit Fallback)');
            });
          }

          onError("No route found. Try entering city or full railway station name.");
          onRouteCalculated(null);
          return;
        }

        drawRoute(routes[0], resolvedOrigin, resolvedDest, travelMode);
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

    function drawRoute(primaryRoute: any, startAddr: string, endAddr: string, modeName: string) {
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

export function GoogleMapTab({ s, patch, patchGroup }: Props) {
  const [fromLoc, setFromLoc] = useState(s.distHQ || "KGPW");
  const [toLoc, setToLoc] = useState("KGP Station");
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING'>('DRIVING');
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const handleSwap = () => {
    const temp = fromLoc;
    setFromLoc(toLoc);
    setToLoc(temp);
  };

  const addAsJourneyRow = () => {
    if (!routeDetails || routeDetails.formattedDistanceKm <= 0) return;
    const firstGroup = s.groups[0];
    if (!firstGroup) {
      const gid = crypto.randomUUID();
      patch({
        groups: [
          {
            id: gid,
            object: `Journey between ${fromLoc.toUpperCase()} and ${toLoc.toUpperCase()}`,
            rows: [
              {
                id: crypto.randomUUID(),
                date: s.claimMonth ? `${s.claimMonth}-01` : "",
                trainNo: "",
                depTime: "",
                arrTime: "",
                from: fromLoc.toUpperCase(),
                to: toLoc.toUpperCase(),
                kms: routeDetails.formattedDistanceKm,
                onPass: true,
                fare: 0,
              },
            ],
          },
        ],
      });
    } else {
      patchGroup(firstGroup.id, {
        rows: [
          ...firstGroup.rows,
          {
            id: crypto.randomUUID(),
            date: firstGroup.rows[firstGroup.rows.length - 1]?.date || "",
            trainNo: "",
            depTime: "",
            arrTime: "",
            from: fromLoc.toUpperCase(),
            to: toLoc.toUpperCase(),
            kms: routeDetails.formattedDistanceKm,
            onPass: true,
            fare: 0,
          },
        ],
      });
    }
    setAppliedMsg(`Added ${routeDetails.formattedDistanceKm} KMs to Journey Section!`);
    setTimeout(() => setAppliedMsg(null), 3000);
  };

  const addAsContingency = () => {
    if (!routeDetails || routeDetails.formattedDistanceKm <= 0) return;
    const items = s.contingency ?? [];
    const km = routeDetails.formattedDistanceKm;
    const rate = 15;
    const isReturn = false;
    const amt = calcContingencyRowAmount({ kms: km, rate, isReturn });
    patch({
      contingency: [
        ...items,
        {
          id: crypto.randomUUID(),
          date: s.claimMonth ? `${s.claimMonth}-01` : "",
          from: fromLoc,
          to: toLoc,
          isReturn,
          kms: km,
          rate,
          amount: amt,
        },
      ],
    });
    setAppliedMsg(`Added ${routeDetails.formattedDistanceKm} KMs (₹${amt.toFixed(2)}) to Contingency Bill!`);
    setTimeout(() => setAppliedMsg(null), 3000);
  };

  return (
    <div className="rounded-2xl border border-line bg-coal p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber/15 border border-amber/30 text-amber">
            <Navigation className="size-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-cream">
              Google Maps Route & KM Finder
            </h3>
            <p className="font-mono text-[9.5px] text-mute uppercase tracking-wider">
              Powered by Google Maps Platform Routes API
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-ink font-mono text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-cream active:scale-95 shadow-[0_0_12px_-2px_rgba(242,169,59,0.3)] cursor-pointer"
            title="Open route in Google Maps in a new browser tab"
          >
            <MapIcon className="size-3.5" />
            <span>Map</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Input controls */}
      <div className="p-3.5 rounded-xl border border-line bg-ink/60 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-5 relative">
            <label className="block font-mono text-[9px] uppercase tracking-wider text-mute mb-1">
              From (Station / Place)
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

          <div className="sm:col-span-2 flex justify-center pb-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-xl border border-line bg-coal text-mute hover:text-amber hover:border-amber/40 transition-colors cursor-pointer"
              title="Swap From and To"
            >
              <ArrowLeftRight className="size-3.5" />
            </button>
          </div>

          <div className="sm:col-span-5 relative">
            <label className="block font-mono text-[9px] uppercase tracking-wider text-mute mb-1">
              To (Station / Destination)
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

        {/* Mode pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px]">
          <div className="flex items-center gap-1 bg-coal p-1 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setTravelMode('TRANSIT')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                travelMode === 'TRANSIT' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
              }`}
            >
              <Train className="size-3" />
              <span>Train</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('DRIVING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                travelMode === 'DRIVING' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
              }`}
            >
              <Car className="size-3" />
              <span>Road/Taxi</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('TWO_WHEELER')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                travelMode === 'TWO_WHEELER' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
              }`}
            >
              <Bike className="size-3" />
              <span>Auto/2W</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('WALKING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                travelMode === 'WALKING' ? 'bg-amber text-ink font-bold' : 'text-mute hover:text-cream'
              }`}
            >
              <Footprints className="size-3" />
              <span>Walk</span>
            </button>
          </div>

          {/* Station quick pickers */}
          <div className="flex items-center gap-1 text-[9px] text-mute flex-wrap">
            <span className="text-amber">Quick:</span>
            {['KGPW', 'KGP', 'HWH', 'SRC', 'TATA', 'NBQ', 'NDLS'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (!fromLoc) setFromLoc(code);
                  else setToLoc(code);
                }}
                className="px-1.5 py-0.5 rounded bg-coal border border-line hover:border-amber/50 hover:text-cream cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded Live Map */}
      <div className="relative rounded-xl overflow-hidden border border-line bg-ink aspect-[16/10] min-h-[300px]">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: 22.345, lng: 87.32 }}
            defaultZoom={11}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="size-full min-h-[300px]"
          >
            <EmbeddedRouteRenderer
              origin={fromLoc}
              destination={toLoc}
              travelMode={travelMode}
              onRouteCalculated={setRouteDetails}
              onError={setErrorMsg}
              onLoading={setLoading}
            />
          </Map>
        </APIProvider>

        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-ink/90 border border-amber/40 text-cream px-3 py-1.5 rounded-xl shadow-paper flex items-center gap-2 font-mono text-xs z-10">
            <div className="size-3 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
            <span>Calculating Google Maps route...</span>
          </div>
        )}

        {errorMsg && (
          <div className="absolute top-3 inset-x-3 bg-signal/90 text-cream px-3 py-2 rounded-xl font-mono text-xs z-10 text-center border border-signal">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Route Result & Direct Actions */}
      {routeDetails && (
        <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-mute">
                Google Maps Computed Distance
              </div>
              <div className="font-mono text-2xl font-extrabold text-amber tabular-nums flex items-baseline gap-1.5">
                <span>{routeDetails.formattedDistanceKm}</span>
                <span className="text-xs text-cream font-normal">Kilometers</span>
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-mute">
              <div>Est. Duration</div>
              <div className="text-cream font-bold">
                {Math.round(routeDetails.durationMillis / 60000)} mins
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
            <span className="font-mono text-[9.5px] text-mute truncate max-w-[280px]">
              {routeDetails.originAddress?.split(',')[0]} → {routeDetails.destinationAddress?.split(',')[0]}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addAsJourneyRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-ink font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-cream transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_-2px_rgba(242,169,59,0.3)]"
              >
                <Plus className="size-3.5" />
                Add to Journeys
              </button>

              <button
                type="button"
                onClick={addAsContingency}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coal border border-line text-cream font-mono text-[10px] font-bold uppercase tracking-wider hover:border-amber/40 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="size-3.5" />
                Add to Contingency
              </button>
            </div>
          </div>
        </div>
      )}

      {appliedMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-leaf/20 border border-leaf/40 px-3 py-2 font-mono text-xs text-leaf font-bold">
          <Check className="size-4" />
          <span>{appliedMsg}</span>
        </div>
      )}
    </div>
  );
}
