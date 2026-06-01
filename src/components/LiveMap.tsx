import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    google?: any;
    __initLovableMap?: () => void;
  }
}

let mapsLoading: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Clé Google Maps manquante"));
    window.__initLovableMap = () => resolve();
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initLovableMap${channel ? `&channel=${channel}` : ""}`;
    s.onerror = () => reject(new Error("Échec chargement Google Maps"));
    document.head.appendChild(s);
  });
  return mapsLoading;
}

export type Coords = { lat: number; lng: number };

export function gmapsLink(c: Coords) {
  return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
}

export function LiveMap({
  coords,
  onCoordsChange,
  height = 220,
}: {
  coords: Coords | null;
  onCoordsChange?: (c: Coords) => void;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;
    loadGoogleMaps()
      .then(() => {
        if (!ref.current) return;
        const center = { lat: coords.lat, lng: coords.lng };
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center,
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
          });
          markerRef.current = new window.google.maps.Marker({
            position: center,
            map: mapRef.current,
            draggable: !!onCoordsChange,
          });
          if (onCoordsChange) {
            markerRef.current.addListener("dragend", (e: any) => {
              onCoordsChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            });
            mapRef.current.addListener("click", (e: any) => {
              const c = { lat: e.latLng.lat(), lng: e.latLng.lng() };
              markerRef.current.setPosition(c);
              onCoordsChange(c);
            });
          }
        } else {
          mapRef.current.setCenter(center);
          markerRef.current.setPosition(center);
        }
      })
      .catch((e) => setErr(e.message));
  }, [coords, onCoordsChange]);

  if (err) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        Carte indisponible : {err}
      </div>
    );
  }
  if (!coords) {
    return (
      <div
        className="rounded-xl border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        En attente de la position GPS…
      </div>
    );
  }
  return <div ref={ref} className="rounded-xl border border-border overflow-hidden" style={{ height }} />;
}

export function GpsCapture({
  coords,
  setCoords,
  height = 200,
}: {
  coords: Coords | null;
  setCoords: (c: Coords | null) => void;
  height?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const stopWatch = () => {
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  };

  const start = (watch: boolean) => {
    if (!navigator.geolocation) {
      setErr("Géolocalisation non supportée");
      return;
    }
    setErr(null);
    setBusy(true);
    if (watch) {
      stopWatch();
      watchRef.current = navigator.geolocation.watchPosition(
        (p) => {
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          setBusy(false);
        },
        (e) => {
          setErr(e.message);
          setBusy(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          setBusy(false);
        },
        (e) => {
          setErr(e.message);
          setBusy(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    }
  };

  useEffect(() => () => stopWatch(), []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => start(false)} disabled={busy} className="gap-1">
          <MapPin className="h-3 w-3" /> Ma position
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => start(true)} disabled={busy} className="gap-1">
          <Navigation className="h-3 w-3" /> Suivi temps réel
        </Button>
        {watchRef.current !== null && (
          <Button type="button" size="sm" variant="ghost" onClick={stopWatch}>
            Stop
          </Button>
        )}
      </div>
      {err && <div className="text-[11px] text-destructive">{err}</div>}
      {coords && (
        <div className="text-[11px] text-muted-foreground">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} ·{" "}
          <a className="underline" href={gmapsLink(coords)} target="_blank" rel="noreferrer">
            Ouvrir dans Google Maps
          </a>
        </div>
      )}
      <LiveMap coords={coords} onCoordsChange={setCoords} height={height} />
    </div>
  );
}
