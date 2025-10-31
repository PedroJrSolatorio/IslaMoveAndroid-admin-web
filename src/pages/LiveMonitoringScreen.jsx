import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { MapPin } from 'lucide-react';
import { db } from '../config/firebase';
import EmptyState from '../components/EmptyState';

export default function LiveMonitoringScreen() {
  const [activeRides, setActiveRides] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('status', 'in', ['ACCEPTED', 'IN_PROGRESS', 'ARRIVED'])),
      (snapshot) => {
        const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveRides(rides);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Ride Monitoring</h2>
        
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center mb-6">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Map integration requires Mapbox token</p>
            <p className="text-sm text-gray-500">Add your Mapbox token to display real-time map</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Active Rides ({activeRides.length})</h3>
          {activeRides.length === 0 ? (
            <EmptyState message="No active rides at the moment" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRides.map((ride) => (
                <div key={ride.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      ride.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ride.status}
                    </span>
                    <span className="text-sm text-gray-600">₱{ride.fare?.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                      <p className="text-gray-700">{ride.pickupLocation?.address || 'Pickup location'}</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-gray-700">{ride.dropoffLocation?.address || 'Dropoff location'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}