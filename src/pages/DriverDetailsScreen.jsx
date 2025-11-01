import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { db } from "../config/firebase";

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

function DriverDetailsScreen({
  driverId,
  isStudentVerification = false,
  onNavigateBack,
  onNavigateToDocument,
}) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDriverDetails();
  }, [driverId]);

  const loadDriverDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const driverDoc = await getDoc(doc(db, "users", driverId));

      if (driverDoc.exists()) {
        setDriver({ id: driverDoc.id, ...driverDoc.data() });
      } else {
        setError("User not found");
      }
    } catch (err) {
      console.error("Error loading driver details:", err);
      setError("Failed to load driver details");
    } finally {
      setLoading(false);
    }
  };

  const approveDriver = async () => {
    setProcessing(true);
    try {
      // Check if all documents are approved
      const allDocsApproved = checkAllDocumentsApproved();

      if (!allDocsApproved) {
        alert(
          "All documents must be approved before approving the driver application"
        );
        setProcessing(false);
        return;
      }

      await updateDoc(doc(db, "users", driverId), {
        "driverData.verificationStatus": VerificationStatus.APPROVED,
        "driverData.verificationDate": Date.now(),
        "driverData.verificationNotes": "Approved by admin",
        updatedAt: Date.now(),
      });

      await loadDriverDetails();
      alert("Driver approved successfully");
    } catch (err) {
      console.error("Error approving driver:", err);
      alert("Failed to approve driver");
    } finally {
      setProcessing(false);
    }
  };

  const rejectDriver = async () => {
    const reason = prompt("Enter rejection reason:");
    if (!reason || reason.trim() === "") return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, "users", driverId), {
        "driverData.verificationStatus": VerificationStatus.REJECTED,
        "driverData.verificationDate": Date.now(),
        "driverData.verificationNotes": `Rejected: ${reason}`,
        updatedAt: Date.now(),
      });

      await loadDriverDetails();
      alert("Driver application rejected");
    } catch (err) {
      console.error("Error rejecting driver:", err);
      alert("Failed to reject driver");
    } finally {
      setProcessing(false);
    }
  };

  const checkAllDocumentsApproved = () => {
    if (!driver?.driverData?.documents) return false;

    const requiredDocs = [
      "license",
      "vehicle_registration",
      "insurance",
      "vehicle_inspection",
    ];

    return requiredDocs.every((docType) => {
      const doc = driver.driverData.documents[docType];
      return (
        doc &&
        doc.images &&
        doc.images.length > 0 &&
        doc.status === DocumentStatus.APPROVED
      );
    });
  };

  const updateUserDiscount = async (discountPercentage) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "users", driverId), {
        discountPercentage: discountPercentage,
        updatedAt: Date.now(),
      });

      await loadDriverDetails();
      alert(
        `Discount ${
          discountPercentage ? `set to ${discountPercentage}%` : "removed"
        }`
      );
    } catch (err) {
      console.error("Error updating discount:", err);
      alert("Failed to update discount");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">
            {error || "Driver not found"}
          </p>
          <button
            onClick={onNavigateBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {isStudentVerification ? "ID Verification" : "Driver Application"}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Section */}
        <ProfileSection driver={driver} />

        {/* Discount Settings (for verified passengers) */}
        {driver.userType === "PASSENGER" &&
          driver.studentDocument?.status === DocumentStatus.APPROVED && (
            <DiscountSettingsSection
              driver={driver}
              onUpdateDiscount={updateUserDiscount}
              processing={processing}
            />
          )}

        {isStudentVerification ? (
          <>
            {/* ID Information */}
            <IDInformationSection driver={driver} />

            {/* ID Document */}
            <IDDocumentSection
              driver={driver}
              onDocumentClick={(docType, docTitle) =>
                onNavigateToDocument(driverId, docType, docTitle, "passenger")
              }
            />
          </>
        ) : (
          <>
            {/* Personal Information */}
            <PersonalInformationSection driver={driver} />

            {/* Documents */}
            <DocumentsSection
              driver={driver}
              onDocumentClick={(docType, docTitle) =>
                onNavigateToDocument(driverId, docType, docTitle, "driver")
              }
            />
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {isStudentVerification ? (
            <IDStatusDisplay driver={driver} />
          ) : (
            <DriverStatusDisplay
              driver={driver}
              onApprove={approveDriver}
              onReject={rejectDriver}
              processing={processing}
              allDocsApproved={checkAllDocumentsApproved()}
            />
          )}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-24"></div>
    </div>
  );
}

// Profile Section Component
function ProfileSection({ driver }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col items-center">
        {/* Profile Image */}
        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden mb-4">
          {driver.profileImageUrl ? (
            <img
              src={driver.profileImageUrl}
              alt={driver.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-blue-600 font-bold text-3xl">
              {driver.displayName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        {/* Driver Name */}
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {driver.displayName || "Unknown Driver"}
        </h2>

        {/* Application ID */}
        <p className="text-gray-600">
          Application ID: {driver.uid.substring(0, 6).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

// Personal Information Section
function PersonalInformationSection({ driver }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Personal Information
      </h3>
      <div className="space-y-3">
        <InfoRow
          label="Full Name"
          value={driver.displayName || "Not provided"}
        />
        <InfoRow label="Email" value={driver.email || "Not provided"} />
        <InfoRow label="Phone" value={driver.phoneNumber} />
      </div>
    </div>
  );
}

// Documents Section
function DocumentsSection({ driver, onDocumentClick }) {
  const documentTypes = {
    license: "Driver's License",
    vehicle_registration: "Certificate of Registration (CR)",
    insurance: "SJMODA Certification",
    vehicle_inspection: "Official Receipt (OR)",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
      <div className="space-y-3">
        {Object.entries(documentTypes).map(([docType, title]) => {
          const document = driver.driverData?.documents?.[docType];
          const hasDocument =
            document && document.images && document.images.length > 0;

          return (
            <DocumentItem
              key={docType}
              title={title}
              hasDocument={hasDocument}
              status={document?.status}
              onClick={() => hasDocument && onDocumentClick(docType, title)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Document Item Component
function DocumentItem({ title, hasDocument, status, onClick }) {
  const getStatusIcon = () => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case DocumentStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case DocumentStatus.PENDING_REVIEW:
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${
        hasDocument ? "hover:bg-gray-50 cursor-pointer" : "opacity-50"
      }`}
    >
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <span className="text-gray-900 font-medium">{title}</span>
      </div>

      {hasDocument && <ChevronRight className="w-5 h-5 text-gray-400" />}
    </div>
  );
}

// Driver Status Display
function DriverStatusDisplay({
  driver,
  onApprove,
  onReject,
  processing,
  allDocsApproved,
}) {
  const status = driver.driverData?.verificationStatus;

  if (status === VerificationStatus.APPROVED) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium">✓ Driver Approved</p>
      </div>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800 font-medium">
          ✗ Driver Application Rejected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        <button
          onClick={onReject}
          disabled={processing}
          className="flex-1 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={processing || !allDocsApproved}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Approve
        </button>
      </div>

      {!allDocsApproved && (
        <p className="text-sm text-red-600 text-center">
          ⚠️ All documents must be approved before approving the driver
          application
        </p>
      )}
    </div>
  );
}

// ID Information Section
function IDInformationSection({ driver }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return "Approved";
      case DocumentStatus.REJECTED:
        return "Rejected";
      case DocumentStatus.PENDING_REVIEW:
        return "Under Review";
      default:
        return "Pending";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        ID Information
      </h3>
      <div className="space-y-3">
        {driver.studentDocument && (
          <>
            <InfoRow
              label="Uploaded"
              value={formatDate(driver.studentDocument.uploadedAt)}
            />
            <InfoRow
              label="Status"
              value={getStatusText(driver.studentDocument.status)}
            />
          </>
        )}
        {!driver.studentDocument && (
          <InfoRow label="Status" value="No ID document uploaded" />
        )}
      </div>
    </div>
  );
}

// ID Document Section
function IDDocumentSection({ driver, onDocumentClick }) {
  const idDoc = driver.studentDocument;
  const hasDocument =
    idDoc && idDoc.studentIdUrl && idDoc.studentIdUrl.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
      <DocumentItem
        title="Valid ID"
        hasDocument={hasDocument}
        status={idDoc?.status}
        onClick={() =>
          hasDocument && onDocumentClick("passenger_id", "Valid ID")
        }
      />
    </div>
  );
}

// ID Status Display
function IDStatusDisplay({ driver }) {
  const status = driver.studentDocument?.status;

  if (status === DocumentStatus.APPROVED) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium">✓ ID Approved</p>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-600 text-center">
      To approve or reject the ID, please click on the document above and review
      it individually.
    </p>
  );
}

// Discount Settings Section
function DiscountSettingsSection({ driver, onUpdateDiscount, processing }) {
  const [selectedDiscount, setSelectedDiscount] = useState(
    driver.discountPercentage
  );

  const handleDiscountChange = (discount) => {
    setSelectedDiscount(discount);
    onUpdateDiscount(discount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Discount Settings
      </h3>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-700">Current Discount:</span>
          <span className="font-semibold text-blue-600">
            {selectedDiscount ? `${selectedDiscount}% Discount` : "No Discount"}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-3">Select Discount:</p>
        <div className="flex space-x-2">
          <button
            onClick={() => handleDiscountChange(null)}
            disabled={processing}
            className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors ${
              selectedDiscount === null
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            } disabled:opacity-50`}
          >
            No Discount
          </button>
          <button
            onClick={() => handleDiscountChange(20)}
            disabled={processing}
            className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors ${
              selectedDiscount === 20
                ? "border-green-600 bg-green-50 text-green-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            } disabled:opacity-50`}
          >
            20%
          </button>
          <button
            onClick={() => handleDiscountChange(50)}
            disabled={processing}
            className={`flex-1 px-4 py-2 border rounded-lg font-medium transition-colors ${
              selectedDiscount === 50
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            } disabled:opacity-50`}
          >
            50%
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Discount will be applied to user's ride fares. Only available for
          verified passengers.
        </p>
      </div>
    </div>
  );
}

// Helper Component: Info Row
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default DriverDetailsScreen;
