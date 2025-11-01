import React, { useState } from "react";

export default function CompatibilityDialog({
  boundary,
  allBoundaries,
  onClose,
  onSave,
}) {
  const [selected, setSelected] = useState(
    new Set(boundary.compatibleBoundaries || [])
  );

  const toggleBoundary = (name) => {
    const newSelected = new Set(selected);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelected(newSelected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">
            Configure Compatibility for {boundary.name}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which boundaries are compatible with {boundary.name} for ride
            pooling:
          </p>

          {allBoundaries.filter((b) => b.id !== boundary.id).length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No other boundaries available. Create more boundaries to configure
              compatibility.
            </p>
          ) : (
            <div className="space-y-2 mb-6">
              {allBoundaries
                .filter((b) => b.id !== boundary.id)
                .map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(b.name)}
                      onChange={() => toggleBoundary(b.name)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{b.name}</span>
                  </label>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(Array.from(selected))}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
