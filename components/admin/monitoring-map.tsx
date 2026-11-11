// components/admin/monitoring-map.tsx
//
// WHAT: Interactive Leaflet map visualizing community-submitted Mahogany sightings.
//
// ACCESSIBILITY & DATA INTEGRITY:
//   - Only plots reports with verified valid latitude & longitude coordinates.
//   - Color-coded accessible divIcon markers (Verified = Green, Pending = Amber, Rejected = Red).
//   - Synchronized with active selection in the report list.
//   - Dark Matter map tiles (CartoDB/OpenStreetMap) matching CITIA-IS dark theme.

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReportStatus, SightingReport } from "@/lib/reports-data";

interface MonitoringMapProps {
  reports: SightingReport[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  selectedArea: string;
}

const STUDY_AREA_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "Palao Medical": { lat: 8.2215, lng: 124.2482, zoom: 15 },
  Dalipuga: { lat: 8.3185, lng: 124.2611, zoom: 15 },
  "NPC Area": { lat: 8.2095, lng: 124.2815, zoom: 15 },
  "All Study Areas": { lat: 8.255, lng: 124.26, zoom: 12 },
};

function createMarkerIcon(status: ReportStatus, isSelected: boolean) {
  const bgClass =
    status === "Verified"
      ? "bg-emerald-500 border-white text-white"
      : status === "Rejected"
        ? "bg-red-500 border-white text-white"
        : "bg-amber-500 border-white text-zinc-950";

  const selectedRing = isSelected
    ? "ring-4 ring-emerald-400 scale-125 z-50 shadow-xl"
    : "hover:scale-110 shadow-md";

  const symbol =
    status === "Verified" ? "✓" : status === "Rejected" ? "✕" : "!";

  return L.divIcon({
    className: "citia-map-marker",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div class="h-6 w-6 rounded-full border-2 ${bgClass} ${selectedRing} flex items-center justify-center font-bold text-[11px] transition-all">
          ${symbol}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
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

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [8.255, 124.26],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: true,
    });

    // Dark Matter basemap tiles (CartoDB with OSM data)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when reports or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const reportsWithCoords = reports.filter(
      (r) => r.coordinates && typeof r.coordinates.lat === "number"
    );

    reportsWithCoords.forEach((report) => {
      if (!report.coordinates) return;

      const isSelected = report.id === selectedReportId;
      const icon = createMarkerIcon(report.reviewStatus, isSelected);

      const marker = L.marker([report.coordinates.lat, report.coordinates.lng], {
        icon,
        title: `${report.referenceNumber} (${report.studyArea})`,
        alt: `Sighting ${report.referenceNumber} in ${report.studyArea}`,
      }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: inherit; min-width: 190px; color: #f4f4f5; background: #18181b; padding: 4px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #10b981;">
              ${report.referenceNumber}
            </span>
            <span style="font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: ${
              report.reviewStatus === "Verified"
                ? "#10b981"
                : report.reviewStatus === "Rejected"
                  ? "#ef4444"
                  : "#f59e0b"
            };">
              ${report.reviewStatus}
            </span>
          </div>
          <div style="font-size: 11px; font-weight: 600; margin-bottom: 2px;">
            ${report.studyArea}
          </div>
          <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 6px; line-height: 1.3;">
            ${report.specificLocation}
          </div>
          <div style="font-size: 10px; color: #d4d4d8; margin-bottom: 8px;">
            AI: <strong>${report.aiClassification.label}</strong> (${Math.round(
              report.aiClassification.confidence * 100
            )}%)
          </div>
          <a
            href="/admin/reports/${report.id}"
            style="display: block; text-align: center; font-size: 11px; font-weight: 600; padding: 5px 8px; border-radius: 4px; background: #10b981; color: #09090b; text-decoration: none;"
          >
            Open Report Details &rarr;
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "citia-dark-popup",
      });

      marker.on("click", () => {
        onSelectReport(report.id);
      });

      markersRef.current.set(report.id, marker);
    });
  }, [reports, selectedReportId, onSelectReport]);

  // Center on study area change or selected report change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedReportId) {
      const selected = reports.find((r) => r.id === selectedReportId);
      if (selected?.coordinates) {
        map.flyTo([selected.coordinates.lat, selected.coordinates.lng], 15, {
          duration: 0.8,
        });
        const marker = markersRef.current.get(selectedReportId);
        if (marker && !marker.isPopupOpen()) {
          marker.openPopup();
        }
        return;
      }
    }

    // Default to study area bounds if no specific report is selected
    const centerConfig = STUDY_AREA_CENTERS[selectedArea] || STUDY_AREA_CENTERS["All Study Areas"];
    map.flyTo([centerConfig.lat, centerConfig.lng], centerConfig.zoom, {
      duration: 0.8,
    });
  }, [selectedArea, selectedReportId, reports]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-neutral-950">
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Floating Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] rounded-md border border-border/80 bg-neutral-950/90 p-2.5 backdrop-blur-md text-xs shadow-lg">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
          Observation Status
        </p>
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 text-[8px] text-white font-bold flex items-center justify-center">
              ✓
            </span>
            <span className="text-zinc-200">Verified Sighting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500 text-[8px] text-zinc-950 font-bold flex items-center justify-center">
              !
            </span>
            <span className="text-zinc-200">Pending Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 text-[8px] text-white font-bold flex items-center justify-center">
              ✕
            </span>
            <span className="text-zinc-200">Rejected Observation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
