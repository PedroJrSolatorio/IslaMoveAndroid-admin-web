import React, { useState, useEffect, useRef } from "react";
import { DestinationRepository } from "../repositories/DestinationRepository";
import MapView from "../components/MapView";
import DestinationEditor from "../components/DestinationEditor";

export default function DestinationsTab({ zoneBoundaries }) {
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const repository = useRef(new DestinationRepository()).current;

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    const dests = await repository.getAllDestinations();
    setDestinations(dests);
  };

  const handleMapClick = (lat, lng) => {
    setEditingPoint({ latitude: lat, longitude: lng });
    setShowEditor(true);
    setSelectedDestination(null);
  };

  const handleDestinationClick = (dest) => {
    setSelectedDestination(dest);
    setEditingPoint({ latitude: dest.latitude, longitude: dest.longitude });
    setShowEditor(true);
  };

  const handleSaveDestination = async (data) => {
    try {
      if (selectedDestination) {
        await repository.updateDestination({
          ...selectedDestination,
          ...data,
          latitude: editingPoint.latitude,
          longitude: editingPoint.longitude,
        });
      } else {
        await repository.addDestination({
          ...data,
          latitude: editingPoint.latitude,
          longitude: editingPoint.longitude,
        });
      }
      await loadDestinations();
      setShowEditor(false);
      setSelectedDestination(null);
      setEditingPoint(null);
    } catch (error) {
      console.error("Error saving destination:", error);
      alert("Failed to save destination");
    }
  };

  const handleDeleteDestination = async () => {
    if (selectedDestination && confirm("Delete this destination?")) {
      try {
        await repository.deleteDestination(selectedDestination.id);
        await loadDestinations();
        setShowEditor(false);
        setSelectedDestination(null);
      } catch (error) {
        console.error("Error deleting destination:", error);
        alert("Failed to delete destination");
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-blue-50 border-b">
        <h2 className="text-lg font-bold">Destinations</h2>
        <p className="text-sm text-gray-600">
          Tap on the map to add destinations
        </p>
      </div>

      <div className="flex-1">
        <MapView
          destinations={destinations}
          zoneBoundaries={zoneBoundaries}
          isDrawingBoundary={false}
          boundaryPoints={[]}
          selectedPointIndex={null}
          onMapClick={handleMapClick}
          onPointClick={() => {}}
          onDestinationClick={handleDestinationClick}
        />
      </div>

      {showEditor && (
        <DestinationEditor
          destination={selectedDestination}
          point={editingPoint}
          zoneBoundaries={zoneBoundaries}
          onSave={handleSaveDestination}
          onDelete={selectedDestination ? handleDeleteDestination : null}
          onClose={() => {
            setShowEditor(false);
            setSelectedDestination(null);
            setEditingPoint(null);
          }}
        />
      )}
    </div>
  );
}
