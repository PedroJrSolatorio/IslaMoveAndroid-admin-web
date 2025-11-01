import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "YOUR_MAPBOX_TOKEN";

export default function MapView({ destinations = [], zoneBoundaries = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const boundaryLayers = useRef([]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.5760264, 10.0195507],
      zoom: 13,
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Draw destinations
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Clear existing destination markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    destinations.forEach((dest) => {
      const el = document.createElement("div");
      el.className = "destination-marker";
      el.style.backgroundColor = dest.markerColor || "#FF5722";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      const marker = new mapboxgl.Marker(el)
        .setLngLat([dest.longitude, dest.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${dest.name}</strong>`))
        .addTo(map.current);

      markers.current.push(marker);
    });
  }, [destinations]);

  // Draw zone boundaries
  useEffect(() => {
    if (!map.current) return;

    const drawBoundaries = () => {
      if (!map.current.isStyleLoaded()) {
        map.current.once("idle", drawBoundaries);
        return;
      }

      // Remove existing boundary layers
      boundaryLayers.current.forEach((layerId) => {
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });

      // Remove existing boundary sources
      const sourceIds = new Set(zoneBoundaries.map((b) => `boundary-${b.id}`));
      sourceIds.forEach((sourceId) => {
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });

      boundaryLayers.current = [];

      // Add new boundaries
      zoneBoundaries.forEach((boundary) => {
        const layerId = `boundary-${boundary.id}`;
        const coordinates = boundary.points.map((p) => [
          p.longitude,
          p.latitude,
        ]);

        if (map.current.getSource(layerId)) return;

        map.current.addSource(layerId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [coordinates],
            },
          },
        });

        // Fill layer
        map.current.addLayer({
          id: layerId,
          type: "fill",
          source: layerId,
          paint: {
            "fill-color": boundary.fillColor?.substring(0, 7) || "#FF9800",
            "fill-opacity": 0.3,
          },
        });

        // Outline layer
        map.current.addLayer({
          id: `${layerId}-outline`,
          type: "line",
          source: layerId,
          paint: {
            "line-color": boundary.strokeColor || "#F57C00",
            "line-width": boundary.strokeWidth || 2,
          },
        });

        boundaryLayers.current.push(layerId, `${layerId}-outline`);
      });

      // Fit map to show all boundaries
      if (zoneBoundaries.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        zoneBoundaries.forEach((boundary) => {
          boundary.points.forEach((p) => {
            bounds.extend([p.longitude, p.latitude]);
          });
        });
        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
          maxZoom: 15,
        });
      }
    };

    drawBoundaries();
  }, [zoneBoundaries]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
}
