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

// Firebase Analytics Service
class FirebaseAnalyticsService {
  async getPlatformAnalytics(period) {
    try {
      const periodStart = this.calculatePeriodStart(period);
      const currentTime = Date.now();

      console.log(
        "Fetching analytics for period:",
        period,
        new Date(periodStart),
        "to",
        new Date(currentTime)
      );

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
      // We fetch ALL users to calculate totals and filter for 'active'/'new signups' in processing
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

      // Process bookings
      let totalRides = 0;
      let completedRides = 0;
      let cancelledRides = 0;
      let activeRides = 0;
      let totalRevenue = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
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

        // Calculate response time (request to acceptance)
        if (
          booking.acceptedTime &&
          booking.acceptedTime > booking.requestTime
        ) {
          totalResponseTime += booking.acceptedTime - booking.requestTime;
          responseTimeCount++;
        }
      });

      // Process ratings
      let totalRating = 0;
      let ratingCount = 0;

      ratingsSnapshot.forEach((doc) => {
        const rating = doc.data();
        if (rating.stars && rating.stars > 0) {
          totalRating += rating.stars;
          ratingCount++;
        }
      });

      console.log(`Found ${ratingCount} ratings with total: ${totalRating}`);

      // Process users
      let totalUsers = 0;
      let totalDrivers = 0;
      let totalPassengers = 0;
      let activeUsers = 0;
      let approvedDrivers = 0; // New metric for approved drivers
      let onlineDrivers = 0;
      let newSignups = 0;

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        totalUsers++;

        // Fix 3: Calculate new signups based on user.createdAt >= periodStart
        if (user.createdAt >= periodStart) {
          newSignups++;
        }

        // Fix 2 & 4: Calculate total active users based on user.lastActive >= periodStart
        // This is kept for the 'Total Active Users' MetricCard, but not the specific UserMetricItem
        if (user.lastActive >= periodStart) {
          activeUsers++;
        }

        switch (user.userType) {
          case "DRIVER":
            totalDrivers++;
            // New logic for approved drivers
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
      const peakHours = this.calculatePeakHours(bookingsSnapshot);

      // Calculate retention rate
      const retentionRate = this.calculateRetentionRate(
        period,
        activeUsers,
        totalUsers
      );

      const analytics = {
        totalRides,
        activeRides,
        completedRides,
        cancelledRides,
        totalRevenue,
        totalUsers,
        totalDrivers,
        totalPassengers,
        activeUsers,
        approvedDrivers, // Include new metric
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

      console.log("Analytics calculated:", analytics);
      return analytics;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }
  }

  // ... (calculatePeriodStart, calculatePeakHours, calculateRetentionRate methods remain unchanged)
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

