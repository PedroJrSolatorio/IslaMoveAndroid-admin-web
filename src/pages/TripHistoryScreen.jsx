import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { ArrowLeft, Car } from "lucide-react";
import { db } from "../config/firebase";

// ✅ CACHE: Store trip history to avoid refetching
const tripCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function TripHistoryScreen({ userId, onNavigateBack }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20); // ✅ Pagination
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadTripHistory();
      loadedRef.current = true;
    }
  }, [userId]);

  const loadTripHistory = async () => {
    try {
      setLoading(true);

      // ✅ Check cache first
      const cached = tripCache.get(userId);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log("✅ Using cached trip history");
        setTrips(cached.trips);
        setError(null);
        setLoading(false);
        return;
      }

      console.log("🔥 Fetching trip history from Firestore");

      // ✅ Query with limit to prevent excessive reads
      const ridesQuery = query(
        collection(db, "bookings"),
        where("passengerId", "==", userId),
        limit(100) // ✅ Limit to prevent large reads
      );

      const driverRidesQuery = query(
        collection(db, "bookings"),
        where("driverId", "==", userId),
        limit(100)
      );

      const [passengerSnapshot, driverSnapshot] = await Promise.all([
        getDocs(ridesQuery),
        getDocs(driverRidesQuery),
      ]);

      const allTrips = [
        ...passengerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        ...driverSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];

      // Remove duplicates and sort by time
      const uniqueTrips = Array.from(
        new Map(allTrips.map((trip) => [trip.id, trip])).values()
      ).sort(
        (a, b) => (b.endTime || b.requestTime) - (a.endTime || a.requestTime)
      );

      // ✅ Store in cache
      tripCache.set(userId, {
        trips: uniqueTrips,
        timestamp: now,
      });

      setTrips(uniqueTrips);
      setError(null);
    } catch (err) {
      console.error("Error loading trip history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTripTime = (trip) => {
    const timestamp =
      trip.endTime || trip.startTime || trip.acceptTime || trip.requestTime;
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (24 * 60 * 60 * 1000));

    if (diffInDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else if (diffInDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else if (diffInDays < 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const formatRoute = (trip) => {
    const pickup =
      trip.pickupLocation?.address?.split(",")[0]?.trim() || "Unknown";
    const destination =
      trip.destination?.address?.split(",")[0]?.trim() || "Unknown";
    return `${pickup} to ${destination}`;
  };

  // ✅ Display limited trips for better performance
  const displayedTrips = trips.slice(0, displayLimit);
  const hasMore = trips.length > displayLimit;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Trip History</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Past Trips</h2>
          {/* ✅ Refresh button */}
          <button
            onClick={() => {
              tripCache.delete(userId);
              loadTripHistory();
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Error loading trips</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {trips.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-2">No trips found</p>
            <p className="text-sm text-gray-500">
              Trip history will appear here once rides are completed
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    {/* Vehicle Icon */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-gray-600" />
                    </div>

                    {/* Trip Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatRoute(trip)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatTripTime(trip)}
                      </p>
                    </div>

                    {/* Price and Status */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        ₱{Math.floor(trip.fareEstimate?.totalEstimate || 0)}
                      </p>
                      <p
                        className={`text-xs font-medium mt-1 ${
                          trip.status === "COMPLETED"
                            ? "text-green-600"
                            : trip.status === "CANCELLED_BY_PASSENGER" ||
                              trip.status === "CANCELLED_BY_DRIVER"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {trip.status === "COMPLETED"
                          ? "Completed"
                          : trip.status === "CANCELLED_BY_PASSENGER" ||
                            trip.status === "CANCELLED_BY_DRIVER"
                          ? "Cancelled"
                          : trip.status?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Load More button */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 20)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Load More ({trips.length - displayLimit} remaining)
                </button>
              </div>
            )}

            {/* ✅ Trip count */}
            <p className="text-sm text-gray-500 text-center mt-4">
              Showing {displayedTrips.length} of {trips.length} trips
            </p>
          </>
        )}
      </div>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}

// Trip Details Modal Component
function TripDetailsModal({ trip, onClose }) {
  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatRoute = (trip) => {
    const pickup =
      trip.pickupLocation?.address?.split(",")[0]?.trim() || "Unknown";
    const destination =
      trip.destination?.address?.split(",")[0]?.trim() || "Unknown";
    return `${pickup} to ${destination}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold tracking-wide">
              TRIP DETAILS
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <span className="text-2xl text-gray-400">×</span>
            </button>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Status:</span>
            <span
              className={`text-sm font-medium ${
                trip.status === "COMPLETED"
                  ? "text-green-600"
                  : trip.status === "CANCELLED_BY_PASSENGER" ||
                    trip.status === "CANCELLED_BY_DRIVER"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {trip.status === "COMPLETED"
                ? "Completed"
                : trip.status === "CANCELLED_BY_PASSENGER" ||
                  trip.status === "CANCELLED_BY_DRIVER"
                ? "Cancelled"
                : trip.status?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Route */}
          <div>
            <p className="text-sm font-medium mb-2">Route:</p>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Car className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-sm">{formatRoute(trip)}</p>
            </div>
          </div>

          {/* Locations */}
          <DetailRow
            label="Pickup:"
            value={trip.pickupLocation?.address || "N/A"}
          />
          <DetailRow
            label="Destination:"
            value={trip.destination?.address || "N/A"}
          />

          {/* Times */}
          {trip.requestTime && (
            <DetailRow
              label="Request Time:"
              value={formatDateTime(trip.requestTime)}
            />
          )}
          {trip.acceptTime && (
            <DetailRow
              label="Accept Time:"
              value={formatDateTime(trip.acceptTime)}
            />
          )}
          {trip.startTime && (
            <DetailRow
              label="Start Time:"
              value={formatDateTime(trip.startTime)}
            />
          )}
          {trip.endTime && (
            <DetailRow label="End Time:" value={formatDateTime(trip.endTime)} />
          )}

          {/* IDs */}
          {trip.driverId && (
            <DetailRow label="Driver ID:" value={trip.driverId} />
          )}
          <DetailRow label="Passenger ID:" value={trip.passengerId} />

          {/* Total Fare */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold">Total Fare:</span>
              <span className="text-lg font-bold text-green-600">
                ₱{Math.floor(trip.fareEstimate?.totalEstimate || 0)}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 !bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}
