import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import {
  ArrowLeft,
  User as UserIcon,
  Edit,
  Eye,
  EyeOff,
  ChevronRight,
  Flag,
  MessageSquare,
  FileText,
  Trash2,
} from "lucide-react";
import { db } from "../config/firebase";
import { getAuth } from "firebase/auth";

const VerificationStatus = {
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  UNDER_REVIEW: "UNDER_REVIEW",
};

const DocumentStatus = {
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export default function UserDetailScreen({
  userId,
  onNavigateBack,
  onNavigateToTripHistory,
  onNavigateToDocumentDetails,
}) {
  const [user, setUser] = useState(null);
  const [userComments, setUserComments] = useState([]);
  const [driverReports, setDriverReports] = useState([]);
  const [passengerReports, setPassengerReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingField, setEditingField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPassengerReportDialog, setShowPassengerReportDialog] =
    useState(false);
  const [selectedPassengerReport, setSelectedPassengerReport] = useState(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState(
    VerificationStatus.PENDING
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Real-time listener for user data
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = { uid: snapshot.id, ...snapshot.data() };
          setUser(userData);
          setSelectedDiscount(userData.discountPercentage || null);
          setIsVerified(
            userData.studentDocument?.status === DocumentStatus.APPROVED
          );
          setIsActive(userData.isActive !== false);
          setLoading(false);
        } else {
          setErrorMessage("User not found");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error loading user:", error);
        setErrorMessage("Failed to load user data");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Load user comments
  useEffect(() => {
    if (!userId) return;

    const loadComments = async () => {
      try {
        const commentsQuery = query(
          collection(db, "support_comments"),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(commentsQuery);
        const comments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserComments(comments.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Error loading comments:", error);
      }
    };

    loadComments();
  }, [userId]);

  // Load driver reports
  useEffect(() => {
    if (!user || user.userType !== "DRIVER") return;

    const loadDriverReports = async () => {
      try {
        const reportsQuery = query(
          collection(db, "driver_reports"),
          where("driverId", "==", userId)
        );
        const snapshot = await getDocs(reportsQuery);
        const reports = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDriverReports(reports.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Error loading driver reports:", error);
      }
    };

    loadDriverReports();
  }, [user, userId]);

  // Load passenger reports
  useEffect(() => {
    if (!user || user.userType !== "PASSENGER") return;

    const loadPassengerReports = async () => {
      try {
        const reportsQuery = query(
          collection(db, "passenger_reports"),
          where("passengerId", "==", userId)
        );
        const snapshot = await getDocs(reportsQuery);
        const reports = snapshot.docs.map((doc) => ({
          reportId: doc.id,
          ...doc.data(),
        }));
        setPassengerReports(reports.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Error loading passenger reports:", error);
      }
    };

    loadPassengerReports();
  }, [user, userId]);

  // Auto-clear messages
  useEffect(() => {
    if (actionMessage || errorMessage) {
      const timer = setTimeout(() => {
        setActionMessage(null);
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage, errorMessage]);

  // Update functions
  const updateDiscount = async (discount) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        discountPercentage: discount,
        updatedAt: Date.now(),
      });
      setSelectedDiscount(discount);
      setActionMessage(
        discount ? `Discount set to ${discount}%` : "Discount removed"
      );
    } catch (error) {
      console.error("Error updating discount:", error);
      setErrorMessage("Failed to update discount");
    }
  };

  const updateVerification = async (verified) => {
    try {
      const status = verified
        ? DocumentStatus.APPROVED
        : DocumentStatus.REJECTED;
      await updateDoc(doc(db, "users", userId), {
        "studentDocument.status": status,
        updatedAt: Date.now(),
      });
      setIsVerified(verified);

      // Reset discount if verification removed
      if (!verified && selectedDiscount) {
        await updateDiscount(null);
        setActionMessage("Passenger verification removed and discount reset");
      } else {
        setActionMessage(
          verified ? "Passenger verified" : "Passenger verification removed"
        );
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      setErrorMessage("Failed to update verification");
    }
  };

  const updateActiveStatus = async (active) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isActive: active,
        updatedAt: Date.now(),
      });
      setIsActive(active);
      setActionMessage(active ? "User activated" : "User blocked");
    } catch (error) {
      console.error("Error updating status:", error);
      setErrorMessage("Failed to update status");
    }
  };

  const updatePersonalInfo = async (field, value) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        [field]: value,
        updatedAt: Date.now(),
      });
      setActionMessage("Personal information updated");
    } catch (error) {
      console.error("Error updating personal info:", error);
      setErrorMessage("Failed to update personal information");
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        plainTextPassword: newPassword,
        updatedAt: Date.now(),
      });
      setActionMessage("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      setErrorMessage("Failed to update password");
    }
  };

  const updateDriverVerification = async (status) => {
    try {
      const updates = {
        "driverData.verificationStatus": status,
        "driverData.verificationUpdatedAt": Date.now(),
        updatedAt: Date.now(),
      };

      // Reset discount if not approved
      if (status !== VerificationStatus.APPROVED && selectedDiscount) {
        updates.discountPercentage = null;
      }

      await updateDoc(doc(db, "users", userId), updates);

      if (status !== VerificationStatus.APPROVED && selectedDiscount) {
        setSelectedDiscount(null);
        setActionMessage("Driver verification updated and discount reset");
      } else {
        setActionMessage("Driver verification status updated");
      }
    } catch (error) {
      console.error("Error updating driver verification:", error);
      setErrorMessage("Failed to update driver verification");
    }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, "driver_reports", reportId), {
        status: newStatus,
      });
      setActionMessage(`Report status updated to ${newStatus}`);

      // Reload reports
      const reportsQuery = query(
        collection(db, "driver_reports"),
        where("driverId", "==", userId)
      );
      const snapshot = await getDocs(reportsQuery);
      const reports = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDriverReports(reports.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Error updating report status:", error);
      setErrorMessage("Failed to update report status");
    }
  };

  const updatePassengerReportStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, "passenger_reports", reportId), {
        status: newStatus,
      });
      setActionMessage(`Report status updated to ${newStatus}`);

      // Reload reports
      const reportsQuery = query(
        collection(db, "passenger_reports"),
        where("passengerId", "==", userId)
      );
      const snapshot = await getDocs(reportsQuery);
      const reports = snapshot.docs.map((doc) => ({
        reportId: doc.id,
        ...doc.data(),
      }));
      setPassengerReports(reports.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Error updating passenger report status:", error);
      setErrorMessage("Failed to update passenger report status");
    }
  };

  const deleteUser = async () => {
    try {
      setProcessing(true);

      // Get current user's ID token
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await currentUser.getIdToken();

      // Call Render API to delete user
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: userId,
            adminId: currentUser.uid,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      const result = await response.json();
      console.log("User deleted successfully:", result);

      setActionMessage("User deleted successfully");
      setTimeout(() => onNavigateBack(), 1500);
    } catch (error) {
      console.error("Error deleting user:", error);
      setErrorMessage(`Failed to delete user: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatReportType = (type) => {
    return type
      ?.replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      [VerificationStatus.APPROVED]: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "Verified",
      },
      [VerificationStatus.PENDING]: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        label: "Pending",
      },
      [VerificationStatus.REJECTED]: {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "Rejected",
      },
      [VerificationStatus.UNDER_REVIEW]: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "Under Review",
      },
    };
    return statusMap[status] || statusMap[VerificationStatus.PENDING];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">User not found</p>
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
          <h1 className="text-xl font-semibold text-gray-900">User Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Messages */}
        {actionMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {actionMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col items-center">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-gray-600">
                    {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>

              {/* Online indicator for drivers */}
              {user.userType === "DRIVER" && (
                <div
                  className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white ${
                    user.driverData?.online ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              )}
            </div>

            {/* User Info */}
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              {user.displayName || "No Name"}
            </h2>
            <p className="text-sm text-gray-600">
              User ID: {user.uid.substring(0, 8)}
            </p>
            <p className="text-sm text-gray-600">
              Joined: {formatDate(user.createdAt)}
            </p>

            {/* Delete Button */}
            {user.userType !== "ADMIN" && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="mt-4 px-6 py-2 bg-red-600 text-black rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete User</span>
              </button>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Personal Information
          </h3>
          <div className="space-y-4">
            <InfoRow
              label="Full Name"
              value={user.displayName || "Not provided"}
            />
            <InfoRow label="Email" value={user.email || "Not provided"} />
            <InfoRow
              label="Phone Number"
              value={user.phoneNumber || "Not provided"}
            />

            <InfoRow
              label="User Type"
              value={
                user.userType === "DRIVER"
                  ? "Driver"
                  : user.userType === "ADMIN"
                  ? "Admin"
                  : "Passenger"
              }
            />

            {user.dateOfBirth && (
              <InfoRow label="Date of Birth" value={user.dateOfBirth} />
            )}
            {user.gender && <InfoRow label="Gender" value={user.gender} />}
            {user.address && <InfoRow label="Address" value={user.address} />}

            {/* Valid ID Status for Passengers */}
            {user.userType === "PASSENGER" && user.studentDocument && (
              <div className="flex justify-between items-center py-2 border-t pt-4">
                <span className="text-sm text-gray-600">Valid ID</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.studentDocument.status === DocumentStatus.APPROVED
                      ? "bg-green-100 text-green-700"
                      : user.studentDocument.status ===
                        DocumentStatus.PENDING_REVIEW
                      ? "bg-orange-100 text-orange-700"
                      : user.studentDocument.status === DocumentStatus.REJECTED
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.studentDocument.status === DocumentStatus.APPROVED
                    ? "Verified"
                    : user.studentDocument.status ===
                      DocumentStatus.PENDING_REVIEW
                    ? "Pending Review"
                    : user.studentDocument.status === DocumentStatus.REJECTED
                    ? "Rejected"
                    : "Uploaded"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Account Status Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Account Status
          </h3>

          {/* Active Status Toggle (Passengers only) */}
          {user.userType === "PASSENGER" && (
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm text-gray-600">Status</span>
              <div className="flex items-center space-x-3">
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isActive ? "Active" : "Blocked"}
                </span>
                <button
                  onClick={() => updateActiveStatus(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Driver Verification Status */}
          {user.userType === "DRIVER" && user.driverData && (
            <>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-sm text-gray-600">Verification</span>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const badge = getStatusBadge(
                      user.driverData.verificationStatus
                    );
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                  <button
                    onClick={() => {
                      setSelectedVerificationStatus(
                        user.driverData.verificationStatus
                      );
                      setShowVerificationDialog(true);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-600">Online Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.driverData.online
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.driverData.online ? "Online" : "Offline"}
                </span>
              </div>
            </>
          )}

          {/* Passenger Verification and Discount */}
          {user.userType === "PASSENGER" && (
            <>
              {user.studentDocument && (
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm text-gray-600">Verification</span>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        isVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isVerified ? "Verified" : "Not Verified"}
                    </span>
                    <button
                      onClick={() => updateVerification(!isVerified)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isVerified ? "bg-green-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isVerified ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-600">Discount</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateDiscount(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedDiscount === null
                        ? "bg-gray-200 text-gray-700"
                        : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => updateDiscount(20)}
                    disabled={!isVerified}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedDiscount === 20
                        ? "bg-green-100 text-green-700"
                        : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                    } ${!isVerified && "opacity-50 cursor-not-allowed"}`}
                  >
                    20%
                  </button>
                  <button
                    onClick={() => updateDiscount(50)}
                    disabled={!isVerified}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedDiscount === 50
                        ? "bg-blue-100 text-blue-700"
                        : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                    } ${!isVerified && "opacity-50 cursor-not-allowed"}`}
                  >
                    50%
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Driver Documents */}
        {user.userType === "DRIVER" && user.driverData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Driver Documents
            </h3>
            {user.driverData.documents &&
            Object.keys(user.driverData.documents).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(user.driverData.documents).map(
                  ([docType, document]) => (
                    <button
                      key={docType}
                      onClick={() =>
                        onNavigateToDocumentDetails(user.uid, docType, docType)
                      }
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {docType.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-600">
                            {document.images?.length || 0} image(s) • Uploaded{" "}
                            {formatDate(document.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No documents uploaded</p>
            )}
          </div>
        )}

        {/* Activity History */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activity History
          </h3>
          <button
            onClick={() => onNavigateToTripHistory(user.uid)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-blue-600">
              View Trip History
            </span>
            <ChevronRight className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        {/* Support Comments */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Support Comments
          </h3>
          {userComments.length > 0 ? (
            <div className="space-y-3">
              {userComments.map((comment) => (
                <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">
                    {formatDate(comment.timestamp)}
                  </p>
                  <p className="text-sm text-gray-900">{comment.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No support comments submitted
            </p>
          )}
        </div>

        {/* Driver Reports */}
        {user.userType === "DRIVER" && driverReports.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Driver Reports
            </h3>
            <div className="space-y-3">
              {driverReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report);
                    setShowReportDialog(true);
                  }}
                  className={`p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                    report.reportType === "UNSAFE_DRIVING"
                      ? "bg-red-50"
                      : report.reportType === "INAPPROPRIATE_BEHAVIOR"
                      ? "bg-orange-50"
                      : report.reportType === "NO_SHOW"
                      ? "bg-blue-50"
                      : report.reportType === "WRONG_LOCATION"
                      ? "bg-yellow-50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-sm font-medium ${
                        report.reportType === "UNSAFE_DRIVING"
                          ? "text-red-700"
                          : report.reportType === "INAPPROPRIATE_BEHAVIOR"
                          ? "text-orange-700"
                          : report.reportType === "NO_SHOW"
                          ? "text-blue-700"
                          : report.reportType === "WRONG_LOCATION"
                          ? "text-yellow-700"
                          : "text-gray-700"
                      }`}
                    >
                      {formatReportType(report.reportType)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDate(report.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Reported by: {report.passengerName}
                  </p>
                  {report.description && (
                    <p className="text-sm text-gray-900 mb-2">
                      {report.description}
                    </p>
                  )}
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      report.status === "PENDING"
                        ? "bg-orange-100 text-orange-700"
                        : report.status === "UNDER_REVIEW"
                        ? "bg-blue-100 text-blue-700"
                        : report.status === "RESOLVED"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {report.status === "PENDING"
                      ? "Pending Review"
                      : report.status === "UNDER_REVIEW"
                      ? "Under Review"
                      : report.status === "RESOLVED"
                      ? "Resolved"
                      : "Dismissed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passenger Reports */}
        {user.userType === "PASSENGER" && passengerReports.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Passenger Reports
            </h3>
            <div className="space-y-3">
              {passengerReports.map((report) => (
                <div
                  key={report.reportId}
                  onClick={() => {
                    setSelectedPassengerReport(report);
                    setShowPassengerReportDialog(true);
                  }}
                  className={`p-4 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                    report.reportType === "INAPPROPRIATE_BEHAVIOR"
                      ? "bg-orange-50"
                      : report.reportType === "NO_SHOW"
                      ? "bg-blue-50"
                      : report.reportType === "WRONG_LOCATION"
                      ? "bg-yellow-50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-sm font-medium ${
                        report.reportType === "INAPPROPRIATE_BEHAVIOR"
                          ? "text-orange-700"
                          : report.reportType === "NO_SHOW"
                          ? "text-blue-700"
                          : report.reportType === "WRONG_LOCATION"
                          ? "text-yellow-700"
                          : "text-gray-700"
                      }`}
                    >
                      {formatReportType(report.reportType)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDate(report.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Reported by: Driver
                  </p>
                  {report.description && (
                    <p className="text-sm text-gray-900 mb-2">
                      {report.description}
                    </p>
                  )}
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      report.status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : report.status === "under_review"
                        ? "bg-blue-100 text-blue-700"
                        : report.status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {report.status === "pending"
                      ? "Pending Review"
                      : report.status === "under_review"
                      ? "Under Review"
                      : report.status === "resolved"
                      ? "Resolved"
                      : "Dismissed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingField === "plainTextPassword"
                ? "Edit Password"
                : `Edit ${editingField}`}
            </h3>
            <input
              type={editingField === "plainTextPassword" ? "password" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Enter new ${editingField}`}
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setEditValue("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingField === "plainTextPassword") {
                    updatePassword(editValue);
                  } else {
                    updatePersonalInfo(editingField, editValue);
                  }
                  setShowEditDialog(false);
                  setEditValue("");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Report Status Dialog */}
      {showReportDialog && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Update Report Status</h3>
            <p className="text-sm text-gray-600 mb-2">
              Report ID: {selectedReport.id.substring(0, 8)}
            </p>
            <p className="text-sm font-medium mb-4">
              Report Type: {formatReportType(selectedReport.reportType)}
            </p>

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-700 font-medium">
                Select new status:
              </p>
              {[
                { value: "PENDING", label: "Pending Review", color: "orange" },
                { value: "UNDER_REVIEW", label: "Under Review", color: "blue" },
                { value: "RESOLVED", label: "Resolved", color: "green" },
                { value: "DISMISSED", label: "Dismissed", color: "gray" },
              ].map((status) => (
                <label
                  key={status.value}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reportStatus"
                    value={status.value}
                    checked={selectedReport.status === status.value}
                    onChange={(e) =>
                      setSelectedReport({
                        ...selectedReport,
                        status: e.target.value,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReportDialog(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateReportStatus(selectedReport.id, selectedReport.status);
                  setShowReportDialog(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Report Status Dialog */}
      {showPassengerReportDialog && selectedPassengerReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Update Report Status</h3>
            <p className="text-sm text-gray-600 mb-2">
              Report ID: {selectedPassengerReport.reportId.substring(0, 8)}
            </p>
            <p className="text-sm font-medium mb-4">
              Report Type:{" "}
              {formatReportType(selectedPassengerReport.reportType)}
            </p>

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-700 font-medium">
                Select new status:
              </p>
              {[
                { value: "pending", label: "Pending Review", color: "orange" },
                { value: "under_review", label: "Under Review", color: "blue" },
                { value: "resolved", label: "Resolved", color: "green" },
                { value: "dismissed", label: "Dismissed", color: "gray" },
              ].map((status) => (
                <label
                  key={status.value}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name="passengerReportStatus"
                    value={status.value}
                    checked={selectedPassengerReport.status === status.value}
                    onChange={(e) =>
                      setSelectedPassengerReport({
                        ...selectedPassengerReport,
                        status: e.target.value,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{status.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPassengerReportDialog(false);
                  setSelectedPassengerReport(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updatePassengerReportStatus(
                    selectedPassengerReport.reportId,
                    selectedPassengerReport.status
                  );
                  setShowPassengerReportDialog(false);
                  setSelectedPassengerReport(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Verification Dialog */}
      {showVerificationDialog && user.userType === "DRIVER" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Update Verification Status
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Current Status: {user.driverData?.verificationStatus || "PENDING"}
            </p>
            {selectedDiscount && (
              <p className="text-sm text-red-600 mb-4">
                ⚠️ Changing verification status from APPROVED will reset
                discount to None
              </p>
            )}

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-700 font-medium">
                Select new status:
              </p>
              {Object.values(VerificationStatus).map((status) => (
                <label
                  key={status}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name="verificationStatus"
                    value={status}
                    checked={selectedVerificationStatus === status}
                    onChange={(e) =>
                      setSelectedVerificationStatus(e.target.value)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">
                    {status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVerificationDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateDriverVerification(selectedVerificationStatus);
                  setShowVerificationDialog(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Confirm Permanent Deletion
            </h3>
            <p className="text-sm text-gray-900 mb-2">
              Are you sure you want to permanently delete this user?
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-6 space-y-1">
              <p className="text-sm">
                <span className="font-medium">User:</span> {user.displayName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Email:</span>{" "}
                {user.email || "Not provided"}
              </p>
              <p className="text-sm">
                <span className="font-medium">User ID:</span>{" "}
                {user.uid.substring(0, 8)}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteUser();
                  setShowDeleteDialog(false);
                }}
                disabled={processing}
                className={`px-4 py-2 bg-red-600 text-black rounded-lg hover:bg-red-700 transition-colors ${
                  processing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// InfoRow component
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}
