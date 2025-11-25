import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../config/firebase";
import {
  CheckCircle,
  Clock,
  Car,
  Users,
  TrendingUp,
  User,
  AlertCircle,
} from "lucide-react";

// ✅ THROTTLE: Prevent excessive updates
const THROTTLE_DELAY = 3000; // 3 seconds

function QuickActionCard({
  icon: Icon,
  title,
  count,
  description,
  color,
  onClick,
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
    green: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100",
    purple:
      "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100",
    yellow:
      "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100",
    red: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
  };

  return (
    <button
      onClick={onClick}
      className={`${colors[color]} border-2 rounded-lg p-4 text-left hover:shadow-md transition-all w-full`}
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-6 h-6 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-2xl font-bold my-1">{count}</p>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ActivityItem({ icon: Icon, title, description, time, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`${colors[color]} p-2 rounded-lg`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

export default function HomeScreen({ onNavigate }) {
  const [stats, setStats] = useState({
    verifiedDrivers: 0,
    pendingApplications: 0,
    ongoingRides: 0,
    totalUsers: 0,
    onlineDrivers: 0,
    totalPassengers: 0,
    completedToday: 0,
    totalReports: 0,
  });

  const [reportsCount, setReportsCount] = useState({
    driver: 0,
    passenger: 0,
    support: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  // ✅ Throttling refs
  const lastUpdateTime = useRef(0);
  const pendingUpdate = useRef(null);

  // ✅ Helper function to throttle updates
  const throttledSetStats = (updateFn) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    if (timeSinceLastUpdate >= THROTTLE_DELAY) {
      updateFn();
      lastUpdateTime.current = now;
    } else {
      // Clear any pending update
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
      // Schedule update
      pendingUpdate.current = setTimeout(() => {
        updateFn();
        lastUpdateTime.current = Date.now();
      }, THROTTLE_DELAY - timeSinceLastUpdate);
    }
  };

  useEffect(() => {
    // ✅ Define todayTimestamp at the top
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // ✅ Single listener for users with metadata changes disabled
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        throttledSetStats(() => {
          const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const verifiedDrivers = users.filter(
            (u) =>
              u.userType === "DRIVER" &&
              u.driverData?.verificationStatus === "APPROVED"
          ).length;

          const pendingDrivers = users.filter(
            (u) =>
              u.userType === "DRIVER" &&
              ["PENDING", "UNDER_REVIEW", "REJECTED"].includes(
                u.driverData?.verificationStatus
              )
          ).length;

          const pendingPassengers = users.filter(
            (u) =>
              u.userType === "PASSENGER" &&
              ["PENDING", "PENDING_REVIEW", "REJECTED"].includes(
                u.studentDocument?.status
              )
          ).length;

          const totalPassengers = users.filter(
            (u) => u.userType === "PASSENGER"
          ).length;

          setStats((prev) => ({
            ...prev,
            verifiedDrivers,
            pendingApplications: pendingDrivers + pendingPassengers,
            totalUsers: users.length,
            totalPassengers,
          }));
        });
      },
      { includeMetadataChanges: false } // ✅ Critical: Ignore metadata changes
    );

    // ✅ RTDB listener for online drivers
    const driversStatusRef = ref(rtdb, "driver_status");
    const unsubRtdb = onValue(driversStatusRef, (snapshot) => {
      throttledSetStats(() => {
        let onlineCount = 0;
        const statusData = snapshot.val();

        if (statusData) {
          Object.values(statusData).forEach((status) => {
            if (status.online === true) {
              onlineCount++;
            }
          });
        }

        setStats((prev) => ({ ...prev, onlineDrivers: onlineCount }));
      });
    });

    // ✅ Single listener for bookings with limit
    const unsubBookings = onSnapshot(
      query(
        collection(db, "bookings"),
        where("requestTime", ">=", todayTimestamp),
        limit(200)
      ),
      (snapshot) => {
        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter in memory
        const ongoingRides = bookings.filter((b) =>
          ["ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(b.status)
        ).length;

        const completedBookings = bookings.filter(
          (b) => b.status === "COMPLETED"
        );

        const currentTime = Date.now();
        const completedToday = completedBookings.filter(
          (b) => b.requestTime >= todayTimestamp && b.requestTime <= currentTime
        ).length;

        // ✅ UPDATE IMMEDIATELY (no throttle for bookings - they're already limited)
        setStats((prev) => ({ ...prev, ongoingRides, completedToday }));

        // Recent activity (top 5)
        const activities = completedBookings
          .sort((a, b) => (b.completionTime || 0) - (a.completionTime || 0))
          .slice(0, 5)
          .map((booking) => ({
            id: booking.id,
            type: "ride_completed",
            timestamp: booking.completionTime,
            data: booking,
          }));

        setRecentActivity(activities);
      },
      { includeMetadataChanges: false }
    );

    // ✅ Reports listener (NO throttling - these update infrequently)
    const unsubDriverReports = onSnapshot(
      query(
        collection(db, "driver_reports"),
        where("status", "==", "PENDING"),
        limit(100)
      ),
      (snapshot) => {
        setReportsCount((prev) => ({ ...prev, driver: snapshot.size }));
      },
      { includeMetadataChanges: false }
    );

    const unsubPassengerReports = onSnapshot(
      query(
        collection(db, "passenger_reports"),
        where("status", "==", "pending"),
        limit(100)
      ),
      (snapshot) => {
        setReportsCount((prev) => ({ ...prev, passenger: snapshot.size }));
      },
      { includeMetadataChanges: false }
    );

    const unsubSupportComments = onSnapshot(
      query(
        collection(db, "supportTickets"),
        where("status", "==", "open"),
        limit(100)
      ),
      (snapshot) => {
        setReportsCount((prev) => ({ ...prev, support: snapshot.size }));
      },
      { includeMetadataChanges: false }
    );

    return () => {
      unsubUsers();
      unsubRtdb();
      unsubBookings();
      unsubDriverReports();
      unsubPassengerReports();
      unsubSupportComments();
      if (pendingUpdate.current) {
        clearTimeout(pendingUpdate.current);
      }
    };
  }, []);

  useEffect(() => {
    const total =
      reportsCount.driver + reportsCount.passenger + reportsCount.support;
    setStats((prev) => ({ ...prev, totalReports: total }));
  }, [reportsCount.driver, reportsCount.passenger, reportsCount.support]);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "purple",
    },
    {
      title: "Total Drivers",
      value: stats.verifiedDrivers,
      icon: CheckCircle,
      color: "blue",
    },
    {
      title: "Total Passengers",
      value: stats.totalPassengers,
      icon: User,
      color: "green",
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      icon: TrendingUp,
      color: "yellow",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid - Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colors = {
            blue: "bg-blue-500",
            yellow: "bg-yellow-500",
            green: "bg-green-500",
            purple: "bg-purple-500",
          };

          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${colors[stat.color]} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Items - Things that need attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Live Status */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Live Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Online Drivers</p>
                  <p className="text-sm text-gray-600">Available for rides</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {stats.onlineDrivers}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ongoing Rides</p>
                  <p className="text-sm text-gray-600">
                    Active rides in progress
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {stats.ongoingRides}
              </p>
            </div>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
            Needs Attention
          </h2>
          <div className="space-y-3">
            <QuickActionCard
              icon={Clock}
              title="Pending Verifications"
              count={stats.pendingApplications}
              description="Applications awaiting review"
              color="yellow"
              onClick={() => onNavigate?.("verification")}
            />
            <QuickActionCard
              icon={AlertCircle}
              title="Reports & Feedback"
              count={stats.totalReports}
              description="User reports and feedback to review"
              color="red"
              onClick={() => onNavigate?.("reports")}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <ActivityItem
                key={activity.id}
                icon={Car}
                title="Ride Completed"
                description={`Fare: ₱${
                  activity.fareEstimate?.totalEstimate || 0
                }`}
                time={
                  new Date(activity.timestamp).toLocaleString() || "Unknown"
                }
                color="green"
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
}
