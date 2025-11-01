import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export class ServiceAreaRepository {
  constructor() {
    this.collectionName = "service_areas";
  }

  async getAllServiceAreas() {
    try {
      console.log("Fetching all service areas");
      const querySnapshot = await getDocs(collection(db, this.collectionName));

      const serviceAreas = [];
      querySnapshot.forEach((doc) => {
        serviceAreas.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Successfully fetched ${serviceAreas.length} service areas`);

      // Debug: Log each document and its destinations
      serviceAreas.forEach((area, index) => {
        console.log(
          `Area ${index}: id=${area.id}, name=${area.name}, isActive=${area.isActive}`
        );
        if (area.destinations) {
          area.destinations.forEach((dest, destIndex) => {
            console.log(
              `  Destination ${destIndex}: id=${dest.id}, name=${dest.name}, isActive=${dest.isActive}`
            );
          });
        }
      });

      // Filter active areas and their active destinations
      const activeAreas = serviceAreas
        .filter((area) => area.isActive)
        .map((area) => ({
          ...area,
          destinations: (area.destinations || []).filter(
            (dest) => dest.isActive
          ),
        }));

      console.log(`Active areas after filter: ${activeAreas.length}`);

      const totalActiveDestinations = activeAreas.reduce(
        (sum, area) => sum + (area.destinations?.length || 0),
        0
      );
      console.log(
        `Total active destinations across all areas: ${totalActiveDestinations}`
      );

      return activeAreas;
    } catch (error) {
      console.error("Error fetching service areas:", error);
      throw error;
    }
  }

  async addServiceArea(serviceArea) {
    try {
      const docRef = doc(collection(db, this.collectionName));
      const areaWithId = {
        ...serviceArea,
        id: docRef.id,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };

      console.log(
        `Adding service area: ${areaWithId.name}, isActive: ${areaWithId.isActive}`
      );
      await setDoc(docRef, areaWithId);
      console.log(`Successfully added service area: ${areaWithId.name}`);

      return areaWithId;
    } catch (error) {
      console.error(`Error adding service area: ${serviceArea.name}`, error);
      throw error;
    }
  }

  async updateServiceArea(serviceArea) {
    try {
      const updatedArea = {
        ...serviceArea,
        lastUpdated: Date.now(),
      };

      console.log(`Updating service area: ${updatedArea.name}`);
      await setDoc(doc(db, this.collectionName, updatedArea.id), updatedArea);
      console.log(`Successfully updated service area: ${updatedArea.name}`);
    } catch (error) {
      console.error(`Error updating service area: ${serviceArea.name}`, error);
      throw error;
    }
  }

  async deleteServiceArea(areaId) {
    try {
      console.log(`Attempting to delete service area with ID: ${areaId}`);

      // First verify the document exists
      const docRef = doc(db, this.collectionName, areaId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error(`Service area document not found: ${areaId}`);
        throw new Error("Service area not found");
      }

      console.log("Found service area document, proceeding with deletion");
      await deleteDoc(docRef);

      // Verify deletion
      const verifySnap = await getDoc(docRef);
      if (verifySnap.exists()) {
        console.error(
          `Document still exists after deletion attempt: ${areaId}`
        );
        throw new Error("Deletion verification failed - document still exists");
      }

      console.log(`Successfully deleted and verified service area: ${areaId}`);
    } catch (error) {
      console.error(`Error deleting service area: ${areaId}`, error);
      throw error;
    }
  }

  async addDestinationToArea(areaId, destination) {
    try {
      console.log(`Adding destination ${destination.name} to area ${areaId}`);

      const docRef = doc(db, this.collectionName, areaId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Service area not found");
      }

      const currentArea = docSnap.data();
      const destinationWithId = {
        ...destination,
        id: this.generateDestinationId(),
        createdAt: Date.now(),
      };

      const updatedDestinations = [
        ...(currentArea.destinations || []),
        destinationWithId,
      ];
      const updatedArea = {
        ...currentArea,
        destinations: updatedDestinations,
        lastUpdated: Date.now(),
      };

      await setDoc(docRef, updatedArea);
      console.log(
        `Successfully added destination ${destination.name} to area ${areaId}`
      );
    } catch (error) {
      console.error("Error adding destination to area:", error);
      throw error;
    }
  }

  async updateDestinationInArea(areaId, destination) {
    try {
      console.log(`Updating destination ${destination.name} in area ${areaId}`);

      const docRef = doc(db, this.collectionName, areaId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Service area not found");
      }

      const currentArea = docSnap.data();
      const updatedDestinations = (currentArea.destinations || []).map((dest) =>
        dest.id === destination.id ? destination : dest
      );

      const updatedArea = {
        ...currentArea,
        destinations: updatedDestinations,
        lastUpdated: Date.now(),
      };

      await setDoc(docRef, updatedArea);
      console.log(
        `Successfully updated destination ${destination.name} in area ${areaId}`
      );
    } catch (error) {
      console.error("Error updating destination in area:", error);
      throw error;
    }
  }

  async removeDestinationFromArea(areaId, destinationId) {
    try {
      console.log(`Removing destination ${destinationId} from area ${areaId}`);

      const docRef = doc(db, this.collectionName, areaId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Service area not found");
      }

      const currentArea = docSnap.data();
      const updatedDestinations = (currentArea.destinations || []).filter(
        (dest) => dest.id !== destinationId
      );

      const updatedArea = {
        ...currentArea,
        destinations: updatedDestinations,
        lastUpdated: Date.now(),
      };

      await setDoc(docRef, updatedArea);
      console.log(
        `Successfully removed destination ${destinationId} from area ${areaId}`
      );
    } catch (error) {
      console.error("Error removing destination from area:", error);
      throw error;
    }
  }

  generateDestinationId() {
    return `dest_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
  }

  /**
   * Get the active service boundary for driver filtering
   * Returns the service boundary that is used to filter which drivers can accept rides
   */
  async getActiveServiceBoundary() {
    try {
      console.log("Fetching active service boundary for driver filtering");
      const q = query(
        collection(db, this.collectionName),
        where("isActive", "==", true)
      );
      const querySnapshot = await getDocs(q);

      const serviceAreas = [];
      querySnapshot.forEach((doc) => {
        serviceAreas.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Found ${serviceAreas.length} active service areas total`);

      // Debug: Log all service areas
      serviceAreas.forEach((area, index) => {
        console.log(
          `Area ${index}: name='${area.name}', isActive=${area.isActive}, ` +
            `hasBoundary=${!!area.boundary}, boundaryPoints=${
              area.boundary?.points?.length || 0
            }`
        );
      });

      // Find service boundary specifically (not zone boundary)
      const serviceBoundary = serviceAreas
        .filter((area) => {
          const hasBoundary = area.boundary && area.boundary.points?.length > 0;
          const notZone = !area.name.toUpperCase().includes("ZONE");
          console.log(
            `Filtering '${area.name}': hasBoundary=${hasBoundary}, notZone=${notZone}`
          );
          return hasBoundary && notZone;
        })
        .sort((a, b) => b.lastUpdated - a.lastUpdated)[0];

      if (serviceBoundary) {
        console.log(
          `✅ Found active service boundary: ${serviceBoundary.name} ` +
            `with ${serviceBoundary.boundary.points.length} points`
        );
      } else {
        console.log(
          "❌ No active service boundary found, driver filtering will use default area"
        );
      }

      return serviceBoundary || null;
    } catch (error) {
      console.error("Error fetching active service boundary:", error);
      throw error;
    }
  }
}
