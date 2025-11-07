import React, { useState } from "react";

export default function BoundaryFareDialog({
  boundary,
  allBoundaries,
  onClose,
  onSave,
}) {
  const [fares, setFares] = useState(boundary.boundaryFares || {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">{boundary.name}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set fares for trips FROM this boundary TO other boundaries
          </p>

          <div className="space-y-2 mb-6">
            {allBoundaries.map((targetBoundary) => (
              <div key={targetBoundary.id} className="flex items-center gap-3">
                <span className="text-sm flex-1">
                  {targetBoundary.id === boundary.id ? (
                    <span className="font-medium">
                      ↻ {targetBoundary.name} (same zone)
                    </span>
                  ) : (
                    <span>→ {targetBoundary.name}</span>
                  )}
                </span>
                <input
                  type="number"
                  value={fares[targetBoundary.name] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFares((prev) => {
                      const newFares = { ...prev };
                      if (value) {
                        newFares[targetBoundary.name] = parseFloat(value);
                      } else {
                        delete newFares[targetBoundary.name];
                      }
                      return newFares;
                    });
                  }}
                  className="w-24 px-2 py-1 border rounded text-sm"
                  placeholder="₱"
                  min="0"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(fares)}
              className="flex-1 px-4 py-2 !bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Fares
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
