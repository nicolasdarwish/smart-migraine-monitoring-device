import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserProfile, linkDeviceToUser } from '../services/userProfile';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const DeviceModal: React.FC<Props> = ({ isOpen, onClose, isOnline }) => {
  const { user } = useAuth();
  const [deviceId, setDeviceId] = useState("");
  const [storedDeviceId, setStoredDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentUserProfile();
      if (profile?.deviceId) {
        setDeviceId(profile.deviceId);
        setStoredDeviceId(profile.deviceId);
      } else {
        setDeviceId("");
        setStoredDeviceId(null);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load device settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!deviceId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // New: Use the robust linking function
      await linkDeviceToUser(deviceId.trim());
      setStoredDeviceId(deviceId.trim());
      setSuccess("Device linked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError("Failed to link device");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    setError(null);
    try {
      // Unlink by sending empty string
      await linkDeviceToUser("");
      setStoredDeviceId(null);
      setDeviceId("");
      setSuccess("Device unlinked");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError("Failed to unlink device");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLinked = !!storedDeviceId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-nexus-panel w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-microchip text-nexus-accent"></i>
            Device Management
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
            {/* Status Indicator */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase">Connection Status</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isLinked && isOnline ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-500' : 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${isLinked && isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-bold uppercase">{isLinked ? (isOnline ? 'Online' : 'Offline') : 'Not Configured'}</span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">ESP32 Device ID</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        disabled={isLinked || loading}
                        placeholder="e.g. ESP32-001"
                        className={`w-full bg-slate-100 dark:bg-slate-900 border ${isLinked ? 'border-green-500/50 text-green-600 dark:text-green-400' : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'} rounded p-3 focus:outline-none focus:border-nexus-accent disabled:opacity-70 disabled:cursor-not-allowed font-mono`}
                    />
                    {isLinked && (
                        <div className="absolute right-3 top-3 text-green-500">
                            <i className="fas fa-check-circle"></i> Linked
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-500">
                    {isLinked 
                        ? "Device is currently linked to your account. To change the ID, remove the device first." 
                        : "Enter the unique identifier flashed onto your ESP32 module."}
                </p>
            </div>

            {error && <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/10 p-2 rounded border border-red-200 dark:border-red-500/20"><i className="fas fa-exclamation-triangle mr-1"></i> {error}</div>}
            {success && <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/10 p-2 rounded border border-green-200 dark:border-green-500/20"><i className="fas fa-check mr-1"></i> {success}</div>}

            <div className="pt-2">
                {isLinked ? (
                    <button 
                        onClick={handleUnlink}
                        disabled={loading}
                        className="w-full py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded font-bold transition-colors"
                    >
                        {loading ? 'Processing...' : 'Remove Device'}
                    </button>
                ) : (
                    <button 
                        onClick={handleLink}
                        disabled={loading || !deviceId}
                        className="w-full py-2 bg-nexus-accent hover:bg-sky-400 text-nexus-dark rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Link Device'}
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
