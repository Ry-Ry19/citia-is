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
//
// LOOK:
//   - The tree pin is the site's green with a leaf mark, so it is never
//     mistaken for the blue "your device" dot.
//   - The map's colours are softened a little so the pin stands out,
//     and dimmed in the dark theme so the map does not glare.
//   - The zoom buttons, the "show all of Iligan" button, the scale and
//     the credit line use the site's own colours and are large enough
//     to press with a thumb. Their styles are written on the wrapper
//     below (MAP_CHROME), because Leaflet draws those parts itself and
//     they cannot be given class names directly.
//   - Until a pin is placed, a short hint sits on the map.

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

// The tree pin: the site's Canopy green with a white leaf inside. The
// colours are written out because the pin is drawn by Leaflet from this
// text, outside the reach of the theme, and must look the same on the
// map in both themes.
const treeIcon = L.divIcon({
  className: "citia-tree-pin",
  html: `
    <svg width="40" height="52" viewBox="0 0 40 52" aria-hidden="true">
      <ellipse cx="20" cy="49.5" rx="7" ry="2" fill="#000000" opacity="0.25"/>
      <path d="M20 1.5C9.8 1.5 1.5 9.6 1.5 19.8 1.5 33.4 20 50 20 50s18.5-16.6 18.5-30.2C38.5 9.6 30.2 1.5 20 1.5z"
            fill="#1f4d33" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M20 8.5c-5.2 4.2-7.8 8.4-7.8 12.4 0 4.3 3.4 7.6 7.8 7.6s7.8-3.3 7.8-7.6c0-4-2.6-8.2-7.8-12.4z"
            fill="#ffffff"/>
      <path d="M20 13v14" stroke="#1f4d33" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
  iconSize: [40, 52],
  iconAnchor: [20, 50],
});

// How Leaflet's own parts are styled. Each entry reads "inside this
// map, style that part". The "!" marks a rule as important so it wins
// over Leaflet's built-in stylesheet.
const MAP_CHROME = [
  // Softer map colours; dimmed in the dark theme.
  "[&_.leaflet-tile-pane]:[filter:saturate(0.82)]",
  "dark:[&_.leaflet-tile-pane]:[filter:saturate(0.7)_brightness(0.72)_contrast(1.08)]",
  // Buttons: zoom in, zoom out, show all of Iligan.
  "[&_.leaflet-bar]:overflow-hidden [&_.leaflet-bar]:rounded-lg! [&_.leaflet-bar]:border-0! [&_.leaflet-bar]:shadow-md!",
  "[&_.leaflet-bar_a]:flex! [&_.leaflet-bar_a]:h-11! [&_.leaflet-bar_a]:w-11! [&_.leaflet-bar_a]:items-center [&_.leaflet-bar_a]:justify-center",
  "[&_.leaflet-bar_a]:border-border! [&_.leaflet-bar_a]:bg-card! [&_.leaflet-bar_a]:text-xl! [&_.leaflet-bar_a]:text-foreground!",
  "[&_.leaflet-bar_a:hover]:bg-muted! [&_.leaflet-bar_a:focus-visible]:outline-2 [&_.leaflet-bar_a:focus-visible]:outline-ring",
  "[&_.leaflet-bar_a.leaflet-disabled]:text-muted-foreground!",
  // The distance scale and the credit line.
  "[&_.leaflet-control-scale-line]:border-foreground! [&_.leaflet-control-scale-line]:bg-card/85! [&_.leaflet-control-scale-line]:text-foreground!",
  "[&_.leaflet-control-attribution]:bg-card/90! [&_.leaflet-control-attribution]:text-muted-foreground! [&_.leaflet-control-attribution_a]:text-primary!",
  // Tooltips ("Tree location", "Your device").
  "[&_.leaflet-tooltip]:rounded-md! [&_.leaflet-tooltip]:border-border! [&_.leaflet-tooltip]:bg-card! [&_.leaflet-tooltip]:text-sm! [&_.leaflet-tooltip]:font-medium [&_.leaflet-tooltip]:text-foreground!",
  // The little arrow under a tooltip takes the same colour as the tooltip.
  "[&_.leaflet-tooltip-top]:before:border-t-card! [&_.leaflet-tooltip-bottom]:before:border-b-card!",
].join(" ");

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

    // A distance scale, in metres and kilometres.
    L.control.scale({ imperial: false, maxWidth: 120 }).addTo(map);

    // A button that returns to the overview of Iligan City. It sits
    // under the zoom buttons and is styled like them.
    const overviewControl = new L.Control({ position: "topleft" });
    overviewControl.onAdd = () => {
      const bar = L.DomUtil.create("div", "leaflet-bar");
      const button = L.DomUtil.create("a", "", bar);
      button.href = "#";
      button.title = "Show all of Iligan City";
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Show all of Iligan City");
      button.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"/></svg>';
      // A press on the button must not also count as a tap on the map,
      // which would move the tree pin.
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.preventDefault(event);
        map.setView(OVERVIEW_CENTER, OVERVIEW_ZOOM);
      });
      return bar;
    };
    overviewControl.addTo(map);

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
    marker.bindTooltip("Tree location", { direction: "top", offset: [0, -48] });
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
    <div className={`relative ${MAP_CHROME}`}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Map for marking the tree location. Tap the map or drag the green pin to set where the tree is."
        className="relative z-0 h-80 w-full overflow-hidden rounded-lg border border-border bg-surface-tint sm:h-[26rem]"
      />

      {/* A hint, shown until the tree pin is placed. It sits above the
          map but lets taps pass through to it. */}
      {!tree && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 z-10 max-w-[60%] rounded-md bg-card/95 px-3 py-1.5 text-sm font-medium text-foreground shadow-md"
        >
          Tap the map to place the tree pin
        </p>
      )}
    </div>
  );
}
