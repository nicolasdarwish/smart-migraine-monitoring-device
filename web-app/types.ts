
// Represents data coming from the "ESP32" via "RTDB"
export interface SensorReading {
  timestamp: number;
  temperature: number; // Celsius (Ambient)
  humidity: number; // % (Ambient)
  heartRate: number; // BPM (User Biometric)
  machineId: string;
  deviceId: string; // Required: canonical device identifier
  batteryLevel?: number; // Battery percentage (0-100)
}

// Weather data from Open-Meteo
export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number; // hPa - Critical for migraines
  weatherCode: number; // WMO code
  description: string;
  isDay: boolean;
  timestamp: number;
}

// Represents the AI analysis stored in "Firestore"
export interface AIPrediction {
  id: string;
  timestamp: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ANALYSIS';
  confidence: number;
  message: string;
  suggestedAction: string;
  source: 'AI_MONITOR' | 'USER_REPORT';
  riskScore?: number; // 0-100
}

// Persisted format for Firestore
export interface PersistedPrediction extends AIPrediction {
  deviceId: string;
  windowStart?: number;
  windowEnd?: number;
  modelVersion: string;
  createdAt: any; // Firestore Timestamp
}

// Represents a command trigger written to "RTDB"
export interface DeviceCommand {
  id: string;
  command: 'SHUTDOWN' | 'RESET' | 'CALIBRATE' | 'FAN_ON' | 'FAN_OFF';
  status: 'PENDING' | 'EXECUTED';
  timestamp: number;
  issuedBy: 'USER' | 'AI_WORKER';
}

export interface SystemLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
}

export interface UserProfile {
  // Auth Data
  uid?: string;
  email?: string;
  displayName?: string;
  deviceId?: string;
  
  // Personal Stats
  age?: number;
  sex?: 'Male' | 'Female' | 'Other' | '';
  heightCm?: number;
  weightKg?: number;
  
  // Lifestyle
  caffeinePerDay?: number;
  smoker?: boolean;
  typicalSleepHours?: number;
  
  // Medical
  migraineHistoryYears?: number;
  triggers?: string[]; // stored as array
  
  updatedAt?: number;
}

export interface FirebaseConfig {
  apiKey: string;
  databaseURL: string;
  projectId?: string;
  sensorPath: string; // The node where ESP32 writes data, e.g. "readings"
}

export enum SystemState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING',
  ANALYZING = 'ANALYZING',
  ALERT = 'ALERT'
}

export type PageView = 'WELCOME' | 'SIGNIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'DASHBOARD' | 'PROFILE' | 'SETTINGS';

// Migraine incident with complete sensor pattern data
export interface MigraineIncident {
  id: string;
  userId: string;
  deviceId: string;
  timestamp: number;
  
  // The sensor readings leading up to the migraine (last 60 seconds)
  sensorReadings: SensorReading[];
  
  // Weather data at the time of incident
  weatherData?: WeatherData;
  
  // User profile snapshot at time of incident
  userProfileSnapshot?: Partial<UserProfile>;
  
  // AI analysis of the incident
  aiAnalysis?: {
    status: string;
    message: string;
    suggestedAction: string;
    identifiedPattern?: string; // What pattern the AI identified
  };
  
  // User feedback (optional, for future enhancement)
  severity?: number; // 1-10 scale
  duration?: number; // minutes
  notes?: string;
  
  createdAt: any; // Firestore timestamp
}