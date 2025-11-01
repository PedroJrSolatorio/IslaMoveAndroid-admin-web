import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Info,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
} from "lucide-react";

// Configure Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "your-mapbox-token";

const ServiceBoundaryTab = ({ viewModel, uiState }) => {
  const [serviceBoundaryName, setServiceBoundaryName] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [geojsonInput, setGeojsonInput] = useState("");
  const [importError, setImportError] = useState("");
  const [editingBoundary, setEditingBoundary] = useState(null);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // Find existing service boundary
  const serviceBoundary = uiState.serviceAreas
    ?.filter(
      (area) =>
        area.boundary &&
        area.boundary.points?.length > 0 &&
        !area.name.toUpperCase().includes("ZONE")
    )
    .sort((a, b) => b.lastUpdated - a.lastUpdated)[0];

  // Debug logging
  useEffect(() => {
    console.log("ServiceBoundary changed:", serviceBoundary);
    if (serviceBoundary?.boundary?.points) {
      console.log("Points count:", serviceBoundary.boundary.points.length);
      console.log("First point:", serviceBoundary.boundary.points[0]);
    }
  }, [serviceBoundary]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.5718, 10.008],
      zoom: 13,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add polygon source and layer
      map.addSource("boundary-polygon", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[]],
          },
        },
      });

      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary-polygon",
        paint: {
          "fill-color": "#2196F3",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "boundary-outline",
        type: "line",
        source: "boundary-polygon",
        paint: {
          "line-color": "#2196F3",
          "line-width": 3,
        },
      });

      // Update boundary after map is loaded
      updateMapBoundary();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when boundary changes
  useEffect(() => {
    if (serviceBoundary) {
      updateMapBoundary();
    }
  }, [serviceBoundary]);

  const updateMapBoundary = () => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once("idle", () => updateMapBoundary());
      return;
    }

    const source = map.getSource("boundary-polygon");
    if (!source) {
      // If source doesn't exist yet, wait a bit and try again
      setTimeout(() => updateMapBoundary(), 100);
      return;
    }

    if (serviceBoundary?.boundary?.points?.length >= 3) {
      const coordinates = [
        ...serviceBoundary.boundary.points.map((p) => [
          p.longitude,
          p.latitude,
        ]),
        [
          serviceBoundary.boundary.points[0].longitude,
          serviceBoundary.boundary.points[0].latitude,
        ],
      ];

      source.setData({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });

      // Fit map to boundary
      const bounds = new mapboxgl.LngLatBounds();
      serviceBoundary.boundary.points.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    } else {
      source.setData({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[]],
        },
      });
    }
  };

  // Export boundary as GeoJSON
  const exportGeoJSON = () => {
    if (!serviceBoundary || !serviceBoundary.boundary) {
      alert("No boundary to export");
      return;
    }

    const coordinates = serviceBoundary.boundary.points.map((p) => [
      p.longitude,
      p.latitude,
    ]);
    coordinates.push(coordinates[0]); // Close the polygon

    const geojson = {
      type: "Feature",
      properties: {
        name: serviceBoundary.name,
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    };

    const dataStr = JSON.stringify(geojson, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${serviceBoundary.name.replace(
      /\s+/g,
      "_"
    )}_boundary.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import boundary from GeoJSON
  const handleImportGeoJSON = async () => {
    setImportError("");

    if (!serviceBoundaryName.trim()) {
      setImportError("Please enter a boundary name first");
      return;
    }

    try {
      const parsed = JSON.parse(geojsonInput);

      let coordinates = [];

      // Handle different GeoJSON structures
      if (parsed.type === "FeatureCollection" && parsed.features?.length > 0) {
        const feature = parsed.features[0];
        if (feature.geometry.type === "Polygon") {
          coordinates = feature.geometry.coordinates[0];
        } else if (feature.geometry.type === "LineString") {
          coordinates = feature.geometry.coordinates;
        } else {
          throw new Error("First feature must be a Polygon or LineString");
        }
      } else if (parsed.type === "Feature") {
        if (parsed.geometry.type === "Polygon") {
          coordinates = parsed.geometry.coordinates[0];
        } else if (parsed.geometry.type === "LineString") {
          coordinates = parsed.geometry.coordinates;
        } else {
          throw new Error("Feature must be a Polygon or LineString");
        }
      } else if (parsed.type === "Polygon") {
        coordinates = parsed.coordinates[0];
      } else if (parsed.type === "LineString") {
        coordinates = parsed.coordinates;
      } else {
        throw new Error(
          "Invalid GeoJSON format. Must be a Polygon, LineString, Feature, or FeatureCollection."
        );
      }

      if (!coordinates || coordinates.length < 3) {
        throw new Error("Must have at least 3 coordinates");
      }

      // Convert to our format (remove closing coordinate if present)
      const lastCoord = coordinates[coordinates.length - 1];
      const firstCoord = coordinates[0];
      const isClosed =
        lastCoord[0] === firstCoord[0] && lastCoord[1] === firstCoord[1];

      const points = coordinates
        .slice(0, isClosed ? -1 : coordinates.length)
        .map((coord) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));

      // Save boundary
      const boundaryData = {
        name: serviceBoundaryName,
        boundary: {
          points: points,
          fillColor: "#2196F380",
          strokeColor: "#2196F3",
          strokeWidth: 3.0,
        },
        isActive: true,
        lastUpdated: Date.now(),
      };

      if (editingBoundary) {
        await viewModel.updateServiceAreaWithBoundary({
          ...editingBoundary,
          ...boundaryData,
        });
      } else {
        await viewModel.addServiceAreaWithBoundary({
          ...boundaryData,
          id: "",
          destinations: [],
          createdAt: Date.now(),
        });
      }

      setShowImportDialog(false);
      setGeojsonInput("");
      setServiceBoundaryName("");
      setImportError("");
      setEditingBoundary(null);
    } catch (error) {
      setImportError(`Import failed: ${error.message}`);
    }
  };

  const handleEdit = () => {
    setEditingBoundary(serviceBoundary);
    setServiceBoundaryName(serviceBoundary.name);
    setShowImportDialog(true);
  };

  const handleNewBoundary = () => {
    setEditingBoundary(null);
    setServiceBoundaryName("");
    setShowImportDialog(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Service Boundary</h3>
            <p className="text-sm text-gray-700">
              Define where your app works. Only drivers inside this boundary
              will be able to accept rides.
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Action Panel */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          {serviceBoundary && serviceBoundary.boundary ? (
            <>
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                {serviceBoundary.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {serviceBoundary.boundary.points.length} boundary points
              </p>
              <p className="text-sm text-green-600 font-medium mb-3">
                ✓ Active - Filtering drivers
              </p>
              <div className="flex gap-2">
                <button
                  onClick={exportGeoJSON}
                  className="flex-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="Export as GeoJSON"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to delete this service boundary?"
                      )
                    ) {
                      viewModel.deleteServiceArea(serviceBoundary.id);
                    }
                  }}
                  className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-3">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <h3 className="font-bold text-gray-700 mb-1">
                  No Boundary Set
                </h3>
                <p className="text-sm text-gray-600">
                  Import a GeoJSON boundary to get started
                </p>
              </div>
              <button
                onClick={handleNewBoundary}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Boundary
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import GeoJSON Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingBoundary
                ? "Update Service Boundary"
                : "Import Service Boundary"}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boundary Name
              </label>
              <input
                type="text"
                value={serviceBoundaryName}
                onChange={(e) => setServiceBoundaryName(e.target.value)}
                placeholder="e.g., Main Service Area"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
              <p className="font-semibold text-blue-900 mb-1">
                💡 How to create GeoJSON:
              </p>
              <ol className="text-blue-800 list-decimal list-inside space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://geojson.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    geojson.io
                  </a>
                </li>
                <li>
                  Use the <strong>Draw a polygon</strong> tool (🔷) to draw your
                  boundary
                </li>
                <li>Copy the JSON from the right panel</li>
                <li>Paste it below</li>
              </ol>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              GeoJSON Code
            </label>
            <textarea
              value={geojsonInput}
              onChange={(e) => setGeojsonInput(e.target.value)}
              placeholder='{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat]...]]}}'
              className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 font-mono text-sm"
            />

            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
                {importError}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setGeojsonInput("");
                  setServiceBoundaryName("");
                  setImportError("");
                  setEditingBoundary(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportGeoJSON}
                disabled={!geojsonInput.trim() || !serviceBoundaryName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingBoundary ? "Update" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBoundaryTab;