  calculatePeakHours(bookingsSnapshot) {
    if (bookingsSnapshot.size === 0) {
      return { start: "12:00", end: "13:00" };
    }

    const hourCounts = {};
    bookingsSnapshot.forEach((doc) => {
      const booking = doc.data();
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
  const [selectedDayTrip, setSelectedDayTrip] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
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

  const formatResponseTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDailyTripsData = () => {
    if (!analytics) return [];

    const today = new Date().getDay();
    const avgDaily =
      analytics.totalRides > 0 ? Math.floor(analytics.totalRides / 7) : 0;
    const avgCompleted =
      analytics.completedRides > 0
        ? Math.floor(analytics.completedRides / 7)
        : 0;
    const avgCancelled =
      analytics.cancelledRides > 0
        ? Math.floor(analytics.cancelledRides / 7)
        : 0;
    const avgActive =
      analytics.activeRides > 0 ? Math.floor(analytics.activeRides / 7) : 0;

    switch (selectedPeriod) {
      case TimePeriod.TODAY:
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return [
          {
            day: dayNames[today],
            trips: analytics.totalRides,
            isToday: true,
            completedTrips: analytics.completedRides,
            cancelledTrips: analytics.cancelledRides,
            activeTrips: analytics.activeRides,
          },
        ];

      case TimePeriod.WEEK:
        return [
          {
            day: "Mon",
            trips: Math.floor(avgDaily * 0.8),
            isToday: today === 1,
            completedTrips: Math.floor(avgCompleted * 0.8),
            cancelledTrips: Math.floor(avgCancelled * 0.8),
            activeTrips: Math.floor(avgActive * 0.8),
          },
          {
            day: "Tue",
            trips: Math.floor(avgDaily * 1.2),
            isToday: today === 2,
            completedTrips: Math.floor(avgCompleted * 1.2),
            cancelledTrips: Math.floor(avgCancelled * 1.2),
            activeTrips: Math.floor(avgActive * 1.2),
          },
          {
            day: "Wed",
            trips: Math.floor(avgDaily * 0.9),
            isToday: today === 3,
            completedTrips: Math.floor(avgCompleted * 0.9),
            cancelledTrips: Math.floor(avgCancelled * 0.9),
            activeTrips: Math.floor(avgActive * 0.9),
          },
          {
            day: "Thu",
            trips: Math.floor(avgDaily * 1.1),
            isToday: today === 4,
            completedTrips: Math.floor(avgCompleted * 1.1),
            cancelledTrips: Math.floor(avgCancelled * 1.1),
            activeTrips: Math.floor(avgActive * 1.1),
          },
          {
            day: "Fri",
            trips: Math.floor(avgDaily * 0.7),
            isToday: today === 5,
            completedTrips: Math.floor(avgCompleted * 0.7),
            cancelledTrips: Math.floor(avgCancelled * 0.7),
            activeTrips: Math.floor(avgActive * 0.7),
          },
          {
            day: "Sat",
            trips: Math.floor(avgDaily * 1.4),
            isToday: today === 6,
            completedTrips: Math.floor(avgCompleted * 1.4),
            cancelledTrips: Math.floor(avgCancelled * 1.4),
            activeTrips: Math.floor(avgActive * 1.4),
          },
          {
            day: "Sun",
            trips: avgDaily,
            isToday: today === 0,
            completedTrips: avgCompleted,
            cancelledTrips: avgCancelled,
            activeTrips: avgActive,
          },
        ];

      case TimePeriod.MONTH:
        const avgWeekly = Math.floor(analytics.totalRides / 4);
        const avgCompletedWeekly = Math.floor(analytics.completedRides / 4);
        const avgCancelledWeekly = Math.floor(analytics.cancelledRides / 4);
        const avgActiveWeekly = Math.floor(analytics.activeRides / 4);
        return [
          {
            day: "W1",
            trips: Math.floor(avgWeekly * 0.9),
            isToday: false,
            completedTrips: Math.floor(avgCompletedWeekly * 0.9),
            cancelledTrips: Math.floor(avgCancelledWeekly * 0.9),
            activeTrips: Math.floor(avgActiveWeekly * 0.9),
          },
          {
            day: "W2",
            trips: Math.floor(avgWeekly * 1.1),
            isToday: false,
            completedTrips: Math.floor(avgCompletedWeekly * 1.1),
            cancelledTrips: Math.floor(avgCancelledWeekly * 1.1),
            activeTrips: Math.floor(avgActiveWeekly * 1.1),
          },
          {
            day: "W3",
            trips: Math.floor(avgWeekly * 0.8),
            isToday: false,
            completedTrips: Math.floor(avgCompletedWeekly * 0.8),
            cancelledTrips: Math.floor(avgCancelledWeekly * 0.8),
            activeTrips: Math.floor(avgActiveWeekly * 0.8),
          },
          {
            day: "W4",
            trips: avgWeekly,
            isToday: true,
            completedTrips: avgCompletedWeekly,
            cancelledTrips: avgCancelledWeekly,
            activeTrips: avgActiveWeekly,
          },
        ];

      default:
        return [];
    }
  };

  const calculateUserGrowth = () => {
    if (!analytics || analytics.totalUsers === 0) return "+0.0%";
    const growthRate = (analytics.newSignups / analytics.totalUsers) * 100;
    return growthRate > 0
      ? `+${growthRate.toFixed(1)}%`
      : `${growthRate.toFixed(1)}%`;
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
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MetricCard
            title="Total Active Users"
            value={analytics?.activeUsers?.toString() || "0"}
            percentageChange={calculateUserGrowth()}
            isPositive={analytics?.newSignups > 0}
          />
          <MetricCard
            title="Completed Trips"
            value={analytics?.completedRides?.toString() || "0"}
            percentageChange={calculateTripGrowth()}
            isPositive={analytics?.completionRate > 75}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Trips per Day
          </h3>
          <BarChart
            data={getDailyTripsData()}
            onBarClick={setSelectedDayTrip}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PerformanceCard
              title="Response Time"
              value={formatResponseTime(analytics?.avgResponseTime || 0)}
              subtitle="Avg acceptance time"
              icon={<Clock className="w-8 h-8" />}
              color="text-blue-600"
            />
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
            {/* FIX 1: Show Approved Drivers for 'Active Users' slot */}
            <UserMetricItem
              title="Approved Drivers"
              value={analytics?.approvedDrivers?.toString() || "0"}
              subtitle="Total"
            />
            {/* FIX 2: Show New Signups based on users.createdAt >= periodStart (already correct, but label updated) */}
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
            <UserMetricItem
              title="Retention Rate"
              value={`${analytics?.retentionRate?.toFixed(1) || "0.0"}%`}
              subtitle={`Active/${selectedPeriod.toLowerCase()} users`}
            />
          </div>
        </div>
      </div>

      {selectedDayTrip && (
        <TripDetailsDialog
          dayTrip={selectedDayTrip}
          onDismiss={() => setSelectedDayTrip(null)}
        />
      )}
    </div>
  );
}

// ... (MetricCard, BarChart, PerformanceCard, UserMetricItem, TripDetailsDialog, TripDetailItem components remain unchanged)

function MetricCard({ title, value, percentageChange, isPositive }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
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

function BarChart({ data, onBarClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.trips), 1);
  const minHeight = 8;

  return (
    <div className="w-full">
      <div className="flex items-end justify-around h-48 mb-2 border-b border-gray-200">
        {data.map((dayTrip, index) => {
          const heightPercentage = (dayTrip.trips / maxValue) * 100;
          const heightPixels = Math.max(
            (heightPercentage / 100) * 192,
            minHeight
          );

          return (
            <div
              key={index}
              className="flex flex-col items-center justify-end flex-1 h-full"
            >
              <div className="mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {dayTrip.trips}
                </span>
              </div>
              <div
                className={`w-full max-w-[40px] rounded-t cursor-pointer transition-all hover:opacity-80 ${
                  dayTrip.isToday ? "bg-blue-600" : "bg-blue-300"
                }`}
                style={{ height: `${heightPixels}px` }}
                onClick={() => onBarClick(dayTrip)}
                title={`${dayTrip.day}: ${dayTrip.trips} trips`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-around mt-2">
        {data.map((dayTrip, index) => (
          <p
            key={index}
            className="text-sm text-gray-600 text-center flex-1 font-medium"
          >
            {dayTrip.day}
          </p>
        ))}
      </div>
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

function TripDetailsDialog({ dayTrip, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Trips on {dayTrip.day}
          </h2>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Trips</p>
              <p className="text-3xl font-bold text-blue-600">
                {dayTrip.trips}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Trip Breakdown
        </h3>

        <div className="space-y-2">
          <TripDetailItem
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            label="Completed"
            count={dayTrip.completedTrips}
            percentage={
              dayTrip.trips > 0
                ? Math.floor((dayTrip.completedTrips / dayTrip.trips) * 100)
                : 0
            }
          />
          <TripDetailItem
            icon={<X className="w-5 h-5 text-red-600" />}
            label="Cancelled"
            count={dayTrip.cancelledTrips}
            percentage={
              dayTrip.trips > 0
                ? Math.floor((dayTrip.cancelledTrips / dayTrip.trips) * 100)
                : 0
            }
          />
          <TripDetailItem
            icon={<Activity className="w-5 h-5 text-blue-600" />}
            label="In Progress"
            count={dayTrip.activeTrips}
            percentage={
              dayTrip.trips > 0
                ? Math.floor((dayTrip.activeTrips / dayTrip.trips) * 100)
                : 0
            }
          />
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function TripDetailItem({ icon, label, count, percentage }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        {icon}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-900">{count}</span>
        <span className="text-xs text-gray-500">({percentage}%)</span>
      </div>
    </div>
  );
}
