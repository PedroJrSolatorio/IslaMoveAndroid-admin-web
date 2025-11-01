import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { User, Search, Flag, MessageSquare, ChevronDown } from "lucide-react";
import { db } from "../config/firebase";

// Enums matching Android
const UserFilter = {
  ALL: "ALL",
  PASSENGER: "PASSENGER",
  DRIVER: "DRIVER",
};

const StatusFilter = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
  VERIFIED: "VERIFIED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  UNDER_REVIEW: "UNDER_REVIEW",
};

const VerificationStatus = {
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  UNDER_REVIEW: "UNDER_REVIEW",
};

export default function ManageUsersScreen({ onNavigateToUserDetail }) {
  const [users, setUsers] = useState([]);
  const [driverReportCounts, setDriverReportCounts] = useState({});
  const [passengerReportCounts, setPassengerReportCounts] = useState({});
  const [userCommentCounts, setUserCommentCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(UserFilter.ALL);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(
    StatusFilter.ALL
  );
  const [isStatusDropdownExpanded, setIsStatusDropdownExpanded] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load users with real-time updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userList = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
        setIsLoading(false);

        // Load comment counts after users are loaded
        loadUserCommentCounts(userList);
      },
      (error) => {
        console.error("Error loading users:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load driver report counts
  useEffect(() => {
    loadDriverReportCounts();
  }, []);

  // Load passenger report counts
  useEffect(() => {
    loadPassengerReportCounts();
  }, []);

  const loadDriverReportCounts = async () => {
    try {
      const reportsQuery = query(
        collection(db, "driver_reports"),
        where("status", "in", ["PENDING", "UNDER_REVIEW"])
      );

      const snapshot = await getDocs(reportsQuery);
      const counts = {};

      snapshot.docs.forEach((doc) => {
        const report = doc.data();
        const driverId = report.driverId;
        counts[driverId] = (counts[driverId] || 0) + 1;
      });

      setDriverReportCounts(counts);
      console.log("Loaded driver report counts:", counts);
    } catch (error) {
      console.error("Error loading driver report counts:", error);
      setDriverReportCounts({});
    }
  };

  const loadPassengerReportCounts = async () => {
    try {
      const reportsQuery = query(
        collection(db, "passenger_reports"),
        where("status", "in", ["pending", "under_review"])
      );

      const snapshot = await getDocs(reportsQuery);
      const counts = {};

      snapshot.docs.forEach((doc) => {
        const report = doc.data();
        const passengerId = report.passengerId;
        counts[passengerId] = (counts[passengerId] || 0) + 1;
      });

      setPassengerReportCounts(counts);
      console.log("Loaded passenger report counts:", counts);
    } catch (error) {
      console.error("Error loading passenger report counts:", error);
      setPassengerReportCounts({});
    }
  };

  const loadUserCommentCounts = async (userList) => {
    try {
      const counts = {};

      for (const user of userList) {
        const commentsQuery = query(
          collection(db, "support_comments"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(commentsQuery);
        if (snapshot.size > 0) {
          counts[user.uid] = snapshot.size;
        }
      }

      setUserCommentCounts(counts);
      console.log("Loaded user comment counts:", counts);
    } catch (error) {
      console.error("Error loading user comment counts:", error);
      setUserCommentCounts({});
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isActive: !currentStatus,
        updatedAt: Date.now(),
      });
      console.log(`Updated user ${userId} status to ${!currentStatus}`);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users
    .filter((user) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phoneNumber?.includes(searchQuery);

      // Type filter
      const matchesType =
        selectedFilter === UserFilter.ALL || user.userType === selectedFilter;

      // Status filter
      let matchesStatus = true;
      if (selectedStatusFilter !== StatusFilter.ALL) {
        switch (selectedStatusFilter) {
          case StatusFilter.ACTIVE:
            matchesStatus = user.isActive === true;
            break;
          case StatusFilter.BLOCKED:
            matchesStatus = user.isActive === false;
            break;
          case StatusFilter.VERIFIED:
            matchesStatus =
              user.userType === "DRIVER" &&
              user.driverData?.verificationStatus ===
                VerificationStatus.APPROVED;
            break;
          case StatusFilter.PENDING:
            matchesStatus =
              user.userType === "DRIVER" &&
              (!user.driverData?.verificationStatus ||
                user.driverData?.verificationStatus ===
                  VerificationStatus.PENDING);
            break;
          case StatusFilter.REJECTED:
            matchesStatus =
              user.userType === "DRIVER" &&
              user.driverData?.verificationStatus ===
                VerificationStatus.REJECTED;
            break;
          case StatusFilter.UNDER_REVIEW:
            matchesStatus =
              user.userType === "DRIVER" &&
              user.driverData?.verificationStatus ===
                VerificationStatus.UNDER_REVIEW;
            break;
          default:
            matchesStatus = true;
        }
      }

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );

  const getStatusFilterOptions = () => {
    switch (selectedFilter) {
      case UserFilter.PASSENGER:
        return [StatusFilter.ALL, StatusFilter.ACTIVE, StatusFilter.BLOCKED];
      case UserFilter.DRIVER:
        return [
          StatusFilter.ALL,
          StatusFilter.VERIFIED,
          StatusFilter.PENDING,
          StatusFilter.REJECTED,
          StatusFilter.UNDER_REVIEW,
        ];
      default:
        return [StatusFilter.ALL];
    }
  };

  const getStatusFilterText = (filter) => {
    switch (filter) {
      case StatusFilter.ALL:
        return "Status";
      case StatusFilter.ACTIVE:
        return "Active";
      case StatusFilter.BLOCKED:
        return "Blocked";
      case StatusFilter.VERIFIED:
        return "Verified";
      case StatusFilter.PENDING:
        return "Pending";
      case StatusFilter.REJECTED:
        return "Rejected";
      case StatusFilter.UNDER_REVIEW:
        return "Under Review";
      default:
        return "Status";
    }
  };

  const getStatusBadge = (user) => {
    if (user.userType === "DRIVER") {
      const status = user.driverData?.verificationStatus;
      switch (status) {
        case VerificationStatus.APPROVED:
          return {
            bg: "bg-green-100",
            text: "text-green-700",
            label: "Verified",
          };
        case VerificationStatus.PENDING:
          return {
            bg: "bg-orange-100",
            text: "text-orange-700",
            label: "Pending",
          };
        case VerificationStatus.REJECTED:
          return { bg: "bg-red-100", text: "text-red-700", label: "Rejected" };
        case VerificationStatus.UNDER_REVIEW:
          return {
            bg: "bg-blue-100",
            text: "text-blue-700",
            label: "Under Review",
          };
        default:
          return { bg: "bg-gray-100", text: "text-gray-700", label: "Pending" };
      }
    } else {
      // For passengers and admins
      if (!user.isActive) {
        return { bg: "bg-red-100", text: "text-red-700", label: "Blocked" };
      }
      return { bg: "bg-green-100", text: "text-green-700", label: "Active" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Manage Users</h1>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* User Type Filters */}
          <button
            onClick={() => {
              setSelectedFilter(UserFilter.ALL);
              setSelectedStatusFilter(StatusFilter.ALL);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedFilter === UserFilter.ALL
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setSelectedFilter(UserFilter.PASSENGER);
              setSelectedStatusFilter(StatusFilter.ALL);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedFilter === UserFilter.PASSENGER
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Passenger
          </button>
          <button
            onClick={() => {
              setSelectedFilter(UserFilter.DRIVER);
              setSelectedStatusFilter(StatusFilter.ALL);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedFilter === UserFilter.DRIVER
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Driver
          </button>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setIsStatusDropdownExpanded(!isStatusDropdownExpanded)
              }
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200"
            >
              <span>{getStatusFilterText(selectedStatusFilter)}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isStatusDropdownExpanded && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                {getStatusFilterOptions().map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setSelectedStatusFilter(filter);
                      setIsStatusDropdownExpanded(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    {getStatusFilterText(filter)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const statusBadge = getStatusBadge(user);
          const reportCount =
            user.userType === "DRIVER"
              ? driverReportCounts[user.uid] || 0
              : passengerReportCounts[user.uid] || 0;
          const commentCount = userCommentCounts[user.uid] || 0;

          return (
            <div
              key={user.uid}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateToUserDetail(user.uid)}
            >
              <div className="flex items-center justify-between">
                {/* Left: User Info */}
                <div className="flex items-center space-x-3">
                  {/* Profile Image */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.displayName}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <span className="text-gray-600 font-medium text-sm">
                      {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>

                  {/* User Details */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.displayName || "No Name"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {user.userType === "DRIVER"
                        ? "Driver"
                        : user.userType === "ADMIN"
                        ? "Admin"
                        : "Passenger"}
                    </p>
                  </div>
                </div>

                {/* Right: Badges and Status */}
                <div className="flex items-center space-x-2">
                  {/* Driver Report Badge */}
                  {user.userType === "DRIVER" && reportCount > 0 && (
                    <>
                      <Flag className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-600">
                        {reportCount}
                      </span>
                    </>
                  )}

                  {/* Passenger Report Badge */}
                  {user.userType === "PASSENGER" && reportCount > 0 && (
                    <>
                      <Flag className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-600">
                        {reportCount}
                      </span>
                    </>
                  )}

                  {/* Comment Badge */}
                  {commentCount > 0 && (
                    <>
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-600">
                        {commentCount}
                      </span>
                    </>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
