import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface ReportMapProps {
  center: [number, number]; // [latitude, longitude]
  onChange: (coords: [number, number]) => void;
}

export default function ReportMap({ center, onChange }: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const isInternalChangeRef = useRef<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [center[1], center[0]], // [longitude, latitude]
      zoom: 15,
      maxPitch: 60,
    });
    mapRef.current = map;

    // Create a beautiful custom element for the draggable pinpoint
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center w-10 h-10 cursor-grab active:cursor-grabbing";
    el.innerHTML = `
      <div class="absolute w-10 h-10 rounded-full bg-[#00a36c]/20 animate-ping"></div>
      <div class="absolute w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-[#00a36c]">
        <div class="w-3.5 h-3.5 bg-[#00a36c] rounded-full"></div>
      </div>
      <div class="absolute top-10 bg-slate-900 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap tracking-wider pointer-events-none uppercase">
        Drag Pin
      </div>
    `;

    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([center[1], center[0]])
      .addTo(map);
    markerRef.current = marker;

    // Handle marker dragging
    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      isInternalChangeRef.current = true;
      onChange([lngLat.lat, lngLat.lng]);
      map.easeTo({
        center: [lngLat.lng, lngLat.lat],
        duration: 400,
      });
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 100);
    });

    // Handle map click to reposition pin
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      isInternalChangeRef.current = true;
      onChange([lat, lng]);
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 100);

      map.easeTo({
        center: [lng, lat],
        duration: 400,
      });
    });

    // Handle map drag/pan to update position of central pin in real-time and fetch location automatically
    map.on("move", (e) => {
      if (e.originalEvent) {
        const centerLngLat = map.getCenter();
        marker.setLngLat(centerLngLat);
        isInternalChangeRef.current = true;
        onChange([centerLngLat.lat, centerLngLat.lng]);
        setTimeout(() => {
          isInternalChangeRef.current = false;
        }, 50);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update map and marker if center changes externally (e.g. locating, IP fallback)
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || isInternalChangeRef.current) return;

    const currentCenter = map.getCenter();
    const dist = Math.sqrt(
      Math.pow(currentCenter.lat - center[0], 2) + 
      Math.pow(currentCenter.lng - center[1], 2)
    );

    // If map center is already extremely close (negligible distance), avoid programmatic flyTo animation to prevent jitter while panning
    if (dist < 0.0001) {
      marker.setLngLat([center[1], center[0]]);
      return;
    }

    marker.setLngLat([center[1], center[0]]);
    map.flyTo({
      center: [center[1], center[0]],
      zoom: 15,
      essential: true,
      duration: 1500,
    });
  }, [center]);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
      {/* Centered target visual aid */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="w-24 h-24 rounded-full border border-dashed border-[#00a36c]/45 animate-pulse flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-[#00a36c]/25" />
        </div>
      </div>
    </div>
  );
}
