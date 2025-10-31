import React, { useState, useEffect } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DollarSign, Car, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, getLastNDays, groupByDate } from '../utils/helpers';

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalRides: 0,
    avgRideValue: 0,
    ridesByDay: []
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
      const avgRideValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

      // Logic to generate last 7 days for the chart
      const last7DaysLabels = getLastNDays(7);

      const ridesGrouped = groupByDate(completedBookings, 'completedAt');

      const ridesByDay = last7DaysLabels.map(dayLabel => {
        // Find the count for that specific day label
        const ridesOnDay = ridesGrouped[dayLabel] ? ridesGrouped[dayLabel].length : 0;
        return {
          day: dayLabel,
          rides: ridesOnDay,
        };
      });

      // FALLBACK/MOCK if no data is found for 7 days, to ensure the chart renders correctly
      if (completedBookings.length === 0) {
          // Reverting to mock data only if Firebase returns nothing
          const mockRidesByDay = last7DaysLabels.map(day => ({
            day,
            rides: Math.floor(Math.random() * 50) + 10 
          }));
          setAnalytics({
            totalRevenue,
            totalRides: completedBookings.length,
            avgRideValue,
            ridesByDay: mockRidesByDay
          });
      } else {
          setAnalytics({
            totalRevenue,
            totalRides: completedBookings.length,
            avgRideValue,
            ridesByDay
          });
      }
    };

    fetchAnalytics();
  }, []);

  // Static/Mock Data for other charts
  const revenueData = [
    { name: 'Jan', revenue: 12000 },
    { name: 'Feb', revenue: 15000 },
    { name: 'Mar', revenue: 18000 },
    { name: 'Apr', revenue: 22000 },
    { name: 'May', revenue: 25000 },
    { name: 'Jun', revenue: 28000 }
  ];

  const userTypeData = [
    { name: 'Passengers', value: 65, color: '#10b981' },
    { name: 'Drivers', value: 30, color: '#3b82f6' },
    { name: 'Admins', value: 5, color: '#8b5cf6' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Rides Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rides</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalRides}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Avg Ride Value Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Ride Value</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(analytics.avgRideValue)}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rides (Last 7 Days) Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rides (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.ridesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rides" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. User Distribution Pie Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {userTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}