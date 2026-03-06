import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { SensorReading } from '../types';

// ============================================================================
// 🔒 FIREBASE CONFIGURATION
// ============================================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDClilSXDM_5RE712y6pARBtXtYADoSZCQ",
  authDomain: "smmd-854c8.firebaseapp.com",
  databaseURL: "https://smmd-854c8-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "smmd-854c8",
  storageBucket: "smmd-854c8.firebasestorage.app",
  messagingSenderId: "206506760475",
  appId: "1:206506760475:web:6317a48d9d8e5245cb9bbe",
  
  // App-specific paths for ESP32 communication
  sensorPath: 'sensorReadings', 
  commandPath: 'commands',
  alertsPath: 'alerts' // Path for high-risk migraine alerts
};

// Singleton instances (internal)
let appInstance: firebase.app.App | undefined;
let dbInstance: firebase.database.Database | undefined;

// Keep track of whether we've already warned about stale device timestamps
let hasLoggedStaleTimestampWarning = false;

// Initialization function that can be called safely
export const initializeFirebase = (): firebase.app.App | null => {
  if (appInstance) return appInstance;

  // Safety check for module loading issues
  if (!firebase) {
      console.error("Firebase module not loaded. Check import map.");
      return null;
  }

  try {
    if (!firebase.apps.length) {
      appInstance = firebase.initializeApp({
        apiKey: FIREBASE_CONFIG.apiKey,
        authDomain: FIREBASE_CONFIG.authDomain,
        databaseURL: FIREBASE_CONFIG.databaseURL,
        projectId: FIREBASE_CONFIG.projectId,
        storageBucket: FIREBASE_CONFIG.storageBucket,
        messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
        appId: FIREBASE_CONFIG.appId,
      });
    } else {
      appInstance = firebase.app();
    }

    // Initialize services
    // Note: Auth and Firestore are auto-initialized by the imports above
    dbInstance = appInstance.database();
    
    console.log("✅ Firebase initialized");
    return appInstance;

  } catch (err) {
    console.warn("⚠️ Firebase unavailable (preview mode). App will continue.", err);
    appInstance = undefined;
    dbInstance = undefined;
    return null;
  }
};

// Accessors to ensure consumers get the initialized instance
export const getFirebaseApp = () => appInstance;
export const getFirebaseDb = () => dbInstance;

