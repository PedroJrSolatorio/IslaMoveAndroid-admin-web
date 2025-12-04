import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ArrowLeft, FileText } from "lucide-react";
import { db, auth } from "../config/firebase";
import {
  sendPassengerApprovalEmail,
  sendPassengerRejectionEmail,
} from "../services/BrevoEmailService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const DocumentStatus = {
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export default function DocumentDetailsScreen2({
  //this screen is for viewing documents Manage Users tab
  userId,
  documentType,
  documentTitle,
  userType,
  onNavigateBack,
}) {
  const [user, setUser] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [showAdditionalPhotoDialog, setShowAdditionalPhotoDialog] =
    useState(false);
  const [additionalPhotoType, setAdditionalPhotoType] = useState("");
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [additionalPhotoLoading, setAdditionalPhotoLoading] = useState(false);

  useEffect(() => {
    loadDocumentDetails();
  }, [userId, documentType]);

  const loadDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      setUser(userData);

      let docData = null;

      if (documentType === "passenger_id" && userData.studentDocument) {
        // Passenger valid ID
        docData = {
          images: userData.studentDocument.studentIdUrl
            ? [
                {
                  url: userData.studentDocument.studentIdUrl,
                  description: "Valid ID",
                  uploadedAt: userData.studentDocument.uploadedAt,
                },
              ]
            : [],
          status: userData.studentDocument.status,
          rejectionReason: userData.studentDocument.rejectionReason || "",
          uploadedAt: userData.studentDocument.uploadedAt,
          expiryDate: userData.studentDocument.expiryDate || null,
          additionalPhotosRequired:
            userData.studentDocument.additionalPhotosRequired || [],
          additionalPhotos: userData.studentDocument.additionalPhotos || {},
        };

        if (userData.studentDocument.expiryDate) {
          const date = new Date(userData.studentDocument.expiryDate);
          setExpiryDate(date.toISOString().split("T")[0]);
        }
      } else if (userData.driverData?.documents?.[documentType]) {
        // Driver document
        docData = userData.driverData.documents[documentType];

        if (docData?.expiryDate) {
          const date = new Date(docData.expiryDate);
          setExpiryDate(date.toISOString().split("T")[0]);
        }
      }

      setDocument(docData);
      setComments(docData?.rejectionReason || "");
    } catch (error) {
      console.error("Error loading document:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveDocument = async () => {
    // Only check expiry date for passenger_id and insurance (franchise certificate)
    if (
      (documentType === "passenger_id" || documentType === "insurance") &&
      !expiryDate
    ) {
      alert("Please set expiry date for this document type");
      return;
    }

    try {
      console.log("🔍 Approving document type:", documentType);
      setProcessing(true);

      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.APPROVED,
          updatedAt: Date.now(),
        });

        // Send approval email for passenger
        const emailResult = await sendPassengerApprovalEmail(user);
        if (!emailResult.success) {
          console.error("Failed to send approval email:", emailResult.error);
        }

        // Delete temp files from Cloudinary
        try {
          const tempUserId = user.email; // Use email as tempUserId
          const idToken = await auth.currentUser.getIdToken();

          const response = await fetch(
            `${BACKEND_URL}/api/delete-temp-registration-docs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ tempUserId }),
            }
          );

          const data = await response.json();
          console.log(`✅ Deleted ${data.deletedCount} temp files`);
        } catch (deleteError) {
          console.error("⚠️ Failed to delete temp files:", deleteError);
          // Don't fail approval if deletion fails
        }

        alert(
          "Document approved successfully" +
            (emailResult.success ? " and email sent" : "")
        );
      } else {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.APPROVED,
          [`driverData.documents.${documentType}.rejectionReason`]: null,
          updatedAt: Date.now(),
        });

        // Delete ONLY this specific document type from Cloudinary
        try {
          const tempUserId = user.email;
          const idToken = await auth.currentUser.getIdToken();

          const response = await fetch(
            `${BACKEND_URL}/api/delete-specific-temp-doc`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                tempUserId,
                documentType,
              }),
            }
          );

          const data = await response.json();
          console.log(
            `✅ Deleted ${data.deletedCount} temp file(s) for ${documentType}`
          );
        } catch (deleteError) {
          console.error("⚠️ Failed to delete temp files:", deleteError);
          // Don't fail rejection if deletion fails
        }

        alert("Document approved successfully");
      }

      onNavigateBack();
    } catch (error) {
      console.error("Error approving document:", error);
      alert("Failed to approve document");
    } finally {
      setProcessing(false);
    }
  };

  const rejectDocument = async () => {
    if (!comments.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      console.log("🔍 Rejecting document type:", documentType);
      setProcessing(true);

      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.REJECTED,
          "studentDocument.rejectionReason": comments,
          updatedAt: Date.now(),
        });

        // Send rejection email for passenger
        const emailResult = await sendPassengerRejectionEmail(
          user,
          comments.trim()
        );
        if (!emailResult.success) {
          console.error("Failed to send rejection email:", emailResult.error);
        }

        // Delete temp files from Cloudinary
        try {
          const tempUserId = user.email; // Use email as tempUserId
          const idToken = await auth.currentUser.getIdToken();

          const response = await fetch(
            `${BACKEND_URL}/api/delete-temp-registration-docs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ tempUserId }),
            }
          );

          const data = await response.json();
          console.log(`✅ Deleted ${data.deletedCount} temp files`);
        } catch (deleteError) {
          console.error("⚠️ Failed to delete temp files:", deleteError);
          // Don't fail approval if deletion fails
        }

        alert(
          "Document rejected" + (emailResult.success ? " and email sent" : "")
        );
      } else {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.REJECTED,
          [`driverData.documents.${documentType}.rejectionReason`]: comments,
          updatedAt: Date.now(),
        });

        // Delete ONLY this specific document type from Cloudinary
        try {
          const tempUserId = user.email;
          const idToken = await auth.currentUser.getIdToken();

          const response = await fetch(
            `${BACKEND_URL}/api/delete-specific-temp-doc`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                tempUserId,
                documentType,
              }),
            }
          );

          const data = await response.json();
          console.log(
            `✅ Deleted ${data.deletedCount} temp file(s) for ${documentType}`
          );
        } catch (deleteError) {
          console.error("⚠️ Failed to delete temp files:", deleteError);
          // Don't fail rejection if deletion fails
        }

        alert("Document rejected");
      }

      onNavigateBack();
    } catch (error) {
      console.error("Error rejecting document:", error);
      alert("Failed to reject document");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Function to set expiry date
  const setDocumentExpiry = async () => {
    if (!expiryDate) {
      alert("Please select an expiry date");
      return;
    }

    setExpiryLoading(true);

    try {
      const expiryTimestamp = new Date(expiryDate).getTime();

      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.expiryDate": expiryTimestamp,
          updatedAt: Date.now(),
        });
      } else if (documentType === "insurance") {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.expiryDate`]: expiryTimestamp,
          updatedAt: Date.now(),
        });
      }

      alert("Expiry date set successfully");
      setShowExpiryDialog(false);
      setExpiryDate("");
      loadDocumentDetails();
    } catch (error) {
      console.error("Error setting expiry date:", error);
      alert("Failed to set expiry date");
    } finally {
      setExpiryLoading(false);
    }
  };

  // Function to request additional photos
  const requestAdditionalPhoto = async () => {
    if (!additionalPhotoType.trim()) {
      alert("Please specify what photo is needed");
      return;
    }

    setAdditionalPhotoLoading(true);

    try {
      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.additionalPhotosRequired":
            arrayUnion(additionalPhotoType),
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.additionalPhotosRequired`]:
            arrayUnion(additionalPhotoType),
          updatedAt: Date.now(),
        });
      }

      alert(`Requested additional photo: ${additionalPhotoType}`);
      setShowAdditionalPhotoDialog(false);
      setAdditionalPhotoType("");
      loadDocumentDetails();
    } catch (error) {
      console.error("Error requesting additional photo:", error);
      alert("Failed to request additional photo");
    } finally {
      setAdditionalPhotoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-gray-600">{error || "Document not found"}</p>
        <button
          onClick={onNavigateBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const uniqueImages =
    document.images?.filter(
      (img, index, self) => index === self.findIndex((t) => t.url === img.url)
    ) || [];

  const additionalPhotosRequired = document.additionalPhotosRequired || [];
  const additionalPhotos = document.additionalPhotos || {};

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
          <h1 className="text-xl font-semibold text-gray-900">
            Document Details
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
        {/* Document Images */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Document Images ({uniqueImages.length})
          </h2>

          {uniqueImages.length > 0 ? (
            <div
              className={
                uniqueImages.length === 1
                  ? ""
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
              }
            >
              {uniqueImages.map((image, index) => (
                <div
                  key={index}
                  className={uniqueImages.length === 1 ? "w-full" : ""}
                >
                  <img
                    src={image.url}
                    alt={`${documentTitle} ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-gray-200"
                    style={{
                      maxHeight: uniqueImages.length === 1 ? "500px" : "400px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No image available</p>
            </div>
          )}
        </div>

        {/* Additional Photos Section */}
        {additionalPhotosRequired.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Additional Photos Requested ({additionalPhotosRequired.length})
            </h2>

            <div className="space-y-4">
              {additionalPhotosRequired.map((photoType) => {
                const photoUrl = additionalPhotos[photoType];
                const isUploaded = !!photoUrl;

                return (
                  <div
                    key={photoType}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 capitalize">
                          {photoType.replace(/_/g, " ")}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isUploaded ? "✓ Uploaded" : "⏳ Waiting for upload"}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          isUploaded
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {isUploaded ? "Received" : "Pending"}
                      </span>
                    </div>

                    {isUploaded ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={photoUrl}
                          alt={photoType.replace(/_/g, " ")}
                          className="w-full h-auto object-contain bg-gray-50"
                          style={{ maxHeight: "400px" }}
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <p className="text-gray-500 text-sm">
                          User has not uploaded this photo yet
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Document Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Document Information</h2>

          <InfoRow
            label="Document Type"
            value={
              documentType === "insurance"
                ? "franchise certificate"
                : documentType === "vehicle_inspection"
                ? "vehicle receipt"
                : documentTitle.replace(/_/g, " ")
            }
          />
          <InfoRow
            label="Upload Date"
            value={formatDate(document.uploadedAt)}
          />

          {document.expiryDate && (
            <>
              <InfoRow
                label="Expiry Date"
                value={formatDate(document.expiryDate)}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expiry Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    document.expiryDate < Date.now()
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {document.expiryDate < Date.now() ? "Expired" : "Valid"}
                </span>
              </div>
              {document.expiryDate < Date.now() && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    ⚠️ This document expired on{" "}
                    {formatDate(document.expiryDate)}
                    {" ("}
                    {Math.floor(
                      (Date.now() - document.expiryDate) / (1000 * 60 * 60 * 24)
                    )}{" "}
                    days ago
                    {")"}
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                document.status === DocumentStatus.APPROVED
                  ? "bg-green-100 text-green-700"
                  : document.status === DocumentStatus.REJECTED
                  ? "bg-red-100 text-red-700"
                  : document.status === DocumentStatus.PENDING_REVIEW
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {document.status === DocumentStatus.APPROVED
                ? "Approved"
                : document.status === DocumentStatus.REJECTED
                ? "Rejected"
                : document.status === DocumentStatus.PENDING_REVIEW
                ? "Under Review"
                : "Pending"}
            </span>
          </div>

          {/* Comments/Rejection Reason */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600 block">
              Rejection Reason / Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={document.status === DocumentStatus.APPROVED}
              placeholder={
                document.status === DocumentStatus.REJECTED
                  ? "Edit rejection reason..."
                  : "Enter rejection reason (required to reject document)..."
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-600"
              rows="6"
            />
            {document.status !== DocumentStatus.REJECTED &&
              !comments.trim() && (
                <p className="text-xs text-red-600">
                  * Rejection reason is required to reject this document
                </p>
              )}
          </div>
        </div>

        {/* Additional Actions */}
        <div className="flex space-x-3 mt-3">
          {(documentType === "passenger_id" ||
            documentType === "insurance") && (
            <button
              onClick={() => setShowExpiryDialog(true)}
              disabled={processing || expiryLoading || additionalPhotoLoading}
              className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Set Expiry Date
            </button>
          )}

          <button
            onClick={() => setShowAdditionalPhotoDialog(true)}
            disabled={processing || expiryLoading || additionalPhotoLoading}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Request Additional Photo
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {document.status !== DocumentStatus.APPROVED && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button
              onClick={rejectDocument}
              disabled={
                !comments.trim() ||
                processing ||
                expiryLoading ||
                additionalPhotoLoading
              }
              className="flex-1 px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : "Reject Document"}
            </button>
            <button
              onClick={approveDocument}
              disabled={
                processing ||
                expiryLoading ||
                additionalPhotoLoading ||
                ((documentType === "passenger_id" ||
                  documentType === "insurance") &&
                  !expiryDate)
              }
              className="flex-1 px-6 py-3 !bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : "Approve Document"}
            </button>
          </div>
        </div>
      )}

      {document.status === DocumentStatus.APPROVED && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-lg font-medium text-green-700">
                ✓ Document Approved
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Date Dialog */}
      {showExpiryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Set Expiry Date
            </h3>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowExpiryDialog(false)}
                disabled={expiryLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={setDocumentExpiry}
                disabled={expiryLoading}
                className="flex-1 px-4 py-2 !bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {expiryLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting...
                  </>
                ) : (
                  "Set Expiry"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Photo Dialog */}
      {showAdditionalPhotoDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request Additional Photo
            </h3>
            <input
              type="text"
              value={additionalPhotoType}
              onChange={(e) => setAdditionalPhotoType(e.target.value)}
              placeholder="e.g., 'Clear photo of front side'"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowAdditionalPhotoDialog(false);
                  setAdditionalPhotoType("");
                }}
                disabled={additionalPhotoLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={requestAdditionalPhoto}
                disabled={additionalPhotoLoading}
                className="flex-1 px-4 py-2 !bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {additionalPhotoLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Requesting...
                  </>
                ) : (
                  "Request Photo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
