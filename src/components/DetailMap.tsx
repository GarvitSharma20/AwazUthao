import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface DetailMapProps {
  lat: number;
  lng: number;
}

export default function DetailMap({ lat, lng }: DetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [lng, lat], // [longitude, latitude]
      zoom: 15,
      maxPitch: 45,
    });
    mapRef.current = map;

    // Create custom pin element
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center w-8 h-8";
    el.innerHTML = `
      <div class="absolute w-8 h-8 rounded-full bg-rose-500/20 animate-ping"></div>
      <div class="absolute w-5.5 h-5.5 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-rose-500">
        <div class="w-3 h-3 bg-rose-500 rounded-full"></div>
      </div>
    `;

    const marker = new maplibregl.Marker({
      element: el,
    })
      .setLngLat([lng, lat])
      .addTo(map);
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