// Helper to parse a raw data object into a SensorReading
const parseReading = (val: any): SensorReading | null => {
  if (!val || typeof val !== 'object') {
    console.debug('🔍 [parseReading] Invalid input:', val);
    return null;
  }

  // Flexible field matching for standard ESP32 payload variations
  const temp = val.temperature ?? val.temp ?? val.t ?? 0;
  const hum = val.humidity ?? val.hum ?? val.h ?? 0;
  
  // Try multiple variations of heart rate field names (case-insensitive check)
  // Check common variations first, then do case-insensitive search as fallback
  let hr = val.heartRate ?? val.heart_rate ?? val.heartrate ?? val.hr ?? val.bpm ?? 
           val.HeartRate ?? val.Heart_Rate ?? val.HR ?? val.BPM ?? 0;
  
  // If still 0, do case-insensitive search through all keys
  if (hr === 0) {
    const keys = Object.keys(val);
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'heartrate' || lowerKey === 'heart_rate' || lowerKey === 'hr' || lowerKey === 'bpm') {
        hr = val[key];
        console.log(`✅ [parseReading] Found heart rate using case-insensitive match: "${key}" = ${hr}`);
        break;
      }
    }
  }
  
  // Log warning if heart rate field not found
  if (hr === 0 && Object.keys(val).length > 0) {
    console.warn('⚠️ [parseReading] Heart rate field not found. Available fields:', Object.keys(val));
    console.warn('⚠️ [parseReading] Raw data sample:', JSON.stringify(val).substring(0, 200));
  }
  
  const battery = val.batteryLevel ?? val.battery_level ?? val.battery ?? val.bat ?? undefined;
  
  // Normalize timestamp_ms → timestamp (timestamp_ms is already in epoch milliseconds)
  let ts = val.timestamp_ms ?? val.timestamp ?? val.ts ?? Date.now();
  
  // Ensure timestamp is numeric milliseconds
  let tsNum = Number(ts);

  // If timestamp looks like "seconds" (very small number), convert to ms
  if (!Number.isNaN(tsNum) && tsNum < 1000000000000) {
    if (tsNum < 1000000000) {
      tsNum = tsNum * 1000;
      console.debug('🔍 [parseReading] Converted timestamp from seconds to ms:', tsNum);
    }
  }

  // Store original timestamp before any substitution
  const originalTimestamp = tsNum;
  
  // If timestamp is wildly out of sync with the current time (e.g. device RTC not set),
  // fall back to the current time so readings are treated as "fresh" for the UI.
  const now = Date.now();
  const driftMs = Math.abs(now - tsNum);
  const DRIFT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  const wasTimestampSubstituted = Number.isNaN(tsNum) || driftMs > DRIFT_THRESHOLD_MS;

  if (wasTimestampSubstituted) {
    // Only show a loud warning once per session to avoid console spam.
    if (!hasLoggedStaleTimestampWarning) {
      hasLoggedStaleTimestampWarning = true;
      console.warn('⚠️ [parseReading] Device timestamps appear to be stale or unreliable. Using server time instead so charts stay live. This is usually because the ESP32 clock is not set:', {
        rawTimestamp: ts,
        parsedTimestamp: tsNum,
        now,
        driftMs
      });
    } else {
      console.debug('🔁 [parseReading] Stale/unreliable timestamp detected again, substituting server time.', {
        rawTimestamp: ts,
        parsedTimestamp: tsNum,
        now,
        driftMs
      });
    }
    tsNum = now;
  }
  
  // ID matching - deviceId is the canonical identifier
  let dId = val.deviceId ?? val.device_id;
  const mId = val.machineId ?? val.machine_id ?? val.id ?? val.clientId ?? 'ESP32-GENERIC';

  // If deviceId is missing but we have a machineId, fall back to that so that
  // real devices that only send "machineId" are still recognized as online.
  if (!dId && mId) {
    console.warn('⚠️ [parseReading] Missing deviceId, falling back to machineId as deviceId:', {
      machineId: mId,
      raw: val
    });
    dId = mId;
  }

  // deviceId is required - if still missing, we cannot process this reading
  if (!dId) {
    console.warn('⚠️ [parseReading] Missing both deviceId and machineId in reading:', val);
    return null;
  }

  const parsed: SensorReading = {
    timestamp: tsNum,
    temperature: Number(temp),
    humidity: Number(hum),
    heartRate: Number(hr),
    machineId: String(mId),
    deviceId: String(dId), // Required field
    batteryLevel: battery !== undefined ? Number(battery) : undefined,
    // Store original timestamp for freshness checking (even if it was substituted)
    // This allows us to detect if we're receiving old historical data
    originalTimestamp: originalTimestamp
  } as SensorReading & { originalTimestamp: number };

  console.debug('✅ [parseReading] Parsed reading:', {
    deviceId: parsed.deviceId,
    timestamp: new Date(parsed.timestamp).toISOString(),
    temp: parsed.temperature,
    humidity: parsed.humidity,
    heartRate: parsed.heartRate,
    batteryLevel: parsed.batteryLevel,
    rawHeartRate: hr, // Log the raw value before Number() conversion
    rawDataKeys: Object.keys(val) // Log all available keys in raw data
  });
  
  // Warn if heart rate is 0 but we have other valid data (might indicate field name mismatch)
  if (parsed.heartRate === 0 && (parsed.temperature > 0 || parsed.humidity > 0)) {
    console.warn('⚠️ [parseReading] Heart rate is 0 but other sensors have data. Raw data:', val);
  }

  return parsed;
};

