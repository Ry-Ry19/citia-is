// components/admin/monitoring-map.tsx
//
// WHAT: The Leaflet map on the Environmental Monitoring page. It plots
//   every sighting report that has coordinates.
//
// HOW IT STAYS IN STEP WITH THE LIST:
//   - Clicking a pin tells the page which report is selected
//     (onSelectReport). The page then highlights that report in the list
//     and in the preview panel.
//   - When the page selects a report (from the list), the map flies to
//     its pin, opens its popup and gives the pin a pulsing halo.
//   - The page passes in only the reports that match its filters, so
//     changing a filter changes the pins as well as the list.
//
// TILES: OpenStreetMap's standard tiles. They need no API key, and the
//   credit line their usage policy requires is shown. In the dark theme
//   the tiles are dimmed so the map does not glare.
//
// COLOURS: pins, popups, buttons and the legend use the site's theme
//   colours (success / warning / destructive), never fixed colour codes.
//   Leaflet draws its own controls and popups, so those are styled from
//   the wrapper below (MAP_CHROME).

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AdminReport, ReportStatus } from "@/lib/admin-reports";

interface MonitoringMapProps {
  reports: AdminReport[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  selectedArea: string;
}

const STUDY_AREA_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "Palao Medical": { lat: 8.2215, lng: 124.2482, zoom: 15 },
  Dalipuga: { lat: 8.3185, lng: 124.2611, zoom: 15 },
  "NPC Area": { lat: 8.2095, lng: 124.2815, zoom: 15 },
  "All Study Areas": { lat: 8.262, lng: 124.262, zoom: 12 },
};

/** How each review status is drawn: its colour classes and its symbol. */
const STATUS_STYLE: Record<ReportStatus, { pin: string; symbol: string; label: string }> = {
  Verified: { pin: "bg-success text-background", symbol: "✓", label: "Verified" },
  Pending: { pin: "bg-warning text-black", symbol: "!", label: "Pending review" },
  Rejected: { pin: "bg-destructive text-white", symbol: "✕", label: "Rejected" },
};

// Styles for the parts Leaflet draws itself. Each entry reads "inside
// this map, style that part". The "!" makes a rule win over Leaflet's
// built-in stylesheet.
const MAP_CHROME = [
  "[&_.leaflet-tile-pane]:[filter:saturate(0.82)]",
  "dark:[&_.leaflet-tile-pane]:[filter:saturate(0.7)_brightness(0.72)_contrast(1.08)]",
  "[&_.leaflet-bar]:overflow-hidden [&_.leaflet-bar]:rounded-lg! [&_.leaflet-bar]:border-0! [&_.leaflet-bar]:shadow-md!",
  "[&_.leaflet-bar_a]:flex! [&_.leaflet-bar_a]:h-10! [&_.leaflet-bar_a]:w-10! [&_.leaflet-bar_a]:items-center [&_.leaflet-bar_a]:justify-center",
  "[&_.leaflet-bar_a]:border-border! [&_.leaflet-bar_a]:bg-card! [&_.leaflet-bar_a]:text-xl! [&_.leaflet-bar_a]:text-foreground!",
  "[&_.leaflet-bar_a:hover]:bg-muted!",
  "[&_.leaflet-control-scale-line]:border-foreground! [&_.leaflet-control-scale-line]:bg-card/85! [&_.leaflet-control-scale-line]:text-foreground!",
  "[&_.leaflet-control-attribution]:bg-card/90! [&_.leaflet-control-attribution]:text-muted-foreground! [&_.leaflet-control-attribution_a]:text-primary!",
  // Popups take the card surface in both themes.
  "[&_.leaflet-popup-content-wrapper]:rounded-lg! [&_.leaflet-popup-content-wrapper]:border [&_.leaflet-popup-content-wrapper]:border-border [&_.leaflet-popup-content-wrapper]:bg-card! [&_.leaflet-popup-content-wrapper]:text-foreground! [&_.leaflet-popup-content-wrapper]:shadow-lg!",
  "[&_.leaflet-popup-content]:m-3! [&_.leaflet-popup-tip]:bg-card!",
  "[&_.leaflet-popup-close-button]:text-muted-foreground!",
].join(" ");

