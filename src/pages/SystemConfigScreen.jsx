import React, { useState } from 'react';

export default function SystemConfigScreen() {
  const [config, setConfig] = useState({
    baseFare: 40,
    perKmRate: 10,
    perMinuteRate: 2,
    bookingRadius: 5,
    maxCancellations: 3
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // In a real application, you would send this config object to a 
    // Firestore document (e.g., doc(db, 'system', 'config')) or a backend API.
    console.log('Saving config to Firestore/Backend:', config); 
    
    // Placeholder for save action
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">System Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Fare Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Fare (₱)</label>
              <input
                type="number"
                value={config.baseFare}
                onChange={(e) => setConfig({...config, baseFare: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Kilometer Rate (₱)</label>
              <input
                type="number"
                value={config.perKmRate}
                onChange={(e) => setConfig({...config, perKmRate: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Minute Rate (₱)</label>
              <input
                type="number"
                value={config.perMinuteRate}
                onChange={(e) => setConfig({...config, perMinuteRate: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Operational Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Radius (km)</label>
              <input
                type="number"
                value={config.bookingRadius}
                onChange={(e) => setConfig({...config, bookingRadius: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Cancellations Per Day</label>
              <input
                type="number"
                value={config.maxCancellations}
                onChange={(e) => setConfig({...config, maxCancellations: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-4">
          {saved && (
            <span className="text-green-600 font-medium">Settings saved successfully!</span>
          )}
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}