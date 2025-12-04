import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  RefreshCw,
  AlertTriangle,
  Calendar,
  UserX,
  ChevronRight,
} from "lucide-react";

const DocumentStatus = {
  EXPIRED: "EXPIRED",
  APPROVED: "APPROVED",
  PENDING_REVIEW: "PENDING_REVIEW",
};

export default function RenewalScreen({
  onNavigateToDocumentDetails,
  onNavigateToUserDetails,
}) {
  const [activeTab, setActiveTab] = useState("drivers"); // drivers or passengers
  const [expiredDrivers, setExpiredDrivers] = useState([]);
  const [expiredPassengers, setExpiredPassengers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpiredDocuments();
  }, []);

  const loadExpiredDocuments = async () => {
    setLoading(true);
    try {
      const now = Date.now();

      // Load drivers with expired franchise certificates
      const driversQuery = query(
        collection(db, "users"),
        where("userType", "==", "DRIVER")
      );
      const driversSnapshot = await getDocs(driversQuery);

      const expiredDriversList = [];
      driversSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const franchiseCert = data.driverData?.documents?.insurance;

        if (
          franchiseCert &&
          franchiseCert.expiryDate &&
          franchiseCert.expiryDate < now
        ) {
          expiredDriversList.push({
            id: doc.id,
            ...data,
            expiredDocument: "insurance",
            expiryDate: franchiseCert.expiryDate,
            hasReupload: franchiseCert.additionalPhotos?.reupload
              ? true
              : false,
          });
        }
      });

      // Load passengers with expired student IDs
      const passengersQuery = query(
        collection(db, "users"),
        where("userType", "==", "PASSENGER")
      );
      const passengersSnapshot = await getDocs(passengersQuery);

      const expiredPassengersList = [];
      passengersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const studentDoc = data.studentDocument;

        if (
          studentDoc &&
          studentDoc.expiryDate &&
          studentDoc.expiryDate < now
        ) {
          expiredPassengersList.push({
            id: doc.id,
            ...data,
            expiryDate: studentDoc.expiryDate,
            hasReupload: studentDoc.additionalPhotos?.reupload ? true : false,
          });
        }
      });

      setExpiredDrivers(expiredDriversList);
      setExpiredPassengers(expiredPassengersList);
    } catch (error) {
      console.error("Error loading expired documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId, userName, userType) => {
    if (userType === "DRIVER") {
      // For drivers: Update verification status
      if (
        !confirm(
          `Are you sure you want to set ${userName}'s verification status to REJECTED? They will need to renew their documents and get re-verified.`
        )
      ) {
        return;
      }

      try {
        await updateDoc(doc(db, "users", userId), {
          "driverData.verificationStatus": "REJECTED",
          "driverData.documents.insurance.status": "REJECTED",
          "driverData.documents.insurance.rejectionReason": "Expired",
          updatedAt: Date.now(),
        });
        alert(`${userName}'s verification status has been set to REJECTED`);
        loadExpiredDocuments();
      } catch (error) {
        console.error("Error updating driver verification:", error);
        alert("Failed to update driver verification status");
      }
    } else {
      // For passengers: Update student document status and remove discount
      if (
        !confirm(
          `Are you sure you want to reject ${userName}'s student ID and remove their discount? They will need to upload a new valid ID.`
        )
      ) {
        return;
      }

      try {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": "REJECTED",
          "studentDocument.rejectionReason": "Expired",
          discountPercentage: null,
          updatedAt: Date.now(),
        });
        alert(
          `${userName}'s student ID has been rejected and discount removed`
        );
        loadExpiredDocuments();
      } catch (error) {
        console.error("Error updating passenger document:", error);
        alert("Failed to update passenger document status");
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysExpired = (expiryDate) => {
    const days = Math.floor((Date.now() - expiryDate) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentList =
    activeTab === "drivers" ? expiredDrivers : expiredPassengers;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Renewal</h1>
          <p className="text-gray-600 mt-1">
            Manage expired documents and renewal requests
          </p>
        </div>
        <button
          onClick={loadExpiredDocuments}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Driver Documents</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {expiredDrivers.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Student IDs</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {expiredPassengers.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("drivers")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "drivers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Drivers ({expiredDrivers.length})
            </button>
            <button
              onClick={() => setActiveTab("passengers")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "passengers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Passengers ({expiredPassengers.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-6">
          {currentList.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No expired{" "}
                {activeTab === "drivers" ? "driver documents" : "student IDs"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentList.map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Profile */}
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={user.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-medium text-gray-600">
                            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {user.displayName || "No Name"}
                          </h3>
                          {user.hasReupload && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              New Upload
                            </span>
                          )}
                          {((user.userType === "PASSENGER" &&
                            user.studentDocument &&
                            user.studentDocument.status !== "APPROVED") ||
                            (user.userType === "DRIVER" &&
                              user.driverData &&
                              user.driverData.verificationStatus !==
                                "APPROVED")) && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                              Not Verified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-red-600">
                            Expired: {formatDate(user.expiryDate)} (
                            {getDaysExpired(user.expiryDate)} days ago)
                          </p>
                          <p className="text-xs text-gray-500">
                            {activeTab === "drivers"
                              ? "Franchise Certificate"
                              : "Student ID"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {user.hasReupload && (
                        <button
                          onClick={() => {
                            if (activeTab === "drivers") {
                              onNavigateToDocumentDetails(
                                user.id,
                                "insurance",
                                "Franchise Certificate"
                              );
                            } else {
                              onNavigateToDocumentDetails(
                                user.id,
                                "passenger_id",
                                "Valid ID"
                              );
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Review Upload
                        </button>
                      )}

                      <button
                        onClick={() => onNavigateToUserDetails(user.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {((user.userType === "PASSENGER" &&
                        user.studentDocument &&
                        user.studentDocument.status === "APPROVED") ||
                        (user.userType === "DRIVER" &&
                          user.driverData &&
                          user.driverData.verificationStatus ===
                            "APPROVED")) && (
                        <button
                          onClick={() =>
                            banUser(user.id, user.displayName, user.userType)
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={
                            user.userType === "DRIVER"
                              ? "Set verification to REJECTED"
                              : "Reject student ID and remove discount"
                          }
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
