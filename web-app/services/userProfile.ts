import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getFirebaseApp } from "./firebase";
import { UserProfile, AIPrediction, MigraineIncident, SensorReading, WeatherData } from '../types';

// Helpers to safely get instances
const getDb = () => {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    return app.firestore();
};

const getAuth = () => {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    return app.auth();
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const app = getFirebaseApp();
  if (!app) return null;
  
  const auth = app.auth();
  const user = auth.currentUser;
  
  if (!user) return null;

  try {
    const db = app.firestore();
    const docRef = db.collection("users").doc(user.uid);
    const snap = await docRef.get();
    
    if (!snap.exists) {
        // If doc doesn't exist, return basic auth info
        return {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
        };
    }

    const data = snap.data();
    if (!data) return null;

    return {
        uid: user.uid,
        email: data.email,
        displayName: data.display_name,
        deviceId: data.deviceId,
        age: data.profile?.age,
        sex: data.profile?.sex,
        heightCm: data.profile?.heightCm,
        weightKg: data.profile?.weightKg,
        caffeinePerDay: data.profile?.caffeinePerDay,
        smoker: data.profile?.smoker,
        typicalSleepHours: data.profile?.typicalSleepHours,
        migraineHistoryYears: data.migraine?.migraineHistoryYears,
        triggers: data.migraine?.triggers || [],
        updatedAt: data.updatedAt?.toMillis?.() || Date.now()
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const saveUserProfile = async (profileData: UserProfile): Promise<void> => {
    const auth = getAuth();
    const db = getDb();

    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const docRef = db.collection("users").doc(user.uid);

    // Construct the structured object for Firestore
    const payload = {
        display_name: profileData.displayName,
        email: profileData.email, // usually immutable but useful for redundancy
        profile: {
            age: profileData.age || null,
            sex: profileData.sex || null,
            heightCm: profileData.heightCm || null,
            weightKg: profileData.weightKg || null,
            caffeinePerDay: profileData.caffeinePerDay || 0,
            smoker: profileData.smoker || false,
            typicalSleepHours: profileData.typicalSleepHours || null,
        },
        migraine: {
            migraineHistoryYears: profileData.migraineHistoryYears || 0,
            triggers: profileData.triggers || [],
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Update Auth profile if name changed
    if (profileData.displayName && user.displayName !== profileData.displayName) {
        await user.updateProfile({ displayName: profileData.displayName });
    }

    await docRef.set(payload, { merge: true });
};

export const linkDeviceToUser = async (deviceId: string): Promise<void> => {
  const auth = getAuth();
  const db = getDb();

  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const batch = db.batch();

  // 1. Update User Document
  const userRef = db.collection("users").doc(user.uid);
  batch.set(userRef, { deviceId: deviceId }, { merge: true });

//   // 2. Update Devices Collection (Global Mapping)
//   if (deviceId) {
//       const deviceRef = db.collection("devices").doc(deviceId);
//       batch.set(deviceRef, {
//           uid: user.uid,
//           linkedAt: firebase.firestore.FieldValue.serverTimestamp(),
//           active: true
//       });
//   }

//   await batch.commit();
await userRef.set(
    { deviceId },
    { merge: true }
  );
};

export const savePredictionToHistory = async (prediction: AIPrediction, deviceId: string): Promise<void> => {
    const app = getFirebaseApp();
    if (!app) return;
    
    const auth = app.auth();
    const db = app.firestore();

    const user = auth.currentUser;
    if (!user) return; // Silent fail if no user (or handle appropriately)

    const predictionPayload = {
        ...prediction,
        deviceId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        modelVersion: "gemini-2.0-flash-v1",
        windowStart: prediction.timestamp - 20000, // Approximation
        windowEnd: prediction.timestamp
    };

    // 1. Add to history collection
    await db.collection("users").doc(user.uid).collection("predictions").add(predictionPayload);

    // 2. Update 'latest' doc for quick dashboard reads
    await db.collection("users").doc(user.uid).collection("latest").doc("latestPrediction").set(predictionPayload);
};

// Save a migraine incident with sensor data pattern
export const saveMigraineIncident = async (
  sensorReadings: SensorReading[],
  weatherData?: WeatherData | null,
  userProfile?: UserProfile | null,
  aiAnalysis?: { status: string; message: string; suggestedAction: string; riskScore?: number }
): Promise<string | null> => {
  const app = getFirebaseApp();
  if (!app) {
    console.error("❌ [saveMigraineIncident] Firebase app not initialized");
    return null;
  }
  
  const auth = app.auth();
  const db = app.firestore();
  const user = auth.currentUser;
  
  if (!user) {
    console.error("❌ [saveMigraineIncident] No authenticated user");
    return null;
  }

  console.log(`🔍 [saveMigraineIncident] Attempting to save incident for user: ${user.uid}`);
  console.log(`🔍 [saveMigraineIncident] Sensor readings count: ${sensorReadings.length}`);
  console.log(`🔍 [saveMigraineIncident] Has weather data: ${!!weatherData}`);
  console.log(`🔍 [saveMigraineIncident] Has user profile: ${!!userProfile}`);
  console.log(`🔍 [saveMigraineIncident] Has AI analysis: ${!!aiAnalysis}`);

  try {
    // Prepare sensor readings - ensure we have valid data
    const readingsToSave = sensorReadings.length > 0 
      ? sensorReadings.slice(-60).filter(r => r && r.timestamp) // Last 60 readings, filter invalid
      : [];
    
    if (readingsToSave.length === 0) {
      console.warn("⚠️ [saveMigraineIncident] No valid sensor readings to save");
    }

    const incident: Omit<MigraineIncident, 'id' | 'createdAt'> = {
      userId: user.uid,
      deviceId: userProfile?.deviceId || 'unknown',
      timestamp: Date.now(),
      sensorReadings: readingsToSave,
      weatherData: weatherData || undefined,
      userProfileSnapshot: userProfile ? {
        age: userProfile.age,
        sex: userProfile.sex,
        typicalSleepHours: userProfile.typicalSleepHours,
        smoker: userProfile.smoker,
        caffeinePerDay: userProfile.caffeinePerDay,
        migraineHistoryYears: userProfile.migraineHistoryYears,
        triggers: userProfile.triggers
      } : undefined,
      aiAnalysis: aiAnalysis ? {
        status: aiAnalysis.status,
        message: aiAnalysis.message,
        suggestedAction: aiAnalysis.suggestedAction,
        identifiedPattern: aiAnalysis.riskScore ? `Risk Score: ${aiAnalysis.riskScore}` : undefined
      } : undefined
    };

    console.log(`🔍 [saveMigraineIncident] Incident data prepared:`, {
      userId: incident.userId,
      deviceId: incident.deviceId,
      sensorReadingsCount: incident.sensorReadings.length,
      hasWeather: !!incident.weatherData,
      hasProfile: !!incident.userProfileSnapshot,
      hasAnalysis: !!incident.aiAnalysis
    });

    console.log(`🔍 [saveMigraineIncident] Writing to: users/${user.uid}/reportedIncidents`);
    
    const incidentPayload = {
      ...incident,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`🔍 [saveMigraineIncident] Payload keys:`, Object.keys(incidentPayload));
    
    // 1. Save to reportedIncidents collection for AI pattern learning
    const incidentRef = await db.collection("users")
      .doc(user.uid)
      .collection("reportedIncidents")
      .add(incidentPayload);

    console.log(`✅ [saveMigraineIncident] Saved to reportedIncidents! ID: ${incidentRef.id}`);
    console.log(`✅ [saveMigraineIncident] Full path (INCIDENT ONLY): users/${user.uid}/reportedIncidents/${incidentRef.id}`);
    
    return incidentRef.id;
  } catch (error: any) {
    console.error("❌ [saveMigraineIncident] Error saving migraine incident:", error);
    
    // Check for permission errors
    if (error.code === 'permission-denied') {
      console.error("❌ [saveMigraineIncident] PERMISSION DENIED - Check Firestore security rules!");
      console.error("❌ [saveMigraineIncident] Rules must allow writes to: users/{userId}/reportedIncidents/{document}");
    } else if (error.code === 'unavailable') {
      console.error("❌ [saveMigraineIncident] Firestore unavailable - check network connection");
    } else {
      console.error("❌ [saveMigraineIncident] Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
    
    return null;
  }
};

// Delete a migraine incident from the user's reportedIncidents collection
export const deleteMigraineIncident = async (incidentId: string): Promise<void> => {
  const app = getFirebaseApp();
  if (!app) {
    console.warn("⚠️ [deleteMigraineIncident] Firebase app not initialized");
    return;
  }

  const auth = app.auth();
  const db = app.firestore();
  const user = auth.currentUser;

  if (!user) {
    console.warn("⚠️ [deleteMigraineIncident] No authenticated user");
    return;
  }

  try {
    console.log(`🗑️ [deleteMigraineIncident] Deleting incident ${incidentId} for user: ${user.uid}`);
    await db
      .collection("users")
      .doc(user.uid)
      .collection("reportedIncidents")
      .doc(incidentId)
      .delete();
    console.log(`✅ [deleteMigraineIncident] Incident ${incidentId} deleted successfully`);
  } catch (error: any) {
    console.error("❌ [deleteMigraineIncident] Error deleting incident:", error);
    if (error.code === 'permission-denied') {
      console.error("❌ [deleteMigraineIncident] PERMISSION DENIED - Check Firestore security rules!");
      console.error("❌ [deleteMigraineIncident] Rules must allow deletes to: users/{userId}/reportedIncidents/{document}");
    }
  }
};

// Retrieve historical migraine incidents for pattern learning
export const getHistoricalIncidents = async (
  limit: number = 10
): Promise<MigraineIncident[]> => {
  const app = getFirebaseApp();
  if (!app) {
    console.warn("⚠️ [getHistoricalIncidents] Firebase app not initialized");
    return [];
  }
  
  const auth = app.auth();
  const db = app.firestore();
  const user = auth.currentUser;
  if (!user) {
    console.warn("⚠️ [getHistoricalIncidents] No authenticated user");
    return [];
  }

  try {
    console.log(`🔍 [getHistoricalIncidents] Fetching incidents for user: ${user.uid}`);
    const incidentsRef = db.collection("users")
      .doc(user.uid)
      .collection("reportedIncidents")
      .orderBy("timestamp", "desc")
      .limit(limit);

    const snapshot = await incidentsRef.get();
    
    console.log(`🔍 [getHistoricalIncidents] Found ${snapshot.size} incidents in database`);
    
    const incidents: MigraineIncident[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      incidents.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt
      } as MigraineIncident);
    });

    console.log(`✅ [getHistoricalIncidents] Loaded ${incidents.length} incidents`);
    return incidents;
  } catch (error: any) {
    console.error("❌ [getHistoricalIncidents] Error fetching historical incidents:", error);
    if (error.code === 'permission-denied') {
      console.error("❌ [getHistoricalIncidents] PERMISSION DENIED - Check Firestore security rules!");
      console.error("❌ [getHistoricalIncidents] Rules must allow reads to: users/{userId}/reportedIncidents/{document}");
    }
    return [];
  }
};