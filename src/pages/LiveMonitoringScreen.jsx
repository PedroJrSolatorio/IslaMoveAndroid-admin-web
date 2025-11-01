import React, { useState, useEffect, useRef } from "react";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { ref as dbRef, onValue, get } from "firebase/database";
import { rtdb as database } from "../config/firebase";
import {
  MapPin,
  Activity,
  Users,
  AlertTriangle,
  RefreshCw,
  Navigation,
  X,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set your Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// System Health enum
const SystemHealth = {
  GOOD: "GOOD",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

// Booking Status enum
const BookingStatus = {
  PENDING: "PENDING",
  LOOKING_FOR_DRIVER: "LOOKING_FOR_DRIVER",
  SCHEDULED: "SCHEDULED",
  ACCEPTED: "ACCEPTED",
  DRIVER_ARRIVING: "DRIVER_ARRIVING",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

export default function LiveMonitoringScreen() {
  const [activeRides, setActiveRides] = useState([]);
  const [onlineDriverLocations, setOnlineDriverLocations] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [systemHealth, setSystemHealth] = useState(SystemHealth.GOOD);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  // Calculate system health based on metrics
  const calculateSystemHealth = (ridesCount, driversCount) => {
    if (driversCount === 0 && ridesCount > 0) return SystemHealth.ERROR;
    if (driversCount > 0 && ridesCount / driversCount > 0.9)
      return SystemHealth.WARNING;
    return SystemHealth.GOOD;
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [125.576, 10.02], // San Jose, Dinagat Islands
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Monitor active rides in real-time
  useEffect(() => {
    setIsLiveMonitoring(true);
    console.log("🔥 Starting REAL-TIME monitoring");

    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.ACCEPTED,
      BookingStatus.DRIVER_ARRIVING,
      BookingStatus.DRIVER_ARRIVED,
      BookingStatus.IN_PROGRESS,
    ];

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("status", "in", activeStatuses)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      async (snapshot) => {
        console.log(
          `🔥 REAL-TIME: Received ${snapshot.docs.length} bookings from Firebase`
        );

        const bookingsData = [];

        for (const docSnapshot of snapshot.docs) {
          const booking = { id: docSnapshot.id, ...docSnapshot.data() };

          // Fetch passenger name
          let passengerName = "Unknown Passenger";
          try {
            const passengerDoc = await getDoc(
              doc(db, "users", booking.passengerId)
            );
            if (passengerDoc.exists()) {
              passengerName =
                passengerDoc.data().displayName || "Unknown Passenger";
            }
          } catch (error) {
            console.error("Error fetching passenger:", error);
          }

          // Fetch driver name if assigned
          let driverName = "No driver assigned";
          if (booking.driverId) {
            try {
              const driverDoc = await getDoc(
                doc(db, "users", booking.driverId)
              );
              if (driverDoc.exists()) {
                driverName = driverDoc.data().displayName || "Unknown Driver";
              }
            } catch (error) {
              console.error("Error fetching driver:", error);
            }
          }

          bookingsData.push({
            booking,
            passengerName,
            driverName,
          });
        }

        setActiveRides(bookingsData);
        setLastUpdated(Date.now());
        setIsLoading(false);
        setSystemHealth(
          calculateSystemHealth(
            bookingsData.length,
            onlineDriverLocations.length
          )
        );
      },
      (error) => {
        console.error("Error monitoring active rides:", error);
        setErrorMessage(`Error loading active rides: ${error.message}`);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [onlineDriverLocations.length]);

  // Monitor online drivers in real-time
  useEffect(() => {
    console.log("🔥 Starting to observe online drivers");

    const driverStatusRef = dbRef(database, "driver_status");

    const unsubscribe = onValue(
      driverStatusRef,
      async (statusSnapshot) => {
        console.log("🔥 REAL-TIME: Driver status changed, processing...");

        const onlineDriverIds = [];
        const maxStatusAge = 5 * 60 * 1000; // 5 minutes
        const currentTime = Date.now();

        statusSnapshot.forEach((driverSnapshot) => {
          const driverId = driverSnapshot.key;
          const isOnline = driverSnapshot.child("online").val();
          const lastStatusUpdate =
            driverSnapshot.child("lastUpdate").val() || 0;
          const statusAge = currentTime - lastStatusUpdate;

          if (isOnline === true && statusAge <= maxStatusAge) {
            onlineDriverIds.push(driverId);
          }
        });

        console.log(`Found ${onlineDriverIds.length} online drivers`);

        if (onlineDriverIds.length === 0) {
          setOnlineDriverLocations([]);
          updateMapMarkers([]);
          return;
        }

        // Get driver locations
        const driverLocationsRef = dbRef(database, "driver_locations");
        const locationsSnapshot = await get(driverLocationsRef);

        const onlineDrivers = [];
        const fifteenMinutesAgo = currentTime - 15 * 60 * 1000;

        onlineDriverIds.forEach((driverId) => {
          const locationSnapshot = locationsSnapshot.child(driverId);
          if (locationSnapshot.exists()) {
            const locationData = locationSnapshot.val();

            if (locationData.lastUpdate > fifteenMinutesAgo) {
              onlineDrivers.push({
                driverId,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                online: true,
                lastUpdate: locationData.lastUpdate,
                heading: locationData.heading || 0,
                speed: locationData.speed || 0,
              });
            }
          }
        });

        console.log(
          `🔥 REAL-TIME: Updated driver locations: ${onlineDrivers.length}`
        );
        setOnlineDriverLocations(onlineDrivers);
        setLastUpdated(Date.now());
        setSystemHealth(
          calculateSystemHealth(activeRides.length, onlineDrivers.length)
        );

        // Update map markers
        updateMapMarkers(onlineDrivers);
      },
      (error) => {
        console.error("Error monitoring drivers:", error);
        setErrorMessage(`Error loading drivers: ${error.message}`);
      }
    );

    return () => unsubscribe();
  }, [activeRides.length]);

  // Update map markers
  const updateMapMarkers = (drivers) => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add driver markers
    drivers.forEach((driver) => {
      const el = document.createElement("div");
      el.className = "driver-marker";
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.backgroundImage = "url(/car-icon.png)";
      el.style.backgroundSize = "cover";
      el.style.cursor = "pointer";

      const marker = new mapboxgl.Marker(el)
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>Driver ${driver.driverId.substring(
              0,
              8
            )}</strong><br>Online`
          )
        )
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  };

  // Emergency stop ride
  const emergencyStopRide = async (bookingId) => {
    if (!window.confirm("Are you sure you want to emergency stop this ride?")) {
      return;
    }

    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: BookingStatus.CANCELLED,
        completionTime: Date.now(),
        specialInstructions: "Emergency stop by admin",
        cancelledBy: "admin",
      });
      console.log("Emergency stop executed for booking", bookingId);
    } catch (error) {
      console.error("Failed to emergency stop ride:", error);
      setErrorMessage(`Failed to stop ride: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      [BookingStatus.PENDING]: "bg-blue-100 text-blue-800",
      [BookingStatus.LOOKING_FOR_DRIVER]: "bg-yellow-100 text-yellow-800",
      [BookingStatus.ACCEPTED]: "bg-blue-500 text-white",
      [BookingStatus.DRIVER_ARRIVING]: "bg-orange-500 text-white",
      [BookingStatus.DRIVER_ARRIVED]: "bg-red-500 text-white",
      [BookingStatus.IN_PROGRESS]: "bg-green-500 text-white",
      [BookingStatus.COMPLETED]: "bg-purple-500 text-white",
      [BookingStatus.CANCELLED]: "bg-red-100 text-red-800",
      [BookingStatus.EXPIRED]: "bg-gray-500 text-white",
      [BookingStatus.SCHEDULED]: "bg-indigo-500 text-white",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getHealthColor = (health) => {
    const colors = {
      [SystemHealth.GOOD]: "text-green-600",
      [SystemHealth.WARNING]: "text-orange-600",
      [SystemHealth.ERROR]: "text-red-600",
    };
    return colors[health] || "text-gray-600";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Live Monitoring
            </h1>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isLiveMonitoring
                    ? "bg-green-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isLiveMonitoring ? "text-green-600" : "text-gray-600"
                }`}
              >
                {isLiveMonitoring ? "🔥 REAL-TIME" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
          <p className="text-red-800">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} className="ml-auto">
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative rounded-lg overflow-hidden shadow-lg">
        <div ref={mapContainer} className="w-full h-full" />

        {/* System Health Status Bar (Top Overlay) */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-4xl">
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-4">
            <div className="flex justify-around items-center">
              {/* Active Rides */}
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {activeRides.length}
                </p>
                <p className="text-sm text-gray-600">Active Rides</p>
              </div>

              <div className="w-px h-10 bg-gray-300" />

              {/* Online Drivers */}
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {onlineDriverLocations.length}
                </p>
                <p className="text-sm text-gray-600">Online Drivers</p>
              </div>

              <div className="w-px h-10 bg-gray-300" />

              {/* System Health */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Activity
                    className={`w-4 h-4 ${getHealthColor(systemHealth)}`}
                  />
                  <p
                    className={`text-xl font-bold ${getHealthColor(
                      systemHealth
                    )}`}
                  >
                    {systemHealth === SystemHealth.GOOD
                      ? "Good"
                      : systemHealth === SystemHealth.WARNING
                      ? "Warning"
                      : "Error"}
                  </p>
                </div>
                <p className="text-sm text-gray-600">System Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Rides List (Bottom Overlay) */}
        {activeRides.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-4xl">
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-4 max-h-52 overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Active Rides
              </h3>
              <div className="space-y-2">
                {activeRides.slice(0, 3).map((rideInfo) => (
                  <div
                    key={rideInfo.booking.id}
                    className="bg-gray-50/50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-100/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Ride #{rideInfo.booking.id.substring(0, 6)}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {rideInfo.passengerName} → {rideInfo.driverName}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        rideInfo.booking.status
                      )}`}
                    >
                      {rideInfo.booking.status.replace(/_/g, " ")}
                    </span>
                    <button
                      onClick={() => emergencyStopRide(rideInfo.booking.id)}
                      className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Emergency Stop"
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {activeRides.length > 3 && (
                  <p className="text-sm text-gray-600 text-center py-2">
                    +{activeRides.length - 3} more rides
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Last Updated (Bottom Left) */}
        {lastUpdated && (
          <div className="absolute bottom-4 left-4">
            <div className="bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-2 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading live data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
