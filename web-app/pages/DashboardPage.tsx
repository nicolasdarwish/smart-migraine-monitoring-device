import React, { useState, useEffect, useRef } from 'react';
import { SensorReading, AIPrediction, SystemState, PageView, UserProfile, WeatherData, MigraineIncident } from '../types';
import { SensorChart } from '../components/SensorChart';
import { RiskGauge } from '../components/RiskGauge';
import { BatteryLevel } from '../components/BatteryLevel';
import { analyzeTelemetry, analyzeUserReport } from '../services/geminiService';
import { initializeFirebase, subscribeToSensors, sendHighRiskAlert, clearHighRiskAlert } from '../services/firebase';
import { getCurrentUserProfile, savePredictionToHistory, saveMigraineIncident, getHistoricalIncidents, deleteMigraineIncident } from '../services/userProfile';
import { fetchLocalWeather } from '../services/weatherService';
import { ArchitectureModal } from '../components/ArchitectureModal';
import { IncidentHistoryModal } from '../components/IncidentHistoryModal';
import { DeviceModal } from '../components/DeviceModal';
import { useAuth } from '../context/AuthContext';

// Constants for simulation
const TICK_RATE_MS = 1000;
const MAX_HISTORY = 60; // Keep last 60 seconds
const AI_CHECK_INTERVAL_MS = 120000; // 2 minutes - Save all predictions for prototype data collection
const FRESHNESS_THRESHOLD_MS = 60000; 
// Allow a more generous heartbeat timeout so devices that publish less frequently
// (e.g. every 30-60s) are not shown as "Offline" while they are actively pushing data.
const HEARTBEAT_TIMEOUT_MS = 90000; 

const SMART_TIPS = [
  "Hydrate! Drinking 2 cups of water now can prevent dehydration triggers.",
  "Blue light from screens can trigger migraines. Consider enabling Night Shift mode.",
  "High humidity detected this week. Keep indoor air circulation active.",
  "Your heart rate variability indicates rising stress. Take a 5-minute breathing break.",
  "Maintain a consistent sleep schedule to regulate circadian rhythms.",
  "Caffeine can be a double-edged sword. Avoid it late in the afternoon."
];

interface Props {
  onNavigate: (page: PageView) => void;
}

const DashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  
  // --- State Management ---
  const [mode, setMode] = useState<'SIMULATION' | 'LIVE'>(() => {
    return initializeFirebase() ? 'LIVE' : 'SIMULATION';
  });

  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(true);

  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [systemState, setSystemState] = useState<SystemState>(SystemState.MONITORING);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  
  // UI State
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [lastReportTime, setLastReportTime] = useState<number | null>(null);
  const [smartTip, setSmartTip] = useState(SMART_TIPS[0]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [simulationMode, setSimulationMode] = useState<'NORMAL' | 'CHAOS'>('NORMAL');
  const [isReporting, setIsReporting] = useState(false);
  
  // Device Linking
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(true);
  
  // Historical incidents for AI pattern learning
  const [historicalIncidents, setHistoricalIncidents] = useState<MigraineIncident[]>([]);
  
  // Refresh key
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs
  const latestDataRef = useRef<SensorReading[]>([]);
  const lastHeartbeatRef = useRef<number>(0);
  const lastAlertStateRef = useRef<{ active: boolean; riskScore: number | null }>({
    active: false,
    riskScore: null
  });
  
  // --- Helpers ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    setSmartTip(SMART_TIPS[Math.floor(Math.random() * SMART_TIPS.length)]);
  }, []);

  // --- Statistics Helpers ---
  const calculateAverages = () => {
    if (sensorData.length === 0) return { hr: '--', temp: '--', hum: '--', stress: '--', stressScore: 0 };
    
    const sumHR = sensorData.reduce((acc, curr) => acc + curr.heartRate, 0);
    const sumTemp = sensorData.reduce((acc, curr) => acc + curr.temperature, 0);
    const sumHum = sensorData.reduce((acc, curr) => acc + curr.humidity, 0);
    const count = sensorData.length;

    const avgHR = sumHR / count;
    let stressLevel = 'Low';
    let stressScore = 20;

    if (avgHR > 100) {
        stressLevel = 'High';
        stressScore = 85;
    } else if (avgHR > 80) {
        stressLevel = 'Medium';
        stressScore = 55;
    } else {
        stressLevel = 'Low';
        stressScore = 25;
    }

    return {
        hr: (avgHR).toFixed(0),
        temp: (sumTemp / count).toFixed(1),
        hum: (sumHum / count).toFixed(0),
        stress: stressLevel,
        stressScore
    };
  };

  // --- LOGIC: Enhanced Risk Calculation ---
  const calculateRisk = () => {
    if (!isDeviceOnline || !latestReading) return { level: 'UNKNOWN', value: 0 };
    
    // 1. Base Sensor Risk
    let riskValue = 10; 
    const hr = latestReading.heartRate;
    const temp = latestReading.temperature;
    const hum = latestReading.humidity;

    if (hr > 90) riskValue += 15;
    if (hr > 110) riskValue += 25;
    if (temp > 28) riskValue += 15;
    if (temp > 32) riskValue += 25;
    if (hum > 60 || hum < 30) riskValue += 10;

    // 2. Profile Weighting
    if (userProfile) {
        if (userProfile.typicalSleepHours && userProfile.typicalSleepHours < 6) riskValue += 10; 
        if (userProfile.smoker) riskValue += 5;
        if (userProfile.caffeinePerDay && userProfile.caffeinePerDay > 4) riskValue += 5;
        if (userProfile.migraineHistoryYears && userProfile.migraineHistoryYears > 10) riskValue += 5;
    }

    // 3. Weather Weighting
    if (weatherData) {
        // High risk if pressure drops below 1005 (stormy)
        if (weatherData.pressure < 1005) riskValue += 15;
        // High risk for specific weather codes (rain/storm)
        if (weatherData.weatherCode >= 50) riskValue += 10;
    }
    
    riskValue = Math.min(riskValue, 100);
    let level = 'LOW';
    if (riskValue > 70) level = 'HIGH';
    else if (riskValue > 40) level = 'MODERATE';

    return { level, value: riskValue };
  };

  const detectTriggers = () => {
    if (!latestReading) return [];
    const triggers = [];
    if (latestReading.heartRate > 100) triggers.push("Elevated Heart Rate");
    if (latestReading.temperature > 28) triggers.push("High Ambient Temp");
    if (latestReading.humidity > 60) triggers.push("High Humidity");
    if (latestReading.humidity < 30) triggers.push("Dry Air");
    if (userProfile?.typicalSleepHours && userProfile.typicalSleepHours < 5) triggers.push("Chronic Sleep Deprivation");
    
    // Weather Triggers
    if (weatherData) {
        if (weatherData.pressure < 1005) triggers.push("Low Barometric Pressure");
        if (weatherData.weatherCode >= 95) triggers.push("Thunderstorm Alert");
    }

    return triggers;
  };

  const averages = calculateAverages();
  const risk = calculateRisk();
  const currentTriggers = detectTriggers();

  // --- Initialization ---
  useEffect(() => {
    // Fetch Weather
    if (weatherEnabled) {
      const loadWeather = async () => {
          const w = await fetchLocalWeather();
          if (w) {
              setWeatherData(w);
          }
      };
      loadWeather();
    } else {
      setWeatherData(null);
    }
  }, [weatherEnabled]);

  const handleToggleWeather = async () => {
    if (!weatherEnabled) {
      const w = await fetchLocalWeather();
      if (w) {
          setWeatherData(w);
      }
    }
    setWeatherEnabled(!weatherEnabled);
  };

  // --- Heartbeat Monitor ---
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      // If we were online and haven't received fresh data in timeout period, go offline
      if (isDeviceOnline && lastHeartbeatRef.current > 0 && (now - lastHeartbeatRef.current > HEARTBEAT_TIMEOUT_MS)) {
        console.log(`⏱️ [DashboardPage] Heartbeat timeout - device ${deviceId || 'unknown'} is now OFFLINE`);
        setIsDeviceOnline(false);
        // Optionally clear latest reading when device goes offline
        // setLatestReading(null);
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [isDeviceOnline, deviceId]);

  // --- Load User Profile ---
  const reloadDeviceAndProfile = async () => {
      setLoadingDevice(true);
      if (!user) {
        console.debug('⚠️ [DashboardPage] No user, clearing deviceId');
        setDeviceId(null);
        setUserProfile(null);
        setLoadingDevice(false);
        return;
      }
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
            setUserProfile(profile);
            if (profile.deviceId) {
              const trimmedDeviceId = profile.deviceId.trim();
              console.log(`✅ [DashboardPage] Loaded deviceId from profile: "${trimmedDeviceId}"`);
              setDeviceId(trimmedDeviceId);
            } else {
              console.warn('⚠️ [DashboardPage] No deviceId in user profile');
              setDeviceId(null);
            }
        }
      } catch (e) {
        console.error("❌ [DashboardPage] Failed to load profile", e);
        setError("Could not load device information.");
      } finally {
        setLoadingDevice(false);
      }
  };

  useEffect(() => {
    reloadDeviceAndProfile();
  }, [user, refreshKey]);

  // Load historical incidents on mount and when user changes
  useEffect(() => {
    const loadIncidents = async () => {
      if (!user) {
        setHistoricalIncidents([]);
        return;
      }
      const incidents = await getHistoricalIncidents(10); // Get last 10 incidents
      setHistoricalIncidents(incidents);
      console.log(`📚 Loaded ${incidents.length} historical migraine incidents for pattern learning`);
    };
    loadIncidents();
  }, [user]);

  const handleCloseDeviceModal = () => {
    setShowDeviceModal(false);
    setRefreshKey(prev => prev + 1); 
  };

  const handleManualRefresh = () => {
    setSensorData([]);
    setLatestReading(null);
    setIsDeviceOnline(false);
    lastHeartbeatRef.current = 0;
    setRefreshKey(prev => prev + 1);
  };

  // --- Live Data Logic ---
  useEffect(() => {
    if (mode !== 'LIVE') return;
    if (loadingDevice) {
      console.debug('⏳ [DashboardPage] Waiting for device to load...');
      return;
    }
    if (!deviceId) {
      console.warn('⚠️ [DashboardPage] No deviceId configured. Device linking required.');
      setIsDeviceOnline(false);
      return; 
    }

    // Initialize as offline - will be set to online only when fresh data arrives
    setIsDeviceOnline(false);
    lastHeartbeatRef.current = 0;

    console.log(`🔗 [DashboardPage] Subscribing to telemetry for deviceId: "${deviceId}"`);

    const unsubscribe = subscribeToSensors((data) => {
      const now = Date.now();
      // Check if data has originalTimestamp (from our fix) to determine actual age
      const originalTimestamp = (data as any).originalTimestamp;
      const timestampAge = originalTimestamp ? now - originalTimestamp : now - data.timestamp;
      
      // Check if timestamp was substituted (device clock not set or way off)
      const wasTimestampSubstituted = originalTimestamp && Math.abs(now - originalTimestamp) > (24 * 60 * 60 * 1000);
      
      // Data is fresh ONLY if the original timestamp is recent (within freshness threshold)
      // Even if timestamp was substituted, if the original is old, it's historical data from database
      // We use a stricter threshold (2x freshness) to catch truly old data that was substituted
      const HISTORICAL_DATA_THRESHOLD_MS = FRESHNESS_THRESHOLD_MS * 2; // 2 minutes
      const isFresh = timestampAge < FRESHNESS_THRESHOLD_MS;
      
      // If data is very old (historical from database), definitely not fresh
      const isHistoricalData = timestampAge > HISTORICAL_DATA_THRESHOLD_MS;
      
      console.log(`📊 [DashboardPage] Received telemetry:`, {
        deviceId: data.deviceId,
        timestamp: new Date(data.timestamp).toISOString(),
        originalTimestamp: originalTimestamp ? new Date(originalTimestamp).toISOString() : 'N/A',
        timestampAge: timestampAge,
        wasTimestampSubstituted,
        isHistoricalData,
        isFresh,
        temp: data.temperature,
        humidity: data.humidity,
        heartRate: data.heartRate,
        batteryLevel: data.batteryLevel
      });
      
      // ALWAYS update latestReading to ensure consistent display, regardless of freshness
      // This ensures heart rate and other readings are always shown when available
      setLatestReading(data);
      setError(null);
      
      // Mark device as online ONLY if data is actually fresh (recently received)
      // Heartbeat is based on *arrival time* for fresh data
      if (isFresh) {
        lastHeartbeatRef.current = now;

        if (!isDeviceOnline) {
          console.log(`✅ [DashboardPage] Device ${data.deviceId} is now ONLINE`);
        }
        setIsDeviceOnline(true);
        
        // Only add fresh data to sensorData array (charts should only show fresh data)
        setSensorData(prev => {
          if (prev.length > 0 && prev[prev.length - 1].timestamp === data.timestamp) {
            console.debug('⏭️ [DashboardPage] Duplicate timestamp, skipping');
            return prev;
          }
          const newData = [...prev, data].slice(-MAX_HISTORY);
          latestDataRef.current = newData;
          return newData;
        });
      } else {
        // Data is stale - this is historical data from database, don't mark as online
        // But we've already updated latestReading above, so the display will still show the data
        console.debug(`⚠️ [DashboardPage] Received stale historical data (original age: ${timestampAge}ms, threshold: ${FRESHNESS_THRESHOLD_MS}ms). Device appears offline but data is still displayed.`);
        // Don't update heartbeat or online status for stale data
        // Don't add stale data to sensorData array (charts should only show fresh data)
      }
    }, deviceId);

    return () => {
      console.log(`🔌 [DashboardPage] Unsubscribing from telemetry for deviceId: "${deviceId}"`);
      unsubscribe();
    };
  }, [mode, deviceId, loadingDevice, refreshKey]);

  // --- Simulation Logic ---
  useEffect(() => {
    if (mode !== 'SIMULATION') return;

    const interval = setInterval(() => {
      const now = Date.now();
      lastHeartbeatRef.current = now;
      setIsDeviceOnline(true);

      const lastReading = latestDataRef.current[latestDataRef.current.length - 1];
      let baseTemp = lastReading ? lastReading.temperature : 22.5;
      let baseHum = lastReading ? lastReading.humidity : 45;
      let baseHR = lastReading ? lastReading.heartRate : 72;

      // Random Walk
      if (simulationMode === 'NORMAL') {
        baseTemp += (Math.random() - 0.5) * 0.2; 
        baseHum += (Math.random() - 0.5) * 1.5;
        baseHR += (Math.random() - 0.5) * 3;
        if (baseHR < 55) baseHR = 56;
        if (baseHR > 100) baseHR = 99;
      } else {
        baseTemp += (Math.random()) * 0.5; 
        baseHum += (Math.random() - 0.5) * 5;
        baseHR += Math.random() * 2; 
        if (baseHR > 160) baseHR = 160;
      }

      const newReading: SensorReading = {
        timestamp: now,
        temperature: parseFloat(baseTemp.toFixed(1)),
        humidity: Math.floor(baseHum),
        heartRate: Math.floor(baseHR),
        machineId: deviceId || 'ESP32-SIM-01', 
        deviceId: deviceId || 'ESP32-SIM-01'
      };

      setLatestReading(newReading); 
      setSensorData(prev => {
        const newData = [...prev, newReading].slice(-MAX_HISTORY); 
        latestDataRef.current = newData;
        return newData;
      });

    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, [mode, simulationMode, deviceId, refreshKey]);

  // --- AI Logic ---
  useEffect(() => {
    const aiInterval = setInterval(async () => {
      if (latestDataRef.current.length < 5 || isReporting) return;

      setSystemState(SystemState.ANALYZING);
      // PASS WEATHER DATA AND HISTORICAL INCIDENTS HERE
      const analysis = await analyzeTelemetry(latestDataRef.current, userProfile, weatherData, historicalIncidents);
      
      const newPrediction: AIPrediction = {
        id: `pred-${Date.now()}`,
        timestamp: Date.now(),
        ...analysis,
        riskScore: analysis.riskScore || risk.value
      };

      if (deviceId) {
          savePredictionToHistory(newPrediction, deviceId).catch(console.error);
      }

      // Always update predictions to show latest AI analysis (for risk bar)
      setPredictions(prev => [newPrediction, ...prev].slice(0, 10));
      
      // -------------------------------------------------------------------
      // HIGH-RISK ALERT LOGIC (for ESP32 vibration motor)
      //
      // Goal:
      // - Only vibrate the motor for TRUE high-risk migraine situations
      //   when the AI detects a strong pattern (CRITICAL status + high
      //   riskScore).
      // - Avoid random / noisy alerts from mild warnings or small spikes.
      // - Avoid repeated alerts when the risk is already active.
      // -------------------------------------------------------------------
      if (deviceId && mode === 'LIVE') {
        const riskScore = analysis.riskScore || risk.value;
        const ALERT_THRESHOLD = 75; // Only very high risk (75-100) should vibrate

        const shouldTriggerCriticalAlert =
          analysis.status === 'CRITICAL' && riskScore >= ALERT_THRESHOLD;

        if (shouldTriggerCriticalAlert) {
          // Only send a new alert if we weren't already in an active alert state
          // or the risk score has changed significantly.
          const last = lastAlertStateRef.current;
          const hasMeaningfulChange =
            !last.active || last.riskScore === null || Math.abs(last.riskScore - riskScore) >= 5;

          if (hasMeaningfulChange) {
            sendHighRiskAlert(
              deviceId,
              riskScore,
              'CRITICAL',
              analysis.message,
              analysis.suggestedAction
            ).catch(err => {
              console.error("❌ [DashboardPage] Failed to send high-risk alert:", err);
            });

            lastAlertStateRef.current = { active: true, riskScore };
          }
        } else if (lastAlertStateRef.current.active) {
          // Risk is no longer at critical level → clear any active alert
          clearHighRiskAlert(deviceId).catch(err => {
            console.error("❌ [DashboardPage] Failed to clear alert:", err);
          });
          lastAlertStateRef.current = { active: false, riskScore: null };
        }
      }
      
      if (analysis.status === 'CRITICAL') {
        setSystemState(SystemState.ALERT);
      } else {
        setSystemState(SystemState.MONITORING);
      }

    }, AI_CHECK_INTERVAL_MS);

    return () => clearInterval(aiInterval);
  }, [isReporting, deviceId, risk.value, userProfile, weatherData, historicalIncidents, mode]);

  // --- Actions ---
  const handleReportMigraine = async () => {
    try {
      setIsReporting(true);
      
      const tempId = `rep-${Date.now()}`;
      const placeholderPrediction: AIPrediction = {
          id: tempId,
          timestamp: Date.now(),
          status: 'ANALYSIS',
          confidence: 0,
          message: 'Processing user report...',
          suggestedAction: 'Please wait...',
          source: 'USER_REPORT'
      };
      setPredictions(prev => [placeholderPrediction, ...prev]);

      // Get AI analysis first, then save incident with analysis
      const analysis = await analyzeUserReport(latestDataRef.current, userProfile, weatherData);
      
      // Save the incident pattern WITH AI analysis
      console.log("🔍 [handleReportMigraine] Starting incident save process...");
      const incidentId = await saveMigraineIncident(
        latestDataRef.current,
        weatherData,
        userProfile,
        {
          status: analysis.status,
          message: analysis.message,
          suggestedAction: analysis.suggestedAction,
          riskScore: analysis.riskScore || 100
        }
      );
      
      if (incidentId) {
        console.log(`✅ [handleReportMigraine] Migraine incident saved successfully! ID: ${incidentId}`);
        // Refresh historical incidents after saving
        try {
          const updatedIncidents = await getHistoricalIncidents(10);
          setHistoricalIncidents(updatedIncidents);
          console.log(`✅ [handleReportMigraine] Refreshed historical incidents. Count: ${updatedIncidents.length}`);
        } catch (error) {
          console.error("❌ [handleReportMigraine] Error refreshing historical incidents:", error);
        }
      } else {
        console.error("❌ [handleReportMigraine] Failed to save migraine incident. Check console for details.");
      }

      const finalPrediction: AIPrediction = {
          id: tempId, 
          timestamp: Date.now(),
          ...analysis,
          // For a user-reported migraine, risk is certain (100%).
          riskScore: 100,
          source: 'USER_REPORT'
      };

      // Note: saveMigraineIncident now saves to both:
      // 1. reportedIncidents collection (for AI pattern learning)
      // 2. predictions collection (with source: 'USER_REPORT')
      // AI monitoring predictions (every 2 minutes) also go to predictions with source: 'AI_MONITOR'

      setPredictions(prev => prev.map(p => p.id === tempId ? finalPrediction : p));
      setLastReportTime(Date.now());
    } catch (error) {
      console.error("❌ [handleReportMigraine] Unexpected error:", error);
    } finally {
      setIsReporting(false);
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    try {
      await deleteMigraineIncident(incidentId);
      // Optimistically update local state
      setHistoricalIncidents(prev => prev.filter(incident => incident.id !== incidentId));
      console.log(`✅ [DashboardPage] Incident ${incidentId} deleted and local state updated`);
    } catch (error) {
      console.error("❌ [DashboardPage] Failed to delete incident:", error);
    }
  };

  const latestPrediction = predictions.length > 0 ? predictions[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark text-slate-800 dark:text-slate-200">
      <ArchitectureModal isOpen={showArchModal} onClose={() => setShowArchModal(false)} />
      <IncidentHistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        incidents={historicalIncidents}
        onDeleteIncident={handleDeleteIncident}
      />
      <DeviceModal 
        isOpen={showDeviceModal} 
        onClose={handleCloseDeviceModal}
        isOnline={isDeviceOnline}
      />
      
      {/* --- HEADER --- */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LOGO */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nexus-accent to-purple-600 flex items-center justify-center shadow-lg shadow-nexus-accent/20 transform hover:scale-105 transition-transform">
                <i className="fas fa-brain text-white text-lg"></i>
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                SMMD
                </h1>
                <span className="text-[10px] font-bold text-nexus-accent tracking-widest uppercase opacity-80">
                    Monitor
                </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
             {/* Battery Level Display */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
               <BatteryLevel 
                 level={latestReading?.batteryLevel} 
                 size="sm"
                 showPercentage={true}
               />
             </div>

             {/* Device Status Badge */}
             <button 
                onClick={() => setShowDeviceModal(true)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase transition-all ${
                    isDeviceOnline 
                    ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
                }`}
             >
                <div className={`w-2 h-2 rounded-full ${isDeviceOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                {loadingDevice ? 'Syncing...' : isDeviceOnline ? 'System Online' : 'Offline'}
             </button>

             <button
               onClick={handleManualRefresh}
               className="p-2 text-slate-500 dark:text-slate-400 hover:text-nexus-accent dark:hover:text-white transition-colors"
             >
                <i className={`fas fa-sync-alt ${loadingDevice ? 'fa-spin' : ''}`}></i>
             </button>

             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

             <button 
                onClick={() => onNavigate('SETTINGS')}
                className="p-2 text-slate-400 hover:text-nexus-accent dark:hover:text-white transition-colors"
            >
                <i className="fas fa-cog"></i>
            </button>

            <button 
                onClick={() => onNavigate('PROFILE')}
                className="flex items-center gap-2 pl-2"
            >
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:border-nexus-accent transition-colors">
                    <i className="fas fa-user text-sm"></i>
                </div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Device Linking Warning */}
        {mode === 'LIVE' && !loadingDevice && !deviceId && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg">
                 <i className="fas fa-exclamation-triangle text-xl"></i>
              </div>
              <div>
                <p className="font-bold text-sm">Setup Required</p>
                <p className="text-xs opacity-80">Link your ESP32 device ID to enable real-time monitoring.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeviceModal(true)}
              className="bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              Link Device
            </button>
          </div>
        )}

        {/* --- GRID SYSTEM --- */}
        <div className="grid grid-cols-12 gap-6">

            {/* --- ROW 1: STATUS & AI INSIGHT (HERO) --- */}
            
            {/* Col 1: Current Status & Risk (4 cols) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white dark:bg-nexus-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i className="fas fa-shield-heart text-6xl text-slate-500 dark:text-white"></i>
                    </div>
                    
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {getGreeting()}, <span className="text-nexus-accent">{displayName}</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">System is active and monitoring.</p>
                    
                    {/* AI RISK STATUS */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50 backdrop-blur-sm">
                         {isDeviceOnline ? (
                            latestPrediction ? (
                              <div className="w-full">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">AI Migraine Risk</span>
                                    <span className={`text-sm font-bold mt-1 ${
                                      latestPrediction.status === 'CRITICAL' ? 'text-red-600 dark:text-red-400' :
                                      latestPrediction.status === 'WARNING' ? 'text-yellow-600 dark:text-yellow-400' :
                                      latestPrediction.status === 'ANALYSIS' ? 'text-blue-600 dark:text-blue-400' :
                                      'text-green-600 dark:text-green-400'
                                    }`}>
                                      {latestPrediction.status === 'CRITICAL' ? '🔴 CRITICAL' :
                                       latestPrediction.status === 'WARNING' ? '🟡 WARNING' :
                                       latestPrediction.status === 'ANALYSIS' ? '🔵 ANALYZING' :
                                       '🟢 NORMAL'}
                                    </span>
                                  </div>
                                  {latestPrediction.riskScore !== undefined && (
                                    <div className="text-right">
                                      <span className={`text-2xl font-bold font-mono leading-none ${
                                        latestPrediction.riskScore > 70 ? 'text-red-600 dark:text-red-400' :
                                        latestPrediction.riskScore > 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-green-600 dark:text-green-400'
                                      }`}>
                                        {Math.round(latestPrediction.riskScore)}%
                                      </span>
                                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                        Risk Score
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* AI Message Preview */}
                                {latestPrediction.message && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                      {latestPrediction.message.length > 100 
                                        ? latestPrediction.message.substring(0, 100) + '...' 
                                        : latestPrediction.message}
                                    </p>
                                    {latestPrediction.suggestedAction && (
                                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">
                                        💡 {latestPrediction.suggestedAction.length > 60
                                          ? latestPrediction.suggestedAction.substring(0, 60) + '...'
                                          : latestPrediction.suggestedAction}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="py-2 text-center">
                                <div className="text-slate-400 dark:text-slate-500 text-xs mb-2">
                                  <i className="fas fa-brain mb-1 block text-lg"></i>
                                  Waiting for AI analysis...
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  First analysis in ~2 minutes
                                </div>
                              </div>
                            )
                        ) : (
                             <div className="py-2 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                                <i className="fas fa-wifi-slash mb-1 block text-lg"></i>
                                Waiting for telemetry...
                             </div>
                        )}
                    </div>

                    {/* Battery Status Card */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Device Battery</span>
                        <BatteryLevel 
                          level={latestReading?.batteryLevel} 
                          size="md"
                          showPercentage={true}
                        />
                      </div>
                      {latestReading && latestReading.batteryLevel !== undefined && latestReading.batteryLevel !== null && latestReading.batteryLevel < 20 && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                          <i className="fas fa-exclamation-triangle"></i>
                          Low battery - please charge device
                        </p>
                      )}
                    </div>

                    {/* NEW WEATHER WIDGET */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Weather Data</span>
                            <button
                                onClick={handleToggleWeather}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                    weatherEnabled
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                                }`}
                            >
                                {weatherEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        {weatherEnabled && weatherData ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">
                                        {weatherData.weatherCode === 0 ? '☀️' : 
                                         weatherData.weatherCode < 3 ? '⛅' : 
                                         weatherData.weatherCode < 50 ? '☁️' : '🌧️'}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase">{weatherData.description}</div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Pressure: {weatherData.pressure} hPa</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <div className="text-lg font-bold font-mono">{weatherData.temperature}°C</div>
                                     <div className="text-[10px] text-slate-400">Outdoor</div>
                                </div>
                            </div>
                        ) : weatherEnabled ? (
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <i className="fas fa-location-arrow"></i> Loading weather data...
                            </div>
                        ) : (
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <i className="fas fa-toggle-off"></i> Weather data disabled
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Col 2: AI Analyst (8 cols) */}
            <div className="col-span-12 lg:col-span-8">
                 <div className="h-full bg-white dark:bg-nexus-panel rounded-2xl border border-nexus-accent/30 dark:border-nexus-accent/20 shadow-xl shadow-nexus-accent/5 overflow-hidden flex flex-col relative">
                     {/* Decorative gradient header */}
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nexus-accent via-purple-500 to-nexus-accent"></div>
                     
                     <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <div className="bg-gradient-to-br from-nexus-accent to-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <i className="fas fa-robot"></i>
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">AI Health Analyst</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Inference</span>
                                </div>
                             </div>
                        </div>
                        {latestPrediction && (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase border ${
                                latestPrediction.status === 'NORMAL' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' :
                                latestPrediction.status === 'WARNING' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                                'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                            }`}>
                                {latestPrediction.status}
                            </span>
                        )}
                     </div>

                     <div className="flex-1 p-6 flex flex-col justify-center">
                        {latestPrediction ? (
                            <div className="space-y-4">
                                <p className="text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed">
                                    "{latestPrediction.message}"
                                </p>
                                {latestPrediction.suggestedAction && (
                                    <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-xl border border-purple-100 dark:border-purple-500/20">
                                        <i className="fas fa-lightbulb text-purple-500 mt-0.5"></i>
                                        <div>
                                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase block mb-1">Recommendation</span>
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{latestPrediction.suggestedAction}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-4">
                                <i className="fas fa-wave-square text-4xl mb-2 opacity-50"></i>
                                <span className="text-sm">Analyzing biometric stream...</span>
                            </div>
                        )}
                     </div>
                 </div>
            </div>


            {/* --- ROW 2: VITALS GRID (4 Cards) --- */}
            
            <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Heart Rate */}
                <div className="bg-white dark:bg-nexus-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Heart Rate</span>
                        <i className="fas fa-heartbeat text-rose-500"></i>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${latestReading && latestReading.heartRate > 0 && Number(latestReading.heartRate) > 100 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                            {latestReading && latestReading.heartRate > 0 ? Number(latestReading.heartRate).toFixed(0) : '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">BPM</span>
                    </div>
                    {latestReading && latestReading.heartRate === 0 && (latestReading.temperature > 0 || latestReading.humidity > 0) && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                            <i className="fas fa-exclamation-triangle"></i>
                            Heart rate sensor not reading - check ESP32 sensor code
                        </p>
                    )}
                </div>

                {/* Temp */}
                <div className="bg-white dark:bg-nexus-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ambient Temp</span>
                        <i className="fas fa-thermometer-half text-orange-500"></i>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${latestReading && Number(latestReading.temperature ?? 0) > 28 ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                            {latestReading ? Number(latestReading.temperature).toFixed(1) : '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">°C</span>
                    </div>
                </div>

                {/* Humidity */}
                <div className="bg-white dark:bg-nexus-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Humidity</span>
                        <i className="fas fa-tint text-blue-500"></i>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                            {latestReading ? Number(latestReading.humidity).toFixed(0) : '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">%</span>
                    </div>
                </div>

                 {/* Stress */}
                 <div className="bg-white dark:bg-nexus-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stress Lvl</span>
                        <i className="fas fa-bolt text-yellow-500"></i>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${!isDeviceOnline ? 'text-slate-300 dark:text-slate-600' : averages.stress === 'High' ? 'text-red-500' : averages.stress === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                             {isDeviceOnline ? averages.stress : '--'}
                        </span>
                    </div>
                </div>
            </div>


            {/* --- ROW 3: CHARTS & ACTIONS --- */}

            {/* Col 1: Charts (8 cols) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SensorChart 
                        data={sensorData} 
                        dataKey="heartRate" 
                        color="#f43f5e" 
                        title="Live Heart Rate Trend" 
                        unit="BPM"
                        warningThreshold={100}
                        criticalThreshold={120}
                        isOnline={isDeviceOnline}
                    />
                    <SensorChart 
                        data={sensorData} 
                        dataKey="temperature" 
                        color="#f97316" 
                        title="Temperature" 
                        unit="°C"
                        isOnline={isDeviceOnline}
                    />
                    <SensorChart 
                        data={sensorData} 
                        dataKey="humidity" 
                        color="#3b82f6" 
                        title="Humidity" 
                        unit="%"
                        isOnline={isDeviceOnline}
                    />
                </div>
            </div>

            {/* Col 2: Actions & Details (4 cols) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                
                {/* Manual Report Card */}
                 <div className="bg-gradient-to-br from-white to-slate-50 dark:from-nexus-panel dark:to-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Feeling Unwell?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Manually reporting an attack helps the AI learn your specific triggers.
                    </p>
                    <button 
                        onClick={handleReportMigraine}
                        disabled={isReporting}
                        className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg transform active:scale-95 ${
                            isReporting 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/30'
                        }`}
                        >
                        {isReporting ? (
                            <>
                            <i className="fas fa-circle-notch fa-spin"></i> Processing...
                            </>
                        ) : (
                            <>
                            <i className="fas fa-exclamation-triangle"></i> Report Migraine Incident
                            </>
                        )}
                    </button>
                    <div className="mt-4 flex justify-center">
                        <button 
                            onClick={() => setShowHistoryModal(true)}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                        >
                            View Incident History
                        </button>
                    </div>
                </div>

                {/* Triggers List */}
                 <div className="bg-gradient-to-br from-white to-slate-50 dark:from-nexus-panel dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-bolt text-yellow-500"></i> Active Triggers
                    </h3>
                    {currentTriggers.length > 0 ? (
                        <div className="space-y-2">
                            {currentTriggers.map((trigger, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-200 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20">
                                    <i className="fas fa-exclamation-circle text-red-500"></i>
                                    {trigger}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-600">
                             <i className="fas fa-check-circle text-2xl mb-2 text-green-500/50"></i>
                             <p className="text-xs">No active triggers detected.</p>
                        </div>
                    )}
                </div>


            </div>

        </div>

      </main>
    </div>
  );
};

export default DashboardPage;