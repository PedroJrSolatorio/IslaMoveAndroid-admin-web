import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Car,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  Star,
  AlertCircle,
  X,
  Info,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

// Time Period enum
const TimePeriod = {
  TODAY: "TODAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
  YEAR: "YEAR",
};

// ✅ CACHE: Store data to avoid refetching
const analyticsCache = {
  data: null,
  timestamp: 0,
  rawData: null, // Store raw data for client-side filtering
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Firebase Analytics Service
class FirebaseAnalyticsService {
  async getPlatformAnalytics(period) {
    try {
      // ✅ Use cached raw data if available
      const now = Date.now();
      if (
        analyticsCache.rawData &&
        now - analyticsCache.timestamp < CACHE_DURATION
      ) {
        console.log("✅ Using cached data");
        return this.filterDataByPeriod(analyticsCache.rawData, period);
      }

      const periodStart = this.calculatePeriodStart(TimePeriod.YEAR); // ✅ Fetch all data once
      const currentTime = Date.now();

      console.log("🔥 Fetching fresh data from Firestore");

      // Fetch bookings within period
      const bookingsRef = collection(db, "bookings");
      const bookingsQuery = query(
        bookingsRef,
        where("requestTime", ">=", periodStart),
        where("requestTime", "<=", currentTime)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      // Fetch all users
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      // Fetch ratings within period
      const ratingsRef = collection(db, "ratings");
      const ratingsQuery = query(
        ratingsRef,
        where("createdAt", ">=", periodStart),
        where("createdAt", "<=", currentTime)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);

      console.log(
        `Fetched ${bookingsSnapshot.size} bookings, ${usersSnapshot.size} users, ${ratingsSnapshot.size} ratings`
      );

      // ✅ Store raw data in cache
      analyticsCache.rawData = {
        bookings: bookingsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
        users: usersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
        ratings: ratingsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
      analyticsCache.timestamp = now;

      // ✅ Filter for selected period
      return this.filterDataByPeriod(analyticsCache.rawData, period);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }
  }

  // ✅ NEW: Filter cached data by period (client-side)
  filterDataByPeriod(rawData, period) {
    const periodStart = this.calculatePeriodStart(period);
    const currentTime = Date.now();

    // Filter bookings
    const filteredBookings = rawData.bookings.filter(
      (b) => b.requestTime >= periodStart && b.requestTime <= currentTime
    );

    // Filter ratings
    const filteredRatings = rawData.ratings.filter(
      (r) => r.createdAt >= periodStart && r.createdAt <= currentTime
    );

    // Filter users (for new signups)
    const newSignups = rawData.users.filter(
      (u) => u.createdAt >= periodStart
    ).length;
    const activeUsers = rawData.users.filter(
      (u) => u.lastActive >= periodStart
    ).length;

    // Process bookings
    let totalRides = 0;
    let completedRides = 0;
    let cancelledRides = 0;
    let activeRides = 0;
    let totalRevenue = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    filteredBookings.forEach((booking) => {
      totalRides++;

      switch (booking.status) {
        case "COMPLETED":
          completedRides++;
          totalRevenue += booking.actualFare || 0;
          break;
        case "CANCELLED":
        case "EXPIRED":
          cancelledRides++;
          totalRevenue += booking.cancellationFee || 0;
          break;
        case "IN_PROGRESS":
        case "ACCEPTED":
        case "DRIVER_ARRIVING":
        case "DRIVER_ARRIVED":
          activeRides++;
          break;
      }

      if (booking.acceptedTime && booking.acceptedTime > booking.requestTime) {
        totalResponseTime += booking.acceptedTime - booking.requestTime;
        responseTimeCount++;
      }
    });

    // Process ratings
    let totalRating = 0;
    let ratingCount = 0;

    filteredRatings.forEach((rating) => {
      if (rating.stars && rating.stars > 0) {
        totalRating += rating.stars;
        ratingCount++;
      }
    });

    // Process users
    let totalUsers = 0;
    let totalDrivers = 0;
    let totalPassengers = 0;
    let approvedDrivers = 0;
    let onlineDrivers = 0;

    rawData.users.forEach((user) => {
      totalUsers++;

      switch (user.userType) {
        case "DRIVER":
          totalDrivers++;
          if (user.driverData?.verificationStatus === "APPROVED") {
            approvedDrivers++;
          }
          if (user.driverData?.online) {
            onlineDrivers++;
          }
          break;
        case "PASSENGER":
          totalPassengers++;
          break;
      }
    });

    // Calculate metrics
    const completionRate =
      totalRides > 0 ? (completedRides / totalRides) * 100 : 0;
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const avgResponseTime =
      responseTimeCount > 0
        ? Math.floor(totalResponseTime / responseTimeCount / 1000)
        : 0;

    // Calculate peak hours
    const peakHours = this.calculatePeakHours(filteredBookings);

    // Calculate retention rate
    const retentionRate = this.calculateRetentionRate(
      period,
      activeUsers,
      totalUsers
    );

    return {
      totalRides,
      activeRides,
      completedRides,
      cancelledRides,
      totalRevenue,
      totalUsers,
      totalDrivers,
      totalPassengers,
      activeUsers,
      approvedDrivers,
      onlineDrivers,
      newSignups,
      avgResponseTime,
      completionRate,
      averageRating,
      peakHourStart: peakHours.start,
      peakHourEnd: peakHours.end,
      retentionRate,
      lastUpdated: Date.now(),
    };
  }

  calculatePeriodStart(period) {
    const now = new Date();
    switch (period) {
      case TimePeriod.TODAY:
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ).getTime();
      case TimePeriod.WEEK:
        return now.getTime() - 7 * 24 * 60 * 60 * 1000;
      case TimePeriod.MONTH:
        return now.getTime() - 30 * 24 * 60 * 60 * 1000;
      case TimePeriod.YEAR:
        return now.getTime() - 365 * 24 * 60 * 60 * 1000;
      default:
        return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
  }

  calculatePeakHours(bookings) {
    if (bookings.length === 0) {
      return { start: "12:00", end: "13:00" };
    }

    const hourCounts = {};
    bookings.forEach((booking) => {
      const hour = new Date(booking.requestTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const maxHour = Object.entries(hourCounts).reduce(
      (max, [hour, count]) =>
        count > max.count ? { hour: parseInt(hour), count } : max,
      { hour: 12, count: 0 }
    ).hour;

    return {
      start: `${String(maxHour).padStart(2, "0")}:00`,
      end: `${String((maxHour + 1) % 24).padStart(2, "0")}:00`,
    };
  }

  calculateRetentionRate(period, activeUsers, totalUsers) {
    if (totalUsers === 0) return 0;

    const baseRetention = (activeUsers / totalUsers) * 100;

    switch (period) {
      case TimePeriod.TODAY:
        return baseRetention;
      case TimePeriod.WEEK:
        return baseRetention * 0.8;
      case TimePeriod.MONTH:
        return baseRetention * 0.6;
      case TimePeriod.YEAR:
        return baseRetention * 0.4;
      default:
        return baseRetention;
    }
  }
}

const analyticsService = new FirebaseAnalyticsService();

export default function AnalyticsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(TimePeriod.WEEK);

  // ✅ Only load once on mount
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  // ✅ Filter client-side when period changes
  useEffect(() => {
    if (analyticsCache.rawData) {
      const filtered = analyticsService.filterDataByPeriod(
        analyticsCache.rawData,
        selectedPeriod
      );
      setAnalytics(filtered);
    }
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await analyticsService.getPlatformAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch (error) {
      setErrorMessage(`Failed to load analytics: ${error.message}`);
      console.error("Analytics error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTripGrowth = () => {
    if (!analytics) return "+0.0%";
    const growthRate = analytics.completionRate - 80.0;
    return growthRate > 0
      ? `+${growthRate.toFixed(1)}%`
      : `${growthRate.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Analytics
          </h1>
        </div>

        <div className="flex justify-center mb-6 space-x-2">
          {Object.values(TimePeriod).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? "!bg-blue-600 text-white"
                  : "!bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {period === TimePeriod.TODAY
                ? "Daily"
                : period === TimePeriod.WEEK
                ? "Weekly"
                : period === TimePeriod.MONTH
                ? "Monthly"
                : "Yearly"}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <p className="text-red-800 flex-1">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)}>
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <MetricCard
              title="Completed Trips"
              value={analytics?.completedRides?.toString() || "0"}
              percentageChange={calculateTripGrowth()}
              isPositive={analytics?.completionRate > 75}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
            Performance Metrics
          </h3>
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
              <PerformanceCard
                title="Success Rate"
                value={`${analytics?.completionRate?.toFixed(1) || "0.0"}%`}
                subtitle="Trip completion"
                icon={<CheckCircle className="w-8 h-8" />}
                color="text-green-600"
              />
              <PerformanceCard
                title="Platform Rating"
                value={
                  analytics?.averageRating > 0
                    ? `${analytics.averageRating.toFixed(1)}★`
                    : "N/A"
                }
                subtitle={
                  analytics?.averageRating > 0
                    ? "Average rating"
                    : "No ratings yet"
                }
                icon={<Star className="w-8 h-8" />}
                color="text-orange-600"
              />
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <div className="w-full max-w-sm">
              <PerformanceCard
                title="Peak Hours"
                value={`${analytics?.peakHourStart || "00:00"}-${
                  analytics?.peakHourEnd || "00:00"
                }`}
                subtitle="Busiest time"
                icon={<Info className="w-8 h-8" />}
                color="text-purple-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            User Analytics
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <UserMetricItem
              title="Total Users"
              value={analytics?.totalUsers?.toString() || "0"}
              subtitle="Registered"
            />
            <UserMetricItem
              title="Approved Drivers"
              value={analytics?.approvedDrivers?.toString() || "0"}
              subtitle="Total"
            />
            <UserMetricItem
              title="New Signups"
              value={analytics?.newSignups?.toString() || "0"}
              subtitle={`This ${selectedPeriod.toLowerCase()}`}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <UserMetricItem
              title="Total Drivers"
              value={analytics?.totalDrivers?.toString() || "0"}
              subtitle="Total"
            />
            <UserMetricItem
              title="Total Passengers"
              value={analytics?.totalPassengers?.toString() || "0"}
              subtitle="Total"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Component functions
function MetricCard({ title, value, percentageChange, isPositive }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p
        className={`text-sm font-medium ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {percentageChange}
      </p>
    </div>
  );
}

function PerformanceCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  );
}

function UserMetricItem({ title, value, subtitle }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-blue-600">{value}</p>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  );
}
