// components/report-location-map.tsx
//
// WHAT: The interactive Leaflet map on the Report a Sighting form.
//
// TWO DIFFERENT POINTS (the reporter may not be standing at the tree):
//   - Device location: a blue dot with its GPS accuracy circle. Shown
//     only after the reporter presses "Use my current location".
//   - Tree location: a green pin. This is what the report sends. The
//     reporter places it by tapping the map or dragging the pin.
//
// NO INVENTED LOCATIONS: the map starts on an overview of Iligan City
//   with no pin. The overview is only a starting view, never a location.
//
// TILES: OpenStreetMap's standard tiles, with the attribution their
//   usage policy requires. Loaded only in the browser (see report-form).

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface DeviceFix extends MapPoint {
  accuracyM: number;
}

export interface FocusRequest extends MapPoint {
  zoom: number;
  /** Changes on every request, so the same place can be focused twice. */
  id: number;
}

interface ReportLocationMapProps {
  tree: MapPoint | null;
  device: DeviceFix | null;
  focus: FocusRequest | null;
  onPick: (point: MapPoint) => void;
}

// A starting view only: Iligan City, covering the three study areas.
const OVERVIEW_CENTER: L.LatLngExpression = [8.235, 124.255];
const OVERVIEW_ZOOM = 12;

// Larger accuracy circles would cover the whole map and say nothing useful.
const MAX_ACCURACY_CIRCLE_M = 2000;

const treeIcon = L.divIcon({
  className: "citia-tree-pin",
  html: `
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 1C8.2 1 1 8 1 16.8 1 28.6 17 43 17 43s16-14.4 16-26.2C33 8 25.8 1 17 1z"
            fill="#059669" stroke="#ffffff" stroke-width="2"/>
      <circle cx="17" cy="16.5" r="6.5" fill="#ffffff"/>
    </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

export function ReportLocationMap({ tree, device, focus, onPick }: ReportLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const treeMarkerRef = useRef<L.Marker | null>(null);
  const deviceLayerRef = useRef<L.LayerGroup | null>(null);

  // The latest callback, so map listeners never call a stale one.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: OVERVIEW_CENTER,
      zoom: OVERVIEW_ZOOM,
      zoomControl: true,
      // The page scrolls normally over the map; use the +/- buttons,
      // pinch or double-tap to zoom.
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });

    deviceLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // The map may be laid out after it is created (fonts, images).
    const resize = setTimeout(() => map.invalidateSize(), 0);

    return () => {
      clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      treeMarkerRef.current = null;
      deviceLayerRef.current = null;
    };
  }, []);

  // The tree pin: placed, moved or removed to match the form.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!tree) {
      treeMarkerRef.current?.remove();
      treeMarkerRef.current = null;
      return;
    }

    const position: L.LatLngExpression = [tree.latitude, tree.longitude];
    if (treeMarkerRef.current) {
      treeMarkerRef.current.setLatLng(position);
      return;
    }

    const marker = L.marker(position, {
      icon: treeIcon,
      draggable: true,
      keyboard: true,
      title: "Tree location",
      alt: "Tree location pin",
      zIndexOffset: 1000,
    }).addTo(map);
    marker.bindTooltip("Tree location", { direction: "top", offset: [0, -40] });
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onPickRef.current({ latitude: lat, longitude: lng });
    });
    treeMarkerRef.current = marker;
  }, [tree]);

  // The device dot and its accuracy circle.
  useEffect(() => {
    const layer = deviceLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!device) return;

    const position: L.LatLngExpression = [device.latitude, device.longitude];
    if (device.accuracyM <= MAX_ACCURACY_CIRCLE_M) {
      L.circle(position, {
        radius: device.accuracyM,
        color: "#2563eb",
        weight: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(layer);
    }
    L.circleMarker(position, {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#2563eb",
      fillOpacity: 1,
      interactive: true,
    })
      .bindTooltip("Your device", { direction: "bottom", offset: [0, 8] })
      .addTo(layer);
  }, [device]);

  // Moves the view when the form asks (GPS fix, search result, recenter).
  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.setView([focus.latitude, focus.longitude], focus.zoom);
  }, [focus]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map for marking the tree location. Tap the map or drag the green pin to set where the tree is."
      className="relative z-0 h-72 w-full overflow-hidden rounded-lg border border-border sm:h-80"
    />
  );
}