function createMarkerIcon(status: ReportStatus, isSelected: boolean) {
  const style = STATUS_STYLE[status];
  // The selected pin is larger and sits on a pulsing halo.
  const halo = isSelected
    ? `<span class="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-primary/50 motion-reduce:animate-none"></span>`
    : "";
  const size = isSelected
    ? "h-8 w-8 text-sm ring-4 ring-primary/70"
    : "h-6 w-6 text-xs";

  return L.divIcon({
    className: "citia-map-marker",
    html: `
      <div class="relative flex h-9 w-9 cursor-pointer items-center justify-center">
        ${halo}
        <span class="relative flex ${size} items-center justify-center rounded-full border-2 border-white font-bold shadow-md ${style.pin}">
          ${style.symbol}
        </span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/** Text placed inside a popup must not be read as HTML. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(report: AdminReport) {
  const style = STATUS_STYLE[report.reviewStatus];
  const ai = report.aiClassification;
  const aiText = ai
    ? `AI suggestion: <strong class="text-foreground">${escapeHtml(ai.label)}</strong>${
        ai.confidence != null ? ` (${Math.round(ai.confidence * 100)}%)` : ""
      }`
    : "AI suggestion: not classified";
  return `
    <div class="min-w-52 space-y-1.5 font-sans text-sm">
      <div class="flex items-center justify-between gap-3">
        <span class="font-bold tabular-nums text-foreground">${escapeHtml(report.referenceNumber)}</span>
        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span class="h-2 w-2 rounded-full ${style.pin.split(" ")[0]}"></span>${style.label}
        </span>
      </div>
      <p class="m-0! font-semibold text-foreground">${escapeHtml(report.studyArea)}</p>
      <p class="m-0! text-xs leading-snug text-muted-foreground">${escapeHtml(report.specificLocation)}</p>
      <p class="m-0! text-xs text-muted-foreground">${aiText}</p>
      <a href="/admin/reports/${encodeURIComponent(report.id)}"
         class="mt-2 flex min-h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground! no-underline hover:bg-primary/90">
        Open report
      </a>
    </div>`;
}

export function MonitoringMap({
  reports,
  selectedReportId,
  onSelectReport,
  selectedArea,
}: MonitoringMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // The latest callback, so pin clicks never call a stale one.
  const onSelectRef = useRef(onSelectReport);
  useEffect(() => {
    onSelectRef.current = onSelectReport;
  }, [onSelectReport]);

  // Create the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const overview = STUDY_AREA_CENTERS["All Study Areas"];
    const map = L.map(mapContainerRef.current, {
      center: [overview.lat, overview.lng],
      zoom: overview.zoom,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true,
      // The page scrolls normally over the map; zoom with the buttons,
      // a pinch or a double-click.
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.control.scale({ imperial: false, maxWidth: 120 }).addTo(map);

    mapInstanceRef.current = map;
    const markers = markersRef.current;
    const resize = setTimeout(() => map.invalidateSize(), 0);

    return () => {
      clearTimeout(resize);
      map.remove();
      mapInstanceRef.current = null;
      markers.clear();
    };
  }, []);

  // Draw one pin for every report that has coordinates.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    reports.forEach((report) => {
      if (!report.coordinates) return;

      const marker = L.marker([report.coordinates.lat, report.coordinates.lng], {
        icon: createMarkerIcon(report.reviewStatus, report.id === selectedReportId),
        title: `${report.referenceNumber} (${report.studyArea})`,
        alt: `Sighting ${report.referenceNumber} in ${report.studyArea}, ${STATUS_STYLE[report.reviewStatus].label}`,
        zIndexOffset: report.id === selectedReportId ? 1000 : 0,
      }).addTo(map);

      marker.bindPopup(popupHtml(report));
      marker.on("click", () => onSelectRef.current(report.id));
      markersRef.current.set(report.id, marker);
    });
  }, [reports, selectedReportId]);

  // Move the view: to the selected report's pin, or to the chosen area.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const selected = selectedReportId
      ? reports.find((r) => r.id === selectedReportId)
      : undefined;

    if (selected?.coordinates) {
      map.flyTo(
        [selected.coordinates.lat, selected.coordinates.lng],
        Math.max(map.getZoom(), 15),
        { duration: 0.8 }
      );
      const marker = markersRef.current.get(selected.id);
      if (marker && !marker.isPopupOpen()) marker.openPopup();
      return;
    }

    map.closePopup();
    const area = STUDY_AREA_CENTERS[selectedArea] ?? STUDY_AREA_CENTERS["All Study Areas"];
    map.flyTo([area.lat, area.lng], area.zoom, { duration: 0.8 });
  }, [selectedArea, selectedReportId, reports]);

  return (
    <div className={`relative h-full min-h-[inherit] w-full ${MAP_CHROME}`}>
      <div
        ref={mapContainerRef}
        role="application"
        aria-label="Map of sighting reports. Select a pin to see the report."
        className="z-0 h-full min-h-[inherit] w-full overflow-hidden rounded-lg border border-border bg-surface-tint"
      />

      {/* Legend */}
      <div className="absolute bottom-8 left-3 z-10 rounded-md border border-border bg-card/95 p-3 text-sm shadow-md backdrop-blur-sm">
        <p className="mb-2 font-semibold text-foreground">Review status</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {(Object.keys(STATUS_STYLE) as ReportStatus[]).map((status) => (
            <li key={status} className="flex items-center gap-2 text-foreground">
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] font-bold ${STATUS_STYLE[status].pin}`}
              >
                {STATUS_STYLE[status].symbol}
              </span>
              {STATUS_STYLE[status].label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
