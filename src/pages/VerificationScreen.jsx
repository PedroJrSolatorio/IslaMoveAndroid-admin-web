import React, { useState, useEffect } from "react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { User, Search, ArrowRight, Star } from "lucide-react";
import { db } from "../config/firebase";

// Document status and verification status mapping
const DocumentStatus = {
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const VerificationStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

function VerificationScreen({ onNavigateToDetails }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    setLoading(true);

    // Listen to driver applications (PENDING, UNDER_REVIEW)
    const unsubDrivers = onSnapshot(
      query(collection(db, "users"), where("userType", "==", "DRIVER")),
      (snapshot) => {
        const driverList = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (d) =>
              d.driverData?.verificationStatus === VerificationStatus.PENDING ||
              d.driverData?.verificationStatus ===
                VerificationStatus.UNDER_REVIEW
          );
        setDrivers(driverList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching drivers:", error);
        setLoading(false);
      }
    );

    // Listen to passenger ID verifications (with studentDocument)
    const unsubPassengers = onSnapshot(
      query(collection(db, "users"), where("userType", "==", "PASSENGER")),
      (snapshot) => {
        const passengerList = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (p) =>
              p.studentDocument &&
              p.studentDocument.studentIdUrl &&
              p.studentDocument.studentIdUrl.length > 0 &&
              p.studentDocument.status !== DocumentStatus.APPROVED &&
              p.studentDocument.status !== DocumentStatus.REJECTED
          );
        setPassengers(passengerList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching passengers:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubDrivers();
      unsubPassengers();
    };
  }, []);

  // Search filter function
  const matchesSearch = (user, query) => {
    if (!query || query.trim() === "") return true;

    const lowerQuery = query.toLowerCase();

    // Search by name
    if (user.displayName?.toLowerCase().includes(lowerQuery)) return true;

    // Search by phone
    if (user.phoneNumber?.toLowerCase().includes(lowerQuery)) return true;

    // Search by date
    try {
      const dateFormats = [
        new Date(user.createdAt).toISOString().split("T")[0], // yyyy-mm-dd
        new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }), // MMM dd, yyyy
        new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }), // MMM dd
        new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }), // mm/dd
      ];

      if (dateFormats.some((date) => date.toLowerCase().includes(lowerQuery)))
        return true;
    } catch (e) {
      // Date parsing failed, continue
    }

    return false;
  };

  // Filter lists based on search
  const filteredDrivers = drivers.filter((d) => matchesSearch(d, searchQuery));
  const filteredPassengers = passengers.filter((p) =>
    matchesSearch(p, searchQuery)
  );

  const displayedDrivers =
    filterType === "ALL" || filterType === "DRIVER" ? filteredDrivers : [];
  const displayedPassengers =
    filterType === "ALL" || filterType === "PASSENGER"
      ? filteredPassengers
      : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
          Verification Dashboard
        </h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
          <input
            type="text"
            placeholder="Search by name or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 lg:pl-10 pr-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
          />
        </div>
      </div>

      {/* Filter toggle buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3 py-1.5 lg:px-4 lg:py-2 text-sm lg:text-base rounded-full border transition-colors ${
            filterType === "ALL"
              ? "!bg-blue-600 text-white !border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType("DRIVER")}
          className={`px-3 py-1.5 lg:px-4 lg:py-2 text-sm lg:text-base rounded-full border ${
            filterType === "DRIVER"
              ? "!bg-blue-600 text-white !border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Drivers
        </button>
        <button
          onClick={() => setFilterType("PASSENGER")}
          className={`px-3 py-1 rounded-full border ${
            filterType === "PASSENGER"
              ? "!bg-blue-600 text-white !border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Passengers
        </button>
      </div>

      {/* Empty State */}
      {filteredDrivers.length === 0 && filteredPassengers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12 text-center">
          <User className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
            No pending verifications
          </h3>
          <p className="text-sm lg:text-base text-gray-600 max-w-md mx-auto">
            User verifications including driver applications, student documents,
            and profile reviews will appear here
          </p>
        </div>
      )}

      {/* Driver Applications Section */}
      {displayedDrivers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Driver Applications ({displayedDrivers.length})
          </h2>
          <div className="space-y-3">
            {displayedDrivers.map((driver) => (
              <DriverApplicationCard
                key={driver.id}
                driver={driver}
                onClick={() => onNavigateToDetails(driver.id, "driver")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Passenger ID Verification Section */}
      {displayedPassengers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Passenger ID Verification ({displayedPassengers.length})
          </h2>
          <div className="space-y-3">
            {displayedPassengers.map((passenger) => (
              <PassengerDocumentCard
                key={passenger.id}
                passenger={passenger}
                onClick={() => onNavigateToDetails(passenger.id, "passenger")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Driver Application Card Component
function DriverApplicationCard({ driver, onClick }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-3 lg:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
          {/* Profile Image */}
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {driver.profileImageUrl ? (
              <img
                src={driver.profileImageUrl}
                alt={driver.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-blue-600 font-bold text-lg">
                {driver.displayName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>

          {/* Driver Info */}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm lg:text-base text-gray-900 truncate">
              {driver.displayName || "Unknown User"}
            </h3>
            <p className="text:xs lg:text-sm text-gray-600 truncate">
              Submitted: {formatDate(driver.createdAt)}
            </p>
          </div>
        </div>

        {/* Arrow Icon */}
        <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
      </div>
    </div>
  );
}

// Passenger Document Card Component
function PassengerDocumentCard({ passenger, onClick }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return { text: "Approved", color: "bg-green-100 text-green-800" };
      case DocumentStatus.REJECTED:
        return { text: "Rejected", color: "bg-red-100 text-red-800" };
      case DocumentStatus.PENDING_REVIEW:
        return { text: "Review", color: "bg-blue-100 text-blue-800" };
      default:
        return { text: "Pending", color: "bg-yellow-100 text-yellow-800" };
    }
  };

  const statusInfo = getStatusInfo(passenger.studentDocument?.status);

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Profile Image with Student Badge */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {passenger.profileImageUrl ? (
                <img
                  src={passenger.profileImageUrl}
                  alt={passenger.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-blue-600 font-bold text-lg">
                  {passenger.displayName?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {/* Student Badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          </div>

          {/* Passenger Info */}
          <div>
            <h3 className="font-medium text-gray-900">
              {passenger.displayName || "Unknown Student"}
            </h3>
            {passenger.studentDocument && (
              <p className="text-xs text-gray-500">
                Uploaded: {formatDate(passenger.studentDocument.uploadedAt)}
              </p>
            )}
          </div>
        </div>

        {/* <div className="flex items-center space-x-3"> */}
        {/* Status Badge */}
        {/* <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
          >
            {statusInfo.text}
          </span> */}

        {/* Arrow Icon */}
        <ArrowRight className="w-5 h-5 text-gray-400" />
        {/* </div> */}
      </div>
    </div>
  );
}

export default VerificationScreen;
