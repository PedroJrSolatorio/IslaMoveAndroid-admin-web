import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ArrowLeft, AlertCircle } from "lucide-react";
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

function DocumentDetailsScreen({
  ////this screen is for viewing documents User Verification tab
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
  const [processing, setProcessing] = useState(false);
  const [comments, setComments] = useState("");
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
    setLoading(true);
    setError(null);

    try {
      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const userData = { id: userDoc.id, ...userDoc.data() };
      setUser(userData);

      // Get the document based on type
      let documentData = null;

      if (documentType === "passenger_id") {
        // For passenger ID
        if (userData.studentDocument && userData.studentDocument.studentIdUrl) {
          documentData = {
            images: [
              {
                url: userData.studentDocument.studentIdUrl,
                description: "Valid ID",
                uploadedAt: userData.studentDocument.uploadedAt,
              },
            ],
            status: userData.studentDocument.status,
            rejectionReason: userData.studentDocument.rejectionReason,
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
        }
      } else {
        // For driver documents
        documentData = userData.driverData?.documents?.[documentType];

        if (documentData?.expiryDate) {
          const date = new Date(documentData.expiryDate);
          setExpiryDate(date.toISOString().split("T")[0]);
        }
      }

      if (!documentData) {
        setError("Document not found");
        setLoading(false);
        return;
      }

      setDocument(documentData);
      setComments(documentData.rejectionReason || "");
    } catch (err) {
      console.error("Error loading document details:", err);
      setError("Failed to load document details");
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

    setProcessing(true);

    try {
      if (documentType === "passenger_id") {
        // Approve passenger ID
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.APPROVED,
          "studentDocument.verificationDate": Date.now(),
          "studentDocument.rejectionReason": null,
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
        // Approve driver document
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.APPROVED,
          [`driverData.documents.${documentType}.rejectionReason`]: null,
          updatedAt: Date.now(),
        });

        alert("Document approved successfully");
      }

      onNavigateBack();
    } catch (err) {
      console.error("Error approving document:", err);
      alert("Failed to approve document");
    } finally {
      setProcessing(false);
    }
  };

  const rejectDocument = async () => {
    if (!comments || comments.trim() === "") {
      alert("Please enter a rejection reason");
      return;
    }

    console.log("🔍 Rejecting document type:", documentType);
    setProcessing(true);

    try {
      if (documentType === "passenger_id") {
        // Reject passenger ID
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.REJECTED,
          "studentDocument.rejectionReason": comments.trim(),
          "studentDocument.verificationDate": Date.now(),
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
        // Reject driver document
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.REJECTED,
          [`driverData.documents.${documentType}.rejectionReason`]:
            comments.trim(),
          updatedAt: Date.now(),
        });

        // // Delete ONLY this specific document type from Cloudinary
        // try {
        //   const tempUserId = user.email;
        //   const idToken = await auth.currentUser.getIdToken();

        //   const response = await fetch(
        //     `${BACKEND_URL}/api/delete-specific-temp-doc`,
        //     {
        //       method: "POST",
        //       headers: {
        //         "Content-Type": "application/json",
        //         Authorization: `Bearer ${idToken}`,
        //       },
        //       body: JSON.stringify({
        //         tempUserId,
        //         documentType,
        //       }),
        //     }
        //   );

        //   const data = await response.json();
        //   console.log(
        //     `✅ Deleted ${data.deletedCount} temp file(s) for ${documentType}`
        //   );
        // } catch (deleteError) {
        //   console.error("⚠️ Failed to delete temp files:", deleteError);
        //   // Don't fail rejection if deletion fails
        // }

        alert("Document rejected");
      }

      onNavigateBack();
    } catch (err) {
      console.error("Error rejecting document:", err);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 text-lg font-medium">
            {error || "Document not found"}
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

  const isApproved = document.status === DocumentStatus.APPROVED;
  const uniqueImages = document.images
    ? [...new Map(document.images.map((img) => [img.url, img])).values()]
    : [];

  const additionalPhotosRequired = document.additionalPhotosRequired || [];
  const additionalPhotos = document.additionalPhotos || {};

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
              Document Details
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Document Images Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                  className={`rounded-lg overflow-hidden border border-gray-200 ${
                    uniqueImages.length === 1 ? "max-w-2xl mx-auto" : ""
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${documentTitle} - ${image.description || index + 1}`}
                    className="w-full h-auto object-contain bg-gray-50"
                    style={{
                      maxHeight: uniqueImages.length === 1 ? "600px" : "400px",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">No image available</p>
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Document Information
          </h2>

          <div className="space-y-4">
            {/* Document Type */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Document Type</span>
              <span className="font-medium text-gray-900">{documentTitle}</span>
            </div>

            {/* Upload Date */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Upload Date</span>
              <span className="font-medium text-gray-900">
                {new Date(document.uploadedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>

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
                        (Date.now() - document.expiryDate) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days ago
                      {")"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Status */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Status</span>
              <StatusBadge status={document.status} />
            </div>

            {/* Comments Section */}
            <div className="pt-4">
              <label className="block text-gray-700 font-medium mb-2">
                Rejection Reason / Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={isApproved}
                placeholder={
                  isApproved
                    ? "Document has been approved"
                    : "Enter rejection reason (required to reject document)..."
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-600"
                rows="6"
              />

              {!isApproved && (!comments || comments.trim() === "") && (
                <p className="text-sm text-red-600 mt-2">
                  * Rejection reason is required to reject this document
                </p>
              )}
            </div>
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

        {/* Bottom Spacer for Fixed Action Bar */}
        <div className="h-24"></div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {isApproved ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium">✓ Document Approved</p>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={rejectDocument}
                disabled={
                  processing ||
                  !comments ||
                  comments.trim() === "" ||
                  expiryLoading ||
                  additionalPhotoLoading
                }
                className="flex-1 px-4 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  "Reject Document"
                )}
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
                className="flex-1 px-4 py-3 !bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
              >
                Approve Document
              </button>
            </div>
          )}
        </div>
      </div>

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

// Status Badge Component
function StatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return {
          text: "Approved",
          color: "text-green-600 bg-green-50 border-green-200",
        };
      case DocumentStatus.REJECTED:
        return {
          text: "Rejected",
          color: "text-red-600 bg-red-50 border-red-200",
        };
      case DocumentStatus.PENDING_REVIEW:
        return {
          text: "Under Review",
          color: "text-blue-600 bg-blue-50 border-blue-200",
        };
      default:
        return {
          text: "Pending",
          color: "text-yellow-600 bg-yellow-50 border-yellow-200",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-full border ${config.color}`}
    >
      {config.text}
    </span>
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

export default DocumentDetailsScreen;
