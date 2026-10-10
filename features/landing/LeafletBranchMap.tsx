"use client";

import { useEffect, useRef, useCallback } from "react";
import type { StoreBranch } from "@/lib/storefront-settings";
import "leaflet/dist/leaflet.css";

type LeafletBranchMapProps = {
  branches: StoreBranch[];
  selectedBranch: StoreBranch | null;
  onSelectBranch: (branch: StoreBranch) => void;
};

export default function LeafletBranchMap({
  branches,
  selectedBranch,
  onSelectBranch,
}: LeafletBranchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletModuleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  const branchesRef = useRef(branches);
  branchesRef.current = branches;
  const selectedBranchRef = useRef(selectedBranch);
  selectedBranchRef.current = selectedBranch;
  const onSelectBranchRef = useRef(onSelectBranch);
  onSelectBranchRef.current = onSelectBranch;

  // Safe render markers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMarkers = useCallback((L: any, map: any) => {
    if (!L || !map) return;

    try {
      if (typeof map.getContainer !== "function" || !map.getContainer()) return;
    } catch {
      return;
    }

    // Clear old markers safely
    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch {
        // ignore
      }
    });
    markersRef.current.clear();

    const currentBranches = branchesRef.current || [];
    const currentSelected = selectedBranchRef.current;

    const validBranches = currentBranches.filter(
      (b) =>
        typeof b.latitude === "number" &&
        typeof b.longitude === "number" &&
        !isNaN(b.latitude) &&
        !isNaN(b.longitude)
    );
    if (!validBranches.length) return;

    validBranches.forEach((branch) => {
      try {
        if (!map || typeof map.addLayer !== "function") return;

        const isSelected = currentSelected?.id === branch.id;

        // Next Solution Custom Pin (Modern Blue / Indigo Branding with "NS")
        const customIcon = L.divIcon({
          className: "custom-branch-marker",
          html: `
            <div class="relative group cursor-pointer transition-transform duration-300 ${isSelected ? "scale-125 z-50" : "hover:scale-115"}">
              <div class="relative flex items-center justify-center size-9 rounded-full ${
                isSelected
                  ? "bg-gradient-to-tr from-blue-600 to-indigo-600 ring-4 ring-blue-400/50 shadow-xl"
                  : "bg-gradient-to-tr from-slate-900 to-blue-900 shadow-md ring-2 ring-white"
              } border-2 border-white">
                <span class="text-[10px] font-extrabold text-white tracking-tight">
                  NS
                </span>
              </div>
              <!-- Pin Pointer -->
              <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent ${
                isSelected ? "border-t-[7px] border-t-indigo-600" : "border-t-[7px] border-t-slate-900"
              } mx-auto -mt-0.5 filter drop-shadow"></div>
            </div>
          `,
          iconSize: [36, 44],
          iconAnchor: [18, 42],
          popupAnchor: [0, -40],
        });

        const marker = L.marker([branch.latitude, branch.longitude], { icon: customIcon });

        // Interactive popup matching Next Solution design
        const mapsLink =
          branch.maps_url ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${branch.name} ${branch.address}`
          )}`;
        const waNumber = (branch.whatsapp || "6281234567890").replace(/\D/g, "");
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Halo ${branch.name}, saya ingin menanyakan informasi produk/stok toko.`
        )}`;

        const popupContent = `
          <div style="min-width: 220px; font-family: inherit; padding: 4px;">
            <div style="display: inline-block; background: #EEF2FF; color: #4338CA; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 6px; text-transform: uppercase;">
              📍 ${branch.city}
            </div>
            <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #0F172A;">${branch.name}</h4>
            <p style="margin: 0 0 8px; font-size: 11px; line-height: 1.4; color: #64748B;">${branch.address}</p>
            ${
              branch.operating_hours
                ? `<p style="margin: 0 0 8px; font-size: 11px; color: #475569;">🕒 <b>${branch.operating_hours}</b></p>`
                : ""
            }
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #25D366; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none; display: inline-block;">
                WhatsApp
              </a>
              <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #2563EB; color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none; display: inline-block;">
                Petunjuk Arah
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on("click", () => {
          onSelectBranchRef.current?.(branch);
        });

        if (map && typeof map.addLayer === "function") {
          marker.addTo(map);
          markersRef.current.set(branch.id, marker);
        }
      } catch (markerErr) {
        console.warn("Leaflet marker warning:", markerErr);
      }
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const L = await import("leaflet");
        if (isCancelled || !mapContainerRef.current) return;

        // Clean any leftover _leaflet_id from hot reload or previous unmount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((mapContainerRef.current as any)._leaflet_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        // Center around Java (overview of branches)
        const defaultCenter: [number, number] = [-7.3, 110.5];
        const defaultZoom = 7;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          minZoom: 5,
          maxZoom: 18,
          scrollWheelZoom: true,
        });

        if (isCancelled) {
          try {
            map.remove();
          } catch {
            // ignore
          }
          return;
        }

        mapInstanceRef.current = map;
        leafletModuleRef.current = L;

        // High-quality OpenStreetMap Tile Layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Render Markers
        renderMarkers(L, map);

        // Center on initial selected branch if available
        const currentSelected = selectedBranchRef.current;
        if (
          currentSelected &&
          typeof currentSelected.latitude === "number" &&
          typeof currentSelected.longitude === "number" &&
          !isNaN(currentSelected.latitude) &&
          !isNaN(currentSelected.longitude)
        ) {
          map.setView([currentSelected.latitude, currentSelected.longitude], 13);
          const m = markersRef.current.get(currentSelected.id);
          if (m) m.openPopup();
        }
      } catch (err) {
        console.error("Gagal inisialisasi Leaflet map:", err);
      }
    }

    void initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [renderMarkers]);

  // Update Markers when branches or selectedBranch changes
  useEffect(() => {
    const L = leafletModuleRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    renderMarkers(L, map);
  }, [branches, selectedBranch, renderMarkers]);

  // Effect to flyTo when selectedBranch changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedBranch) return;
    if (
      typeof selectedBranch.latitude === "number" &&
      typeof selectedBranch.longitude === "number" &&
      !isNaN(selectedBranch.latitude) &&
      !isNaN(selectedBranch.longitude)
    ) {
      try {
        if (typeof map.flyTo === "function") {
          map.flyTo([selectedBranch.latitude, selectedBranch.longitude], 14, {
            duration: 1.2,
          });
        }

        const marker = markersRef.current.get(selectedBranch.id);
        if (marker && typeof marker.openPopup === "function") {
          marker.openPopup();
        }
      } catch (err) {
        console.warn("Leaflet flyTo warning:", err);
      }
    }
  }, [selectedBranch]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <div ref={mapContainerRef} className="h-[380px] w-full sm:h-[460px] lg:h-[500px] z-0" />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-between items-center text-xs text-foreground bg-background/90 backdrop-blur px-3.5 py-2 rounded-xl border border-border/80 shadow-md sm:left-4 sm:right-4">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px] sm:text-xs">
          <span>📍</span> Geser & klik titik cabang di peta untuk lihat lokasinya
        </span>
        <button
          type="button"
          onClick={() => {
            try {
              const map = mapInstanceRef.current;
              if (map && typeof map.setView === "function") {
                map.setView([-7.3, 110.5], 7);
              }
            } catch {
              // ignore
            }
          }}
          className="pointer-events-auto rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-2.5 py-1 text-xs border border-border transition shadow-2xs"
        >
          Reset Peta
        </button>
      </div>
    </div>
  );
}
