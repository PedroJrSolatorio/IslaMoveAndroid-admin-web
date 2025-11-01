import React, { useState, useEffect, useRef } from "react";
import { ZoneBoundaryRepository } from "../repositories/ZoneBoundaryRepository";
import CompatibilityDialog from "../components/CompatibilityDialog";

export default function CompatibilityTab() {
  const [boundaries, setBoundaries] = useState([]);
  const [selectedBoundary, setSelectedBoundary] = useState(null);
  const repository = useRef(new ZoneBoundaryRepository()).current;

  useEffect(() => {
    loadBoundaries();
  }, []);

  const loadBoundaries = async () => {
    const bounds = await repository.getAllZoneBoundaries();
    console.log("Loaded boundaries:", bounds.length, bounds);
    setBoundaries(bounds);
  };

  return (
    <div className="p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Boundary Compatibility for Ride Pooling
            </h3>
            <p className="text-sm text-blue-800">
              Configure which destination boundaries are compatible for ride
              pooling. Drivers with an active passenger can only receive
              requests for compatible destinations.
            </p>
          </div>
        </div>
      </div>

      {boundaries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Zone Boundaries
          </h3>
          <p className="text-gray-500">
            Create zone boundaries first to configure compatibility
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
          {boundaries.map((boundary) => (
            <div
              key={boundary.id}
              onClick={() => setSelectedBoundary(boundary)}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{boundary.name}</h4>
                  <p className="text-sm text-gray-600">
                    {boundary.compatibleBoundaries?.length > 0
                      ? `Compatible with: ${boundary.compatibleBoundaries.join(
                          ", "
                        )}`
                      : "No compatible boundaries set"}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBoundary && (
        <CompatibilityDialog
          boundary={selectedBoundary}
          allBoundaries={boundaries}
          onClose={() => setSelectedBoundary(null)}
          onSave={async (compatibleBoundaries) => {
            try {
              await repository.updateZoneBoundary({
                ...selectedBoundary,
                compatibleBoundaries,
              });
              await loadBoundaries();
              setSelectedBoundary(null);
            } catch (error) {
              console.error("Error updating compatibility:", error);
              alert("Failed to update compatibility settings");
            }
          }}
        />
      )}
    </div>
  );
}
