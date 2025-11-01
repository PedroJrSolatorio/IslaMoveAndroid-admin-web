import { useState, useEffect } from "react";
import { ServiceAreaRepository } from "../repositories/ServiceAreaRepository";

export const useServiceAreaViewModel = () => {
  const [uiState, setUiState] = useState({
    isLoading: false,
    serviceAreas: [],
    selectedArea: null,
    showAreaDialog: false,
    showDestinationDialog: false,
    showMap: false,
    editingArea: null,
    editingDestination: null,
    errorMessage: null,
    isDrawingBoundary: false,
    boundaryPoints: [],
    draggingPointIndex: null,
    selectedPointIndex: null,
    showBoundarySearch: false,
    boundarySearchQuery: "",
    boundarySearchResults: [],
    isBoundarySearching: false,
  });

  const repository = new ServiceAreaRepository();

  const loadServiceAreas = async () => {
    setUiState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const areas = await repository.getAllServiceAreas();
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        serviceAreas: areas,
        errorMessage: null,
      }));

      // Create default area if none exist
      if (areas.length === 0) {
        await createDefaultServiceArea();
      }
    } catch (error) {
      console.error("Error loading service areas:", error);
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: `Failed to load service areas: ${error.message}`,
      }));
    }
  };

  const createDefaultServiceArea = async () => {
    try {
      const defaultArea = {
        name: "Default Area",
        destinations: [],
        isActive: true,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      await repository.addServiceArea(defaultArea);
      await loadServiceAreas();
    } catch (error) {
      console.error("Error creating default service area:", error);
    }
  };

  const addServiceAreaWithBoundary = async (serviceArea) => {
    setUiState((prev) => ({ ...prev, isLoading: true }));

    try {
      await repository.addServiceArea(serviceArea);
      await loadServiceAreas();
      console.log("Added new service area with boundary:", serviceArea.name);
    } catch (error) {
      console.error("Error adding service area:", error);
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: `Failed to add service area: ${error.message}`,
      }));
    }
  };

  const updateServiceAreaWithBoundary = async (serviceArea) => {
    setUiState((prev) => ({ ...prev, isLoading: true }));

    try {
      await repository.updateServiceArea(serviceArea);
      await loadServiceAreas();
      console.log("Updated service area:", serviceArea.name);
    } catch (error) {
      console.error("Error updating service area:", error);
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: `Failed to update service area: ${error.message}`,
      }));
    }
  };

  const deleteServiceArea = async (areaId) => {
    setUiState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Deleting service area:", areaId);
      await repository.deleteServiceArea(areaId);

      // Remove from local state immediately
      setUiState((prev) => ({
        ...prev,
        serviceAreas: prev.serviceAreas.filter((area) => area.id !== areaId),
        isLoading: false,
      }));

      // Reload to verify
      await loadServiceAreas();
    } catch (error) {
      console.error("Error deleting service area:", error);
      setUiState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: `Failed to delete service area: ${error.message}`,
      }));
    }
  };

  const clearErrorMessage = () => {
    setUiState((prev) => ({ ...prev, errorMessage: null }));
  };

  // Initialize
  useEffect(() => {
    loadServiceAreas();
  }, []);

  return {
    uiState,
    loadServiceAreas,
    addServiceAreaWithBoundary,
    updateServiceAreaWithBoundary,
    deleteServiceArea,
    clearErrorMessage,
  };
};