export const subscribeToSensors = (
  onData: (data: SensorReading) => void,
  deviceIdFilter?: string
) => {
  const db = getFirebaseDb();
  if (!db) {
     console.warn("⚠️ [subscribeToSensors] Database not initialized, cannot subscribe to sensors.");
     return () => {};
  }

  const filterClean = deviceIdFilter ? deviceIdFilter.trim() : null;
  console.log(`📡 [subscribeToSensors] Subscribing to ${FIREBASE_CONFIG.sensorPath}... Filter: ${filterClean || 'None'}`);
  
  const sensorsRef = db.ref(FIREBASE_CONFIG.sensorPath);

  // Optional nested path for per-device readings: sensorReadings/{deviceId}
  // This allows us to support both:
  //  - Flat schema:   sensorReadings/{pushId} -> reading
  //  - Nested schema: sensorReadings/{deviceId}/{pushId} -> reading
  let deviceNodeRef: firebase.database.Reference | null = null;
  let deviceChildAddedListener: any;
  let deviceValueListener: any;
  
  // Track latest readings per deviceId for filtering
  const latestReadings = new Map<string, SensorReading>();
  
  // Use child_added for real-time updates (fires for existing children on attach + new children)
  // This ensures we get both historical data and live updates (flat schema)
  const childAddedListener = sensorsRef.orderByKey().limitToLast(100).on('child_added', (snapshot) => {
    const pushId = snapshot.key;
    const rawVal = snapshot.val();
    
    console.debug(`📥 [subscribeToSensors] Received child_added event for pushId: ${pushId}`, rawVal);
    
    if (!rawVal || typeof rawVal !== 'object') {
      console.warn(`⚠️ [subscribeToSensors] Invalid data for pushId ${pushId}:`, rawVal);
      return;
    }

    // If we have a device filter but the payload doesn't include a deviceId,
    // enrich it so parseReading + filtering can still work for simple schemas.
    const val: any = { ...rawVal };
    if (filterClean && !val.deviceId && !val.device_id) {
      val.deviceId = filterClean;
    }

    // Parse the reading (filtering happens AFTER parsing)
    const parsed = parseReading(val);
    if (!parsed) {
      console.warn(`⚠️ [subscribeToSensors] Failed to parse reading for pushId ${pushId}`);
      return;
    }

    // Filter by deviceId AFTER parsing (deviceId is the canonical identifier)
    if (filterClean) {
      const readingDeviceId = parsed.deviceId.trim();
      if (readingDeviceId.toLowerCase() !== filterClean.toLowerCase()) {
        console.debug(`🔍 [subscribeToSensors] Filtered out reading from deviceId: ${readingDeviceId} (expected: ${filterClean})`);
        return;
      }
    }

    // Store the latest reading for this deviceId
    const existing = latestReadings.get(parsed.deviceId);
    if (!existing || parsed.timestamp > existing.timestamp) {
      latestReadings.set(parsed.deviceId, parsed);
      const originalTs = (parsed as any).originalTimestamp;
      const actualAge = originalTs ? Date.now() - originalTs : Date.now() - parsed.timestamp;
      console.log(`✅ [subscribeToSensors] New telemetry from deviceId: ${parsed.deviceId}`, {
        timestamp: new Date(parsed.timestamp).toISOString(),
        originalTimestamp: originalTs ? new Date(originalTs).toISOString() : 'N/A',
        age: actualAge,
        isHistorical: originalTs && actualAge > 60000, // Flag if older than 60s
        temp: parsed.temperature,
        humidity: parsed.humidity,
        heartRate: parsed.heartRate
      });
      
      // Emit the latest reading for the filtered device
      onData(parsed);
    } else {
      console.debug(`⏭️ [subscribeToSensors] Ignored older reading (${parsed.timestamp} < ${existing.timestamp})`);
    }
  }, (error: any) => {
    console.error("❌ [subscribeToSensors] RTDB child_added Error:", error);
  });

  // Also listen to value for initial snapshot and to catch any missed updates (flat schema)
  const valueListener = sensorsRef.orderByKey().limitToLast(100).on('value', (snapshot) => {
    const rootVal = snapshot.val();
    if (!rootVal) {
      console.debug('📭 [subscribeToSensors] No data in snapshot');
      return;
    }

    console.debug(`📊 [subscribeToSensors] Received value snapshot with ${Object.keys(rootVal).length} entries`);

    // Process all entries from the snapshot
    const allReadings: SensorReading[] = [];
    Object.keys(rootVal).forEach(pushId => {
      const rawEntry = rootVal[pushId];
      if (!rawEntry || typeof rawEntry !== 'object') return;

      const entry: any = { ...rawEntry };
      if (filterClean && !entry.deviceId && !entry.device_id) {
        entry.deviceId = filterClean;
      }

      const parsed = parseReading(entry);
      if (parsed) {
        allReadings.push(parsed);
      }
    });

    if (allReadings.length === 0) {
      console.warn('⚠️ [subscribeToSensors] No valid readings found in snapshot');
      return;
    }

    // Filter by deviceId AFTER parsing
    let filtered = allReadings;
    if (filterClean) {
      filtered = allReadings.filter(r => {
        return r.deviceId.trim().toLowerCase() === filterClean.toLowerCase();
      });
      console.debug(`🔍 [subscribeToSensors] Filtered ${allReadings.length} readings to ${filtered.length} for deviceId: ${filterClean}`);
    }

    if (filtered.length === 0) {
      console.warn(`⚠️ [subscribeToSensors] No readings match deviceId filter: ${filterClean}`);
      return;
    }

    // Sort by timestamp and get the latest
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    const latest = filtered[filtered.length - 1];
    
    // Update our tracking map
    latestReadings.set(latest.deviceId, latest);
    
    console.log(`✅ [subscribeToSensors] Emitting latest reading from snapshot:`, {
      deviceId: latest.deviceId,
      timestamp: new Date(latest.timestamp).toISOString(),
      age: Date.now() - latest.timestamp
    });
    
    onData(latest);
  }, (error: any) => {
    console.error("❌ [subscribeToSensors] RTDB value Error:", error);
  });

  // If a specific deviceId is configured, also listen on a nested path:
  // sensorReadings/{deviceIdFilter} to support schemas that group by deviceId.
  if (filterClean) {
    deviceNodeRef = sensorsRef.child(filterClean);
    
    deviceChildAddedListener = deviceNodeRef.orderByKey().limitToLast(100).on('child_added', (snapshot) => {
      const pushId = snapshot.key;
      const rawVal = snapshot.val();

      console.debug(`📥 [subscribeToSensors] (nested) child_added for ${filterClean}/${pushId}`, rawVal);

      if (!rawVal || typeof rawVal !== 'object') {
        console.warn(`⚠️ [subscribeToSensors] (nested) Invalid data for pushId ${pushId}:`, rawVal);
        return;
      }

      const val: any = { ...rawVal };
      if (!val.deviceId && !val.device_id) {
        val.deviceId = filterClean;
      }

      const parsed = parseReading(val);
      if (!parsed) {
        console.warn(`⚠️ [subscribeToSensors] (nested) Failed to parse reading for pushId ${pushId}`);
        return;
      }

      // At this point parsed.deviceId should already match filterClean, but keep the guard.
      const readingDeviceId = parsed.deviceId.trim();
      if (readingDeviceId.toLowerCase() !== filterClean.toLowerCase()) {
        console.debug(`🔍 [subscribeToSensors] (nested) Filtered out reading from deviceId: ${readingDeviceId} (expected: ${filterClean})`);
        return;
      }

      const existing = latestReadings.get(parsed.deviceId);
      if (!existing || parsed.timestamp > existing.timestamp) {
        latestReadings.set(parsed.deviceId, parsed);
        console.log(`✅ [subscribeToSensors] (nested) New telemetry from deviceId: ${parsed.deviceId}`, {
          timestamp: new Date(parsed.timestamp).toISOString(),
          age: Date.now() - parsed.timestamp,
          temp: parsed.temperature,
          humidity: parsed.humidity,
          heartRate: parsed.heartRate
        });

        onData(parsed);
      } else {
        console.debug(`⏭️ [subscribeToSensors] (nested) Ignored older reading (${parsed.timestamp} < ${existing.timestamp})`);
      }
    }, (error: any) => {
      console.error("❌ [subscribeToSensors] RTDB child_added Error (nested path):", error);
    });

    deviceValueListener = deviceNodeRef.orderByKey().limitToLast(100).on('value', (snapshot) => {
      const nodeVal = snapshot.val();
      if (!nodeVal) {
        console.debug(`📭 [subscribeToSensors] No data at nested path for deviceId: ${filterClean}`);
        return;
      }

      console.debug(`📊 [subscribeToSensors] (nested) value snapshot for ${filterClean} with ${Object.keys(nodeVal).length} entries`);

      const allReadings: SensorReading[] = [];
      Object.keys(nodeVal).forEach(pushId => {
        const rawEntry = nodeVal[pushId];
        if (!rawEntry || typeof rawEntry !== 'object') return;

        const entry: any = { ...rawEntry };
        if (!entry.deviceId && !entry.device_id) {
          entry.deviceId = filterClean;
        }

        const parsed = parseReading(entry);
        if (parsed) {
          allReadings.push(parsed);
        }
      });

      if (allReadings.length === 0) {
        console.warn(`⚠️ [subscribeToSensors] (nested) No valid readings found for deviceId: ${filterClean}`);
        return;
      }

      allReadings.sort((a, b) => a.timestamp - b.timestamp);
      const latest = allReadings[allReadings.length - 1];

      latestReadings.set(latest.deviceId, latest);

      console.log(`✅ [subscribeToSensors] (nested) Emitting latest reading from snapshot:`, {
        deviceId: latest.deviceId,
        timestamp: new Date(latest.timestamp).toISOString(),
        age: Date.now() - latest.timestamp
      });

      onData(latest);
    }, (error: any) => {
      console.error("❌ [subscribeToSensors] RTDB value Error (nested path):", error);
    });
  }

  // Return cleanup function
  return () => {
    console.log(`🔌 [subscribeToSensors] Unsubscribing from sensors`);
    sensorsRef.off('child_added', childAddedListener);
    sensorsRef.off('value', valueListener);
    if (deviceNodeRef && deviceChildAddedListener) {
      deviceNodeRef.off('child_added', deviceChildAddedListener);
    }
    if (deviceNodeRef && deviceValueListener) {
      deviceNodeRef.off('value', deviceValueListener);
    }
    latestReadings.clear();
  };
};

