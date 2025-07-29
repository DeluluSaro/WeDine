"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Archive, Clock, Database, AlertTriangle, CheckCircle } from 'lucide-react';

interface CleanupStats {
  expiredOrders: number;
  activeOrders: number;
  historyRecords: number;
  lastCheck: string;
}

const OrderLifecycleDashboard = () => {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/orders/cleanup');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const triggerCleanup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/orders/cleanup', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setLastCleanup(new Date().toISOString());
        await fetchStats(); // Refresh stats
      } else {
        throw new Error('Cleanup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) {
    return (
      <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-2 text-yellow-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-yellow-800">Order Lifecycle Dashboard</h2>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-yellow-900 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-sm text-blue-600 font-medium">Active Orders</div>
              <div className="text-2xl font-bold text-blue-800">{stats.activeOrders}</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-sm text-orange-600 font-medium">Expired Orders</div>
              <div className="text-2xl font-bold text-orange-800">{stats.expiredOrders}</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-sm text-green-600 font-medium">History Records</div>
              <div className="text-2xl font-bold text-green-800">{stats.historyRecords}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cleanup Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Automatic Cleanup</h3>
          {stats.expiredOrders > 0 && (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{stats.expiredOrders} orders need cleanup</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={triggerCleanup}
            disabled={loading || stats.expiredOrders === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Archive className="w-4 h-4" />
            {loading ? 'Processing...' : 'Run Cleanup'}
          </button>

          {lastCleanup && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Last cleanup: {new Date(lastCleanup).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Last check: {new Date(stats.lastCheck).toLocaleString()}
        </div>
      </div>

      {/* System Status */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-800">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">System Status: Healthy</span>
        </div>
        <div className="mt-1 text-xs text-blue-600">
          Dual schema system is operational. Orders are automatically archived after 24 hours.
        </div>
      </div>
    </div>
  );
};

export default OrderLifecycleDashboard;