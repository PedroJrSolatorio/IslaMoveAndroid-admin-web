import React, { useState, useEffect, useRef } from "react";
import { ZoneBoundaryRepository } from "../repositories/ZoneBoundaryRepository";
import DestinationsTab from "../tabs/DestinationsTab";
import ZoneBoundariesTab from "../tabs/ZoneBoundariesTab";
import ServiceBoundaryTab from "../tabs/ServiceBoundaryTab";
import CompatibilityTab from "../tabs/CompatibilityTab";
import { useServiceAreaViewModel } from "../hooks/useServiceAreaViewModel";

export default function SystemConfigScreen() {
  // const [activeTab, setActiveTab] = useState("destinations");
  const [activeTab, setActiveTab] = useState("boundaries");
  const [zoneBoundaries, setZoneBoundaries] = useState([]);
  const repository = useRef(new ZoneBoundaryRepository()).current;
  const viewModel = useServiceAreaViewModel();

  useEffect(() => {
    loadBoundaries();
  }, []);

  const loadBoundaries = async () => {
    const bounds = await repository.getAllZoneBoundaries();
    setZoneBoundaries(bounds);
  };

  const tabs = [
    // { id: "destinations", label: "Destinations", icon: "📍" },
    { id: "boundaries", label: "Zone Boundaries", icon: "🗺️" },
    { id: "service", label: "Service Boundary", icon: "🌐" },
    // { id: "compatibility", label: "Compatibility", icon: "🔗" },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Map Management</h1>
            <p className="text-sm text-gray-600">
              Manage destinations and zone boundaries
            </p>
          </div>
          <button
            onClick={() => {
              loadBoundaries();
              window.location.reload();
            }}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* {activeTab === "destinations" && (
          <DestinationsTab zoneBoundaries={zoneBoundaries} />
        )} */}
        {activeTab === "boundaries" && <ZoneBoundariesTab />}
        {activeTab === "service" && (
          <ServiceBoundaryTab
            viewModel={viewModel}
            uiState={viewModel.uiState}
          />
        )}
        {/* {activeTab === "compatibility" && <CompatibilityTab />} */}
      </div>
    </div>
  );
}
