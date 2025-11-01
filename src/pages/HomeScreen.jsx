import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

  useEffect(() => {
    // Subscription for Users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

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
        onlineDrivers: prev.onlineDrivers,
        totalPassengers,
      }));
    });

    // Realtime Database Listener for online status
    const driversStatusRef = ref(rtdb, "driver_status");

    const unsubRtdb = onValue(driversStatusRef, (snapshot) => {
      let onlineCount = 0;
      const statusData = snapshot.val(); // Get all status data

      if (statusData) {
        // Iterate through all drivers in the 'driver_status' node
        Object.values(statusData).forEach((status) => {
          // Count if the driver object has 'online: true'
          if (status.online === true) {
            onlineCount++;
          }
        });
      }

      // Update the state with the online driver count
      setStats((prev) => ({ ...prev, onlineDrivers: onlineCount }));
    });

    // Subscription for Bookings
    const unsubBookings = onSnapshot(
      query(
        collection(db, "bookings"),
        where("status", "in", ["ACCEPTED", "DRIVER_ARRIVED", "IN_PROGRESS"])
      ),
      (snapshot) => {
        setStats((prev) => ({ ...prev, ongoingRides: snapshot.size }));
      }
    );

    // Subscription for completed rides today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const unsubCompleted = onSnapshot(
      query(collection(db, "bookings"), where("status", "==", "COMPLETED")),
      (snapshot) => {
        const completedBookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const completedToday = completedBookings.filter((booking) => {
          const completionTimestamp = booking.completionTime;
          return completionTimestamp && completionTimestamp >= todayTimestamp;
        }).length;

        setStats((prev) => ({ ...prev, completedToday }));

        // Get recent activity from all bookings
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
      }
    );

    // Subscription for reports
    const unsubDriverReports = onSnapshot(
      query(collection(db, "driver_reports"), where("status", "==", "PENDING")),
      (snapshot) => {
        const count = snapshot.size;
        setReportsCount((prev) => ({ ...prev, driver: count }));
      }
    );

    const unsubPassengerReports = onSnapshot(
      query(
        collection(db, "passenger_reports"),
        where("status", "==", "pending")
      ),
      (snapshot) => {
        const count = snapshot.size;
        setReportsCount((prev) => ({ ...prev, passenger: count }));
      }
    );

    const unsubSupportComments = onSnapshot(
      query(collection(db, "supportTickets"), where("status", "==", "open")),
      (snapshot) => {
        const count = snapshot.size;
        setReportsCount((prev) => ({ ...prev, support: count }));
      }
    );

    return () => {
      unsubUsers();
      unsubRtdb();
      unsubBookings();
      unsubCompleted();
      unsubDriverReports();
      unsubPassengerReports();
      unsubSupportComments();
    };
  }, []);

  useEffect(() => {
    const total =
      reportsCount.driver + reportsCount.passenger + reportsCount.support;
    setStats((prev) => ({ ...prev, totalReports: total }));
  }, [reportsCount]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Status */}
        <div className="bg-white rounded-lg shadow p-6">
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
      <div className="bg-white rounded-lg shadow p-6">
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
                description={`Fare: ₱${activity.data.actualFare || 0}`}
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
      </div>
    </div>
  );
}
