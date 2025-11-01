import React, { useState } from "react";

export default function DestinationEditor({
  destination,
  point,
  zoneBoundaries,
  onSave,
  onDelete,
  onClose,
}) {
  const [name, setName] = useState(destination?.name || "");
  const [color, setColor] = useState(destination?.markerColor || "red");
  const [boundaryFares, setBoundaryFares] = useState(
    destination?.boundaryFares || {}
  );

  const colors = [
    { name: "red", value: "#EF4444" },
    { name: "blue", value: "#3B82F6" },
    { name: "green", value: "#10B981" },
    { name: "orange", value: "#F97316" },
    { name: "purple", value: "#A855F7" },
    { name: "yellow", value: "#EAB308" },
  ];

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a destination name");
      return;
    }
    onSave({ name: name.trim(), markerColor: color, boundaryFares });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">
            {destination ? "Edit Destination" : "Add Destination"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <p className="text-sm text-gray-600">
                {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Destination Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter destination name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Marker Color
              </label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    className={`w-10 h-10 rounded-full border-2 ${
                      color === c.name
                        ? "border-gray-900 ring-2 ring-offset-2 ring-blue-500"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Boundary Fares (₱)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Set fares when traveling FROM these boundaries TO this
                destination
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {zoneBoundaries.map((boundary) => (
                  <div key={boundary.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1">{boundary.name}</span>
                    <input
                      type="number"
                      value={boundaryFares[boundary.name] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBoundaryFares((prev) => {
                          const newFares = { ...prev };
                          if (value) {
                            newFares[boundary.name] = parseFloat(value);
                          } else {
                            delete newFares[boundary.name];
                          }
                          return newFares;
                        });
                      }}
                      className="w-24 px-2 py-1 border rounded text-sm"
                      placeholder="Fare"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {destination ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
