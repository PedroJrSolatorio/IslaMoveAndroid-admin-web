import React, { useState, useEffect } from "react";
import {
  Trash2,
  Clock,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { auth } from "../config/firebase";

export default function ScheduledDeletionsView() {
  const [scheduledDeletions, setScheduledDeletions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScheduledDeletions();
  }, []);

  const fetchScheduledDeletions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const idToken = await currentUser.getIdToken();

      const apiUrl = import.meta.env.VITE_BACKEND_URL;

      console.log(
        "Fetching scheduled deletions from:",
        `${apiUrl}/api/admin/scheduled-deletions`
      );

      const response = await fetch(`${apiUrl}/api/admin/scheduled-deletions`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `HTTP ${response.status}: Failed to fetch scheduled deletions`
        );
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Response text:", text);
        throw new Error(
          "Server returned invalid JSON. Check console for details."
        );
      }

      setScheduledDeletions(data.scheduledDeletions || []);
    } catch (err) {
      console.error("Error fetching scheduled deletions:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemainingColor = (days) => {
    if (days <= 3) return "text-red-600 bg-red-100";
    if (days <= 7) return "text-orange-600 bg-orange-100";
    if (days <= 14) return "text-yellow-600 bg-yellow-100";
    return "text-blue-600 bg-blue-100";
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Loading scheduled deletions...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <p className="text-red-800 font-medium">
                Error loading scheduled deletions
              </p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchScheduledDeletions}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Scheduled Account Deletions
              </h2>
              <p className="text-sm text-gray-600">
                Users who have requested account deletion
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchScheduledDeletions}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {scheduledDeletions.length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {scheduledDeletions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Automatic Deletion Notice</p>
              <p>
                These accounts will be automatically deleted after 30 days if
                users don't log in. The deletion is cancelled automatically if
                the user logs in before the scheduled date.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Deletions List */}
      {scheduledDeletions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-green-100 rounded-full mb-4">
              <Trash2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Scheduled Deletions
            </h3>
            <p className="text-gray-600">
              There are currently no accounts scheduled for deletion.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledDeletions
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .map((user) => (
              <div
                key={user.uid}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 border-red-500"
              >
                <div className="flex items-start justify-between">
                  {/* User Info */}
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Days Remaining Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className={`px-4 py-3 rounded-lg text-center ${getDaysRemainingColor(
                          user.daysRemaining
                        )}`}
                      >
                        <div className="text-2xl font-bold">
                          {user.daysRemaining}
                        </div>
                        <div className="text-xs font-medium">
                          {user.daysRemaining === 1 ? "day" : "days"}
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {user.displayName || "Unknown User"}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.userType === "DRIVER"
                              ? "bg-blue-100 text-blue-700"
                              : user.userType === "PASSENGER"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.userType}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        {user.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                        {user.phoneNumber && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{user.phoneNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              <span className="font-medium">Requested:</span>{" "}
                              {formatDate(user.deletionScheduledAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              <span className="font-medium">Scheduled:</span>{" "}
                              {formatDate(user.deletionExecutionDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0 ml-4">
                    <div className="flex flex-col items-end space-y-2">
                      <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        Pending Deletion
                      </div>
                      <span className="text-xs text-gray-500">
                        {/* ID: {user.uid.substring(0, 8)}... */}
                        ID: {user.uid}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Legend */}
      {scheduledDeletions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Days Remaining Color Code:
          </h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-100"></div>
              <span className="text-gray-600">≤ 3 days (Critical)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-orange-100"></div>
              <span className="text-gray-600">4-7 days (Urgent)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-100"></div>
              <span className="text-gray-600">8-14 days (Soon)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-blue-100"></div>
              <span className="text-gray-600">15+ days (Scheduled)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
