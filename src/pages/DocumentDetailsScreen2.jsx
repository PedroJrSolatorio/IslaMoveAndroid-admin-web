import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, FileText } from "lucide-react";
import { db } from "../config/firebase";

const DocumentStatus = {
  PENDING: "PENDING",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export default function DocumentDetailsScreen2({
  userId,
  documentType,
  documentTitle,
  userType,
  onNavigateBack,
}) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [userId, documentType]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        console.error("User not found");
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
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
        };
      } else if (userData.driverData?.documents?.[documentType]) {
        // Driver document
        docData = userData.driverData.documents[documentType];
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
    try {
      setProcessing(true);

      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.APPROVED,
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.APPROVED,
          [`driverData.documents.${documentType}.rejectionReason`]: null,
          updatedAt: Date.now(),
        });
      }

      alert("Document approved successfully");
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
      setProcessing(true);

      if (documentType === "passenger_id") {
        await updateDoc(doc(db, "users", userId), {
          "studentDocument.status": DocumentStatus.REJECTED,
          "studentDocument.rejectionReason": comments,
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(doc(db, "users", userId), {
          [`driverData.documents.${documentType}.status`]:
            DocumentStatus.REJECTED,
          [`driverData.documents.${documentType}.rejectionReason`]: comments,
          updatedAt: Date.now(),
        });
      }

      alert("Document rejected");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-gray-600">Document not found</p>
      </div>
    );
  }

  const uniqueImages =
    document.images?.filter(
      (img, index, self) => index === self.findIndex((t) => t.url === img.url)
    ) || [];

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

        {/* Document Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Document Information</h2>

          <InfoRow
            label="Document Type"
            value={documentTitle.replace(/_/g, " ")}
          />
          <InfoRow
            label="Upload Date"
            value={formatDate(document.uploadedAt)}
          />

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
      </div>

      {/* Action Buttons */}
      {document.status !== DocumentStatus.APPROVED && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button
              onClick={rejectDocument}
              disabled={!comments.trim() || processing}
              className="flex-1 px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : "Reject Document"}
            </button>
            <button
              onClick={approveDocument}
              disabled={processing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
