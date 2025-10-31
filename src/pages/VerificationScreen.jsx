import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { User } from 'lucide-react';
import { db } from '../config/firebase';
import EmptyState from '../components/EmptyState';
import { getStatusColor, formatStatus } from '../utils/helpers';

function DriverVerificationList({ drivers }) {
  const approveDriver = async (driverId) => {
    await updateDoc(doc(db, 'users', driverId), {
      'driverData.verificationStatus': 'APPROVED',
      'driverData.verificationDate': Date.now(),
      updatedAt: Date.now()
    });
  };

  const rejectDriver = async (driverId) => {
    await updateDoc(doc(db, 'users', driverId), {
      'driverData.verificationStatus': 'REJECTED',
      'driverData.verificationDate': Date.now(),
      updatedAt: Date.now()
    });
  };

  if (drivers.length === 0) {
    return <EmptyState message="No pending driver verifications" />;
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver) => (
        <div key={driver.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{driver.displayName}</h3>
                <p className="text-sm text-gray-600">{driver.phoneNumber}</p>
                <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusColor(driver.driverData?.verificationStatus)}`}>
                  {formatStatus(driver.driverData?.verificationStatus)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {driver.driverData?.vehicleData?.make} {driver.driverData?.vehicleData?.model} • 
                  {driver.driverData?.licenseNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => approveDriver(driver.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => rejectDriver(driver.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PassengerVerificationList({ passengers }) {
  const approvePassenger = async (passengerId) => {
    await updateDoc(doc(db, 'users', passengerId), {
      'studentDocument.status': 'APPROVED',
      'studentDocument.verificationDate': Date.now(),
      updatedAt: Date.now()
    });
  };

  const rejectPassenger = async (passengerId) => {
    await updateDoc(doc(db, 'users', passengerId), {
      'studentDocument.status': 'REJECTED',
      'studentDocument.verificationDate': Date.now(),
      updatedAt: Date.now()
    });
  };

  if (passengers.length === 0) {
    return <EmptyState message="No pending passenger verifications" />;
  }

  return (
    <div className="space-y-4">
      {passengers.map((passenger) => (
        <div key={passenger.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{passenger.displayName}</h3>
                <p className="text-sm text-gray-600">{passenger.phoneNumber}</p>
                <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusColor(passenger.studentDocument?.status)}`}>
                  {formatStatus(passenger.studentDocument?.status)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {passenger.studentDocument?.school} • ID: {passenger.studentDocument?.studentIdNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => approvePassenger(passenger.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => rejectPassenger(passenger.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VerificationScreen() {
  const [tab, setTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [passengers, setPassengers] = useState([]);

  useEffect(() => {
    const unsubDrivers = onSnapshot(
      query(collection(db, 'users'), where('userType', '==', 'DRIVER')),
      (snapshot) => {
        const driverList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(d => ['PENDING', 'UNDER_REVIEW', 'REJECTED'].includes(d.driverData?.verificationStatus));
        setDrivers(driverList);
      }
    );

    const unsubPassengers = onSnapshot(
      query(collection(db, 'users'), where('userType', '==', 'PASSENGER')),
      (snapshot) => {
        const passengerList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => ['PENDING', 'PENDING_REVIEW', 'REJECTED'].includes(p.studentDocument?.status));
        setPassengers(passengerList);
      }
    );

    return () => {
      unsubDrivers();
      unsubPassengers();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b py-2">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setTab('drivers')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                tab === 'drivers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Driver Verification ({drivers.length})
            </button>
            <button
              onClick={() => setTab('passengers')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                tab === 'passengers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Passenger Verification ({passengers.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === 'drivers' ? (
            <DriverVerificationList drivers={drivers} />
          ) : (
            <PassengerVerificationList passengers={passengers} />
          )}
        </div>
      </div>
    </div>
  );
}