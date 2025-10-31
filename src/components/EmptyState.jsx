import React from 'react';

export default function EmptyState({ message }) {
  return (
    <div className="text-center py-10 text-gray-500">
      <p>{message}</p>
    </div>
  );
}