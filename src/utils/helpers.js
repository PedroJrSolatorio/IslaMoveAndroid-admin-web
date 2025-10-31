// ==================== DATE & TIME HELPERS ====================

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Format timestamp to readable date and time
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get time ago (e.g., "5 minutes ago")
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

// ==================== CURRENCY HELPERS ====================

/**
 * Format currency in Philippine Peso
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₱0.00';
  return `₱${parseFloat(amount).toFixed(2)}`;
};

/**
 * Calculate fare based on distance and time
 */
export const calculateFare = (distance, time, config = {}) => {
  const baseFare = config.baseFare || 40;
  const perKmRate = config.perKmRate || 10;
  const perMinuteRate = config.perMinuteRate || 2;
  
  const distanceCost = distance * perKmRate;
  const timeCost = time * perMinuteRate;
  
  return baseFare + distanceCost + timeCost;
};

// ==================== STATUS HELPERS ====================

/**
 * Get status color class
 */
export const getStatusColor = (status) => {
  const statusColors = {
    APPROVED: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    COMPLETED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    ACCEPTED: 'bg-blue-100 text-blue-800'
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Format status text (removes underscores, capitalizes)
 */
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// ==================== VALIDATION HELPERS ====================

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Philippine format)
 */
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(\+63|0)9\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate if user is admin
 */
export const isAdmin = (user) => {
  return user && user.userType === 'ADMIN';
};

// ==================== DISTANCE & LOCATION HELPERS ====================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
};

// ==================== ANALYTICS HELPERS ====================

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Get last N days dates
 */
export const getLastNDays = (n) => {
  return Array.from({length: n}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (n - 1 - i));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
};

/**
 * Group data by date
 */
export const groupByDate = (data, dateField) => {
  return data.reduce((acc, item) => {
    const date = formatDate(item[dateField]);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});
};

// ==================== USER HELPERS ====================

/**
 * Get user initials for avatar
 */
export const getUserInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Get user type color
 */
export const getUserTypeColor = (userType) => {
  const colors = {
    DRIVER: 'bg-blue-100 text-blue-800',
    PASSENGER: 'bg-green-100 text-green-800',
    ADMIN: 'bg-purple-100 text-purple-800'
  };
  return colors[userType] || 'bg-gray-100 text-gray-800';
};

// ==================== EXPORT HELPERS ====================

/**
 * Export data to CSV
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => JSON.stringify(row[header] || '')).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// ==================== NOTIFICATION HELPERS ====================

/**
 * Format notification message
 */
export const formatNotificationMessage = (type, data) => {
  const messages = {
    NEW_BOOKING: `New booking from ${data.passengerName}`,
    BOOKING_ACCEPTED: `Booking accepted by ${data.driverName}`,
    BOOKING_COMPLETED: `Booking completed - ${formatCurrency(data.fare)}`,
    DRIVER_VERIFIED: `${data.driverName} has been verified`,
    USER_BANNED: `User ${data.userName} has been banned`
  };
  
  return messages[type] || 'New notification';
};