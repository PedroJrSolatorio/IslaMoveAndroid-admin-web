import React, { useState, useEffect, useRef } from "react";
import { ZoneBoundaryRepository } from "../repositories/ZoneBoundaryRepository";
import MapView from "../components/MapView";
import { Upload, Download, Edit, Trash2 } from "lucide-react";
import BoundaryFareDialog from "../components/BoundaryFareDialog";

export default function ZoneBoundariesTab() {
  const [boundaries, setBoundaries] = useState([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [geojsonInput, setGeojsonInput] = useState("");
  const [boundaryName, setBoundaryName] = useState("");
  const [importError, setImportError] = useState("");
  const [editingBoundary, setEditingBoundary] = useState(null);
  const [selectedBoundary, setSelectedBoundary] = useState(null);
  const [showFareDialog, setShowFareDialog] = useState(false);
  const repository = useRef(new ZoneBoundaryRepository()).current;

  useEffect(() => {
    loadBoundaries();
  }, []);

  const loadBoundaries = async () => {
    const bounds = await repository.getAllZoneBoundaries();
    console.log("Loaded boundaries:", bounds);
    setBoundaries(bounds);
  };

  const handleImportGeoJSON = async () => {
    setImportError("");

    if (!boundaryName.trim()) {
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

      // Check for duplicate name
      const nameExists = await repository.boundaryNameExists(
        boundaryName.toUpperCase(),
        editingBoundary?.id
      );

      if (nameExists) {
        setImportError("A boundary with this name already exists");
        return;
      }

      // Convert to our format
      const lastCoord = coordinates[coordinates.length - 1];
      const firstCoord = coordinates[0];
      const isClosed =
        lastCoord[0] === firstCoord[0] && lastCoord[1] === firstCoord[1];

      let points = coordinates
        .slice(0, isClosed ? -1 : coordinates.length)
        .map((coord) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));

      // Close the polygon
      points = [...points, points[0]];

      // Save or update boundary
      if (editingBoundary) {
        await repository.updateZoneBoundary({
          ...editingBoundary,
          name: boundaryName.toUpperCase(),
          points: points,
        });
      } else {
        await repository.addZoneBoundary({
          name: boundaryName.toUpperCase(),
          points: points,
          fillColor: "#FF9800",
          strokeColor: "#F57C00",
          strokeWidth: 2,
          isActive: true,
          boundaryFares: {},
          compatibleBoundaries: [],
        });
      }

      await loadBoundaries();
      setShowImportDialog(false);
      setGeojsonInput("");
      setBoundaryName("");
      setImportError("");
      setEditingBoundary(null);
    } catch (error) {
      setImportError(`Import failed: ${error.message}`);
    }
  };

  const handleEditBoundary = (boundary) => {
    setEditingBoundary(boundary);
    setBoundaryName(boundary.name);
    setShowImportDialog(true);
  };

  const handleDeleteBoundary = async (id) => {
    if (!confirm("Delete this boundary? This will affect fare calculations."))
      return;

    try {
      await repository.deleteZoneBoundary(id);
      await loadBoundaries();
    } catch (error) {
      console.error("Error deleting boundary:", error);
      alert("Failed to delete boundary");
    }
  };

  const handleConfigureFares = (boundary) => {
    setSelectedBoundary(boundary);
    setShowFareDialog(true);
  };

  const exportGeoJSON = (boundary) => {
    const coordinates = boundary.points.map((p) => [p.longitude, p.latitude]);

    const geojson = {
      type: "Feature",
      properties: {
        name: boundary.name,
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
    link.download = `${boundary.name.replace(/\s+/g, "_")}_zone.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-orange-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold">Zone Boundaries</h2>
            <p className="text-sm text-gray-600">
              Manage zone boundaries for fare calculation. Import from
              geojson.io.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBoundary(null);
              setBoundaryName("");
              setShowImportDialog(true);
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Boundary
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map View - Left Side */}
        <div className="flex-1">
          {boundaries.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center p-12">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-700 mb-2">
                  No Zone Boundaries Yet
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">
                  Create zone boundaries using geojson.io to enable zone-based
                  fare calculations.
                </p>
                <button
                  onClick={() => {
                    setEditingBoundary(null);
                    setBoundaryName("");
                    setShowImportDialog(true);
                  }}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 inline-flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Import Your First Boundary
                </button>
              </div>
            </div>
          ) : (
            <MapView destinations={[]} zoneBoundaries={boundaries} />
          )}
        </div>

        {/* Sidebar - Right Side */}
        {boundaries.length > 0 && (
          <div className="w-80 border-l overflow-y-auto bg-gray-50 p-4">
            <h3 className="font-semibold mb-3">
              Boundaries ({boundaries.length})
            </h3>
            <div className="space-y-2">
              {boundaries.map((boundary) => (
                <div
                  key={boundary.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{boundary.name}</h4>
                      <p className="text-xs text-gray-500">
                        {boundary.points.length - 1} points
                      </p>
                      {Object.keys(boundary.boundaryFares || {}).length > 0 && (
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          {Object.keys(boundary.boundaryFares).length} fare
                          {Object.keys(boundary.boundaryFares).length !== 1
                            ? "s"
                            : ""}
                        </p>
                      )}
                    </div>
                    <div
                      className="w-8 h-8 rounded border-2 border-white shadow-sm"
                      style={{ backgroundColor: boundary.fillColor }}
                    />
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleConfigureFares(boundary)}
                      className="flex-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center justify-center gap-1"
                      title="Configure Fares"
                    >
                      <span className="text-sm">₱</span>
                    </button>
                    <button
                      onClick={() => exportGeoJSON(boundary)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="Export"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEditBoundary(boundary)}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBoundary(boundary.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingBoundary
                ? "Update Zone Boundary"
                : "Import Zone Boundary"}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boundary Name (will be converted to UPPERCASE)
              </label>
              <input
                type="text"
                value={boundaryName}
                onChange={(e) => setBoundaryName(e.target.value.toUpperCase())}
                placeholder="e.g., ZONE A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4 text-sm">
              <p className="font-semibold text-orange-900 mb-1">
                💡 How to create GeoJSON:
              </p>
              <ol className="text-orange-800 list-decimal list-inside space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://geojson.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    geojson.io
                  </a>
                </li>
                <li>
                  Use the <strong>Draw a polygon</strong> tool (🔷) to draw your
                  zone
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
              className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2 font-mono text-sm"
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
                  setBoundaryName("");
                  setImportError("");
                  setEditingBoundary(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportGeoJSON}
                disabled={!geojsonInput.trim() || !boundaryName.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingBoundary ? "Update" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fare Dialog */}
      {showFareDialog && selectedBoundary && (
        <BoundaryFareDialog
          boundary={selectedBoundary}
          allBoundaries={boundaries}
          onClose={() => {
            setShowFareDialog(false);
            setSelectedBoundary(null);
          }}
          onSave={async (fares) => {
            try {
              await repository.updateZoneBoundary({
                ...selectedBoundary,
                boundaryFares: fares,
              });
              await loadBoundaries();
              setShowFareDialog(false);
              setSelectedBoundary(null);
            } catch (error) {
              console.error("Error updating fares:", error);
              alert("Failed to update fares");
            }
          }}
        />
      )}
    </div>
  );
}
