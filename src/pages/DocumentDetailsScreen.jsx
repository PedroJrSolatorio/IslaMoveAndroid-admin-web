import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { db } from "../config/firebase";
import {
  sendPassengerApprovalEmail,
  sendPassengerRejectionEmail,
} from "../services/BrevoEmailService";

const DocumentStatus = {
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

function DocumentDetailsScreen({
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
          };
        }
      } else {
        // For driver documents
        documentData = userData.driverData?.documents?.[documentType];
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
                disabled={processing || !comments || comments.trim() === ""}
                className="flex-1 px-4 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Document
              </button>
              <button
                onClick={approveDocument}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
              >
                Approve Document
              </button>
            </div>
          )}
        </div>
      </div>
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

export default DocumentDetailsScreen;
