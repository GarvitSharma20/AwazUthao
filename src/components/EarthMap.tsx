import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface EarthMapProps {
  incidents?: any[];
  issues?: any[];
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  userLocation?: [number, number] | null; // [latitude, longitude]
  onSelectIssue?: (issue: any) => void;
}

export default function EarthMap({ 
  incidents, 
  issues, 
  center, 
  zoom, 
  userLocation, 
  onSelectIssue 
}: EarthMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Keep track of spinning animation status
  const isSpinningRef = useRef<boolean>(true);
  const hasFlownInRef = useRef<boolean>(false);
  const prevCenterRef = useRef<[number, number] | null>(null);

  const items = incidents || issues || [];

  // 1. Initialize map and style with rotation
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Start with global high-altitude camera view for beautiful sphere preview
    const initialLat = center ? center[0] : 20.5937;
    const initialLng = center ? center[1] : 78.9629;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [initialLng, initialLat],
      zoom: 1.6,
      maxPitch: 85,
    });
    mapRef.current = map;

    // Render 3D Globe Projection
    map.on("style.load", () => {
      map.setProjection({
        type: "globe"
      });
    });

    // Slow cinematic rotation loop
    const spinSpeed = 0.07; // Degrees per frame
    const rotateGlobe = () => {
      if (!isSpinningRef.current || !mapRef.current) return;
      const current = map.getCenter();
      current.lng += spinSpeed;
      map.setCenter(current);
      requestAnimationFrame(rotateGlobe);
    };
    requestAnimationFrame(rotateGlobe);

    // Stop rotating on user drag/zoom/tilt interaction
    const interruptSpin = () => {
      isSpinningRef.current = false;
    };
    map.on("dragstart", interruptSpin);
    map.on("zoomstart", interruptSpin);
    map.on("pitchstart", interruptSpin);

    // After 2.0 seconds of majestic overview spinning, fly smoothly into focal point
    const flyInTimer = setTimeout(() => {
      if (isSpinningRef.current && mapRef.current) {
        isSpinningRef.current = false;
        hasFlownInRef.current = true;

        // Target coordinates: user GPS location, or specified center prop, or first active issue
        let targetCenter: [number, number] = [78.9629, 20.5937]; // Lng, Lat
        if (userLocation) {
          targetCenter = [userLocation[1], userLocation[0]];
        } else if (center) {
          targetCenter = [center[1], center[0]];
        } else if (items.length > 0) {
          const first = items[0];
          const lat = first.location?.lat ?? first.location?.latitude;
          const lon = first.location?.lng ?? first.location?.longitude;
          if (typeof lat === "number" && typeof lon === "number") {
            targetCenter = [lon, lat];
          }
        }

        map.flyTo({
          center: targetCenter,
          zoom: zoom || 13.5,
          pitch: 45,
          duration: 3500,
          essential: true
        });
      }
    }, 2000);

    return () => {
      clearTimeout(flyInTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Load GeoJSON Clustered Sources and Layers dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // Build features list
      const geojsonFeatures = items.map((item) => {
        const lat = item.location?.lat ?? item.location?.latitude;
        const lon = item.location?.lng ?? item.location?.longitude;
        return {
          type: "Feature",
          properties: {
            id: item.id,
            title: item.title || "Reported Issue",
            category: item.category || "General",
            severity: item.severity || "Medium",
            status: item.status || "Reported",
          },
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
        };
      }).filter(f => typeof f.geometry.coordinates[0] === "number" && typeof f.geometry.coordinates[1] === "number");

      // Reset existing source & layers if they already exist
      if (map.getLayer("clusters")) map.removeLayer("clusters");
      if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
      if (map.getLayer("unclustered-point")) map.removeLayer("unclustered-point");
      if (map.getSource("issues-source")) map.removeSource("issues-source");

      // Add clustered source
      map.addSource("issues-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geojsonFeatures as any,
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Style clusters
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "issues-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0f172a", // Slate-900 Dark theme matching the UI
          "circle-radius": [
            "step",
            ["get", "point_count"],
            24, 
            50, 30,
            250, 38
          ],
          "circle-stroke-width": 4,
          "circle-stroke-color": "rgba(59, 130, 246, 0.45)", // Beautiful blue pulsating glow
        },
      });

      // Add the text label representing the size of the cluster
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "issues-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count}\nISSUES",
          "text-size": 9,
          "text-line-height": 1.1,
          "text-justify": "center"
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Style individual unclustered nodes
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "issues-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "severity"],
            "Critical", "#ef4444",
            "High", "#f59e0b",
            "Medium", "#3b82f6",
            "#10b981" // Low/Resolved Green
          ],
          "circle-radius": 8,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Interaction listeners for clusters (Zoom in to show the issues)
      const handleClusterClick = (e: any) => {
        isSpinningRef.current = false;
        
        // 1. Try to get the feature directly from the click event's features array (highest reliability)
        let clusterFeature = e.features && e.features[0];
        
        // 2. If not found or doesn't have a cluster_id, query a 15px bounding box around the click point
        if (!clusterFeature || !clusterFeature.properties || clusterFeature.properties.cluster_id === undefined) {
          const bbox = [
            [e.point.x - 15, e.point.y - 15],
            [e.point.x + 15, e.point.y + 15]
          ];
          const features = map.queryRenderedFeatures(bbox, { layers: ["clusters", "cluster-count"] });
          clusterFeature = features.find(f => f.properties && f.properties.cluster_id !== undefined);
        }
        
        if (!clusterFeature) return;
        
        const clusterId = clusterFeature.properties.cluster_id;
        const source = map.getSource("issues-source") as any;
        if (!source) return;
        
        source.getClusterExpansionZoom(clusterId, (err: any, expansionZoom: number) => {
          if (err) return;
          const coordinates = (clusterFeature.geometry as any).coordinates;
          // Zoom in to decompose the cluster. Guarantee zooming to at least 14.0 so issues are separated.
          const targetZoom = Math.max(expansionZoom || 13, 14);
          map.easeTo({
            center: coordinates,
            zoom: targetZoom,
            duration: 900,
          });
        });
      };

      map.off("click", "clusters");
      map.off("click", "cluster-count");
      map.on("click", "clusters", handleClusterClick);
      map.on("click", "cluster-count", handleClusterClick);

      // Interaction listeners for unclustered individual points
      map.off("click", "unclustered-point");
      map.on("click", "unclustered-point", (e) => {
        isSpinningRef.current = false;
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
        if (!features.length) return;

        const props = features[0].properties;
        const coordinates = (features[0].geometry as any).coordinates.slice() as [number, number];

        // Highlight selected issue in parent container state
        const targetIssue = items.find((item) => item.id === props.id);
        if (targetIssue && onSelectIssue) {
          onSelectIssue(targetIssue);
        }

        // Display highly polished descriptive popup matching app design
        new maplibregl.Popup({ offset: 12, closeButton: false })
          .setLngLat(coordinates)
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 4px; color: #0f172a; min-width: 140px; border-radius: 6px;">
              <p style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0 0 1px 0;">${props.category}</p>
              <h4 style="font-size: 11px; font-weight: 900; margin: 0 0 4px 0; color: #1e293b; line-height: 1.2;">${props.title}</h4>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; font-weight: 700;">
                <span style="background-color: #f1f5f9; padding: 1px 4px; border-radius: 4px; color: #475569;">${props.severity}</span>
                <span style="color: ${props.status === "Resolved" ? "#10b981" : "#ef4444"};">● ${props.status}</span>
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Cursor feedback
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "cluster-count", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "cluster-count", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.on("load", setupLayers);
    }
  }, [items, onSelectIssue]);

  // 3. Keep user GPS current-location pulsing marker updated
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center w-8 h-8";
      el.innerHTML = `
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-65"></span>
        <span class="relative inline-flex rounded-full h-4.5 w-4.5 bg-blue-600 border-2.5 border-white shadow-lg shadow-blue-500/40"></span>
      `;

      const userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation[1], userLocation[0]])
        .addTo(map);

      userMarkerRef.current = userMarker;
    }
  }, [userLocation]);

  // 4. Handle flyTo actions on manual selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    const prevCenter = prevCenterRef.current;
    prevCenterRef.current = center;

    if (prevCenter && (prevCenter[0] !== center[0] || prevCenter[1] !== center[1])) {
      isSpinningRef.current = false; // Immediately disrupt starting rotation
      map.flyTo({
        center: [center[1], center[0]],
        zoom: zoom || 14.5,
        duration: 2500,
        essential: true,
        pitch: 40
      });
    }
  }, [center, zoom]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden min-h-[350px]">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-10" />
    </div>
  );
}