export const sendDeviceCommand = async (command: string, issuedBy: 'USER' | 'AI_WORKER') => {
  const db = getFirebaseDb();
  if (!db) return;

  const commandsRef = db.ref(FIREBASE_CONFIG.commandPath);
  
  const payload = {
    cmd: command,
    status: 'PENDING',
    timestamp: Date.now(),
    issuer: issuedBy
  };

  try {
    await commandsRef.push(payload);
    console.log(`Command sent: ${command}`);
  } catch (e) {
    console.error("Failed to send command", e);
  }
};

/**
 * Send high-risk migraine alert to Realtime Database for ESP32 to read
 * This will trigger the vibrating motor on the ESP32 device
 */
export const sendHighRiskAlert = async (
  deviceId: string,
  riskScore: number,
  status: 'CRITICAL' | 'WARNING',
  message: string,
  suggestedAction: string
): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) {
    console.warn("⚠️ [sendHighRiskAlert] Database not initialized");
    return;
  }

  // Path: alerts/{deviceId}/current
  // This structure allows ESP32 to easily listen to their specific device alerts
  const alertRef = db.ref(`${FIREBASE_CONFIG.alertsPath}/${deviceId}/current`);
  
  const alertPayload = {
    active: true,
    riskScore: riskScore,
    status: status, // 'CRITICAL' or 'WARNING'
    message: message,
    suggestedAction: suggestedAction,
    timestamp: Date.now(),
    timestampISO: new Date().toISOString()
  };

  try {
    await alertRef.set(alertPayload);
    console.log(`🚨 [sendHighRiskAlert] High-risk alert sent to device ${deviceId}:`, {
      status,
      riskScore,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ [sendHighRiskAlert] Failed to send alert:", error);
    throw error;
  }
};

/**
 * Clear/reset the alert for a device (when risk returns to normal)
 */
export const clearHighRiskAlert = async (deviceId: string): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) {
    console.warn("⚠️ [clearHighRiskAlert] Database not initialized");
    return;
  }

  const alertRef = db.ref(`${FIREBASE_CONFIG.alertsPath}/${deviceId}/current`);
  
  try {
    await alertRef.set({
      active: false,
      timestamp: Date.now(),
      timestampISO: new Date().toISOString()
    });
    console.log(`✅ [clearHighRiskAlert] Alert cleared for device ${deviceId}`);
  } catch (error) {
    console.error("❌ [clearHighRiskAlert] Failed to clear alert:", error);
    throw error;
  }
};