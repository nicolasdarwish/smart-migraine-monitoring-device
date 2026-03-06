/*
 * ESP32 Migraine Alert System
 * Reads high-risk alerts from Firebase Realtime Database
 * Triggers vibrating motor when CRITICAL or WARNING status detected
 * 
 * Required Libraries:
 * - Firebase ESP32 Client by Mobizt: https://github.com/mobizt/Firebase-ESP32
 * - WiFi (built-in)
 * 
 * Hardware:
 * - ESP32 Development Board
 * - Vibrating Motor (connected to GPIO pin, e.g., GPIO 2)
 * - Optional: Resistor for motor protection
 */

#include <WiFi.h>
#include <FirebaseESP32.h>

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Configuration
#define FIREBASE_HOST "smmd-854c8-default-rtdb.europe-west1.firebasedatabase.app"
#define FIREBASE_AUTH "YOUR_FIREBASE_DATABASE_SECRET"  // Optional: Database secret from Firebase Console > Realtime Database > Rules

// Device Configuration
#define DEVICE_ID "ESP32-001"  // MUST match the deviceId you use in the web app
#define VIBRATOR_PIN 2        // GPIO pin connected to vibrating motor

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool lastAlertState = false;
unsigned long lastVibrationTime = 0;
const unsigned long VIBRATION_DURATION = 2000; // Vibrate for 2 seconds
const unsigned long VIBRATION_INTERVAL = 5000; // Check every 5 seconds

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== ESP32 Migraine Alert System ===");
  
  // Initialize vibrator pin
  pinMode(VIBRATOR_PIN, OUTPUT);
  digitalWrite(VIBRATOR_PIN, LOW);
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("✅ WiFi Connected! IP: ");
  Serial.println(WiFi.localIP());
  
  // Configure Firebase
  config.host = FIREBASE_HOST;
  config.signer.test_mode = false; // Set to true if not using database secret
  
  // If using database secret (recommended for production)
  // config.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set read timeout
  fbdo.setBSSLBufferSize(4096, 1024);
  fbdo.setResponseSize(2048);
  
  Serial.println("✅ Firebase initialized");
  Serial.print("📡 Listening for alerts on path: /alerts/");
  Serial.print(DEVICE_ID);
  Serial.println("/current");
  Serial.println("\n=== System Ready ===\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Check Firebase for alerts every 5 seconds
  if (currentTime - lastVibrationTime >= VIBRATION_INTERVAL) {
    checkFirebaseAlert();
    lastVibrationTime = currentTime;
  }
  
  // Handle vibration timing
  handleVibration();
  
  delay(100); // Small delay to prevent watchdog issues
}

// ============================================================================
// FUNCTIONS
// ============================================================================

void checkFirebaseAlert() {
  String alertPath = "/alerts/" + String(DEVICE_ID) + "/current";
  
  if (Firebase.getJSON(fbdo, alertPath)) {
    FirebaseJson json = fbdo.jsonObject();
    FirebaseJsonData jsonData;
    
    // Check if alert is active
    bool active = false;
    if (json.get(jsonData, "active")) {
      active = jsonData.boolValue;
    }
    
    // Get status
    String status = "";
    if (json.get(jsonData, "status")) {
      status = jsonData.stringValue;
    }
    
    // Get risk score
    int riskScore = 0;
    if (json.get(jsonData, "riskScore")) {
      riskScore = jsonData.intValue;
    }
    
    // Get message
    String message = "";
    if (json.get(jsonData, "message")) {
      message = jsonData.stringValue;
    }
    
    // Check if we should trigger vibration
    if (active && (status == "CRITICAL" || status == "WARNING")) {
      if (!lastAlertState) {
        // New alert detected
        Serial.println("\n🚨 ===== HIGH RISK ALERT ===== 🚨");
        Serial.print("Status: ");
        Serial.println(status);
        Serial.print("Risk Score: ");
        Serial.println(riskScore);
        Serial.print("Message: ");
        Serial.println(message);
        Serial.println("================================\n");
        
        // Trigger vibration
        triggerVibration();
        lastAlertState = true;
      }
    } else {
      // Alert cleared or risk returned to normal
      if (lastAlertState) {
        Serial.println("✅ Alert cleared - Risk returned to normal");
        lastAlertState = false;
        stopVibration();
      }
    }
    
  } else {
    // Error reading from Firebase
    Serial.print("❌ Firebase read error: ");
    Serial.println(fbdo.errorReason());
    
    // If connection lost, try to reconnect
    if (fbdo.httpCode() == HTTPC_ERROR_CONNECTION_LOST) {
      Serial.println("🔄 Attempting to reconnect...");
      Firebase.reconnectWiFi(true);
    }
  }
}

void triggerVibration() {
  // Start vibration
  digitalWrite(VIBRATOR_PIN, HIGH);
  Serial.println("📳 Vibration started");
}

void stopVibration() {
  // Stop vibration
  digitalWrite(VIBRATOR_PIN, LOW);
  Serial.println("⏹️ Vibration stopped");
}

void handleVibration() {
  static unsigned long vibrationStartTime = 0;
  static bool isVibrating = false;
  
  unsigned long currentTime = millis();
  
  if (lastAlertState && !isVibrating) {
    // Start vibration
    isVibrating = true;
    vibrationStartTime = currentTime;
    triggerVibration();
  }
  
  if (isVibrating && (currentTime - vibrationStartTime >= VIBRATION_DURATION)) {
    // Stop vibration after duration
    isVibrating = false;
    stopVibration();
    
    // If alert is still active, restart vibration (pulsing pattern)
    if (lastAlertState) {
      // Will restart on next checkFirebaseAlert() call
    }
  }
  
  if (!lastAlertState && isVibrating) {
    // Alert cleared while vibrating
    isVibrating = false;
    stopVibration();
  }
}

// ============================================================================
// ALTERNATIVE: Using Firebase Stream (Real-time updates)
// ============================================================================

/*
 * For even faster response, you can use Firebase stream listener instead of polling.
 * Uncomment this function and call it in setup() instead of using checkFirebaseAlert() in loop().
 */

/*
void setupFirebaseStream() {
  String alertPath = "/alerts/" + String(DEVICE_ID) + "/current";
  
  if (!Firebase.beginStream(fbdo, alertPath)) {
    Serial.print("❌ Stream begin error: ");
    Serial.println(fbdo.errorReason());
    return;
  }
  
  Firebase.setStreamCallback(fbdo, streamCallback, streamTimeoutCallback);
  Serial.println("✅ Firebase stream listener active");
}

void streamCallback(StreamData data) {
  Serial.println("\n📡 Stream Data received:");
  
  if (data.dataType() == "json") {
    FirebaseJson json = data.jsonObject();
    FirebaseJsonData jsonData;
    
    bool active = false;
    String status = "";
    int riskScore = 0;
    
    if (json.get(jsonData, "active")) {
      active = jsonData.boolValue;
    }
    if (json.get(jsonData, "status")) {
      status = jsonData.stringValue;
    }
    if (json.get(jsonData, "riskScore")) {
      riskScore = jsonData.intValue;
    }
    
    if (active && (status == "CRITICAL" || status == "WARNING")) {
      Serial.println("🚨 HIGH RISK ALERT!");
      Serial.print("Status: ");
      Serial.println(status);
      Serial.print("Risk Score: ");
      Serial.println(riskScore);
      triggerVibration();
      lastAlertState = true;
    } else {
      Serial.println("✅ Alert cleared");
      stopVibration();
      lastAlertState = false;
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("⏱️ Stream timeout, resuming...");
  }
}
*/



