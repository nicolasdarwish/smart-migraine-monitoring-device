#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_HTU21DF.h>
#include <addons/TokenHelper.h>
#include <time.h>

// ================= CREDENTIALS =================
#define WIFI_SSID "nicolas_laptop"
#define WIFI_PASSWORD "123456798" 

#define API_KEY "AIzaSyDClilSXDM_5RE712y6pARBtXtYADoSZCQ"
#define DATABASE_URL "https://smmd-854c8-default-rtdb.europe-west1.firebasedatabase.app/"

// Your Device ID (Must match the folder name in your database)
const char* DEVICE_ID = "ESP32-001";

// ================= PINS & CONFIG =================
const int MOTOR_PIN = 18;        // MOSFET Gate Pin (GPIO 18)
const int BATTERY_PIN = 35;      // Voltage Divider Center (GPIO 35)
const float DIVIDER_RATIO = 2.0; // 10k + 10k resistors

// ================= OBJECTS =================
FirebaseData fbdo;       // For sending sensor data
FirebaseData fbdoStream; // For listening to alerts
FirebaseAuth auth;
FirebaseConfig config;

MAX30105 particleSensor;
Adafruit_HTU21DF htu = Adafruit_HTU21DF();

// ================= VARIABLES =================
unsigned long lastFirebaseUpdate = 0;
unsigned long lastTempRead = 0;
const unsigned long FIREBASE_INTERVAL = 10000; // Send every 10 sec
const unsigned long TEMP_INTERVAL = 5000;      // Read temp every 5 sec

// Heart Rate Averaging Variables
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg = 0;

// Data Storage
float currentTemp = 0;
float currentHum = 0;
int currentHR = 0;
int currentBattery = 0; 

// ================= HELPER FUNCTIONS =================

// 1. Calculate Battery Percentage
int getBatteryPercentage() {
  int rawValue = analogRead(BATTERY_PIN);
  
  // Calibration Factor: Tuned for your 4.05V max reading vs ESP32 ADC
  float calibration_factor = 1.11; 
  
  // Calculate Voltage
  float voltage = (rawValue / 4095.0) * 3.3 * DIVIDER_RATIO * calibration_factor;
  
  // Convert to % (Range: 3.2V empty to 4.05V full)
  int percentage = (voltage - 3.2) * (100) / (4.05 - 3.2);
  
  if (percentage > 100) return 100;
  if (percentage < 0) return 0;
  return percentage;
}

// 2. Stream Callback (Triggered when Database Changes)
void streamCallback(FirebaseStream data) {
  // Debug print to see what path changed
  Serial.printf("Stream update: %s\n", data.dataPath().c_str());
  Serial.printf("Value: %s\n", data.payload().c_str());

  // Logic: Check if 'active' became true
  if (data.dataType() == "boolean") {
    if (data.boolData() == true) {
      Serial.println("⚠️ MIGRAINE ALERT: Vibrating Motor!");
      
      // Vibrate
      digitalWrite(MOTOR_PIN, HIGH);
      delay(1500); 
      digitalWrite(MOTOR_PIN, LOW);
      
      Serial.println("📳 Vibration finished. Resetting alert...");
      
      // --- FIX IS HERE ---
      delay(500); // Wait 0.5s for voltage to stabilize after motor stops
      // -------------------

      // NOW try to write to the database
      if(Firebase.RTDB.setBool(&fbdo, "/alerts/ESP32-001/current/active", false)){
        Serial.println("Alert reset successfully.");
      } else {
        Serial.println("Failed to reset alert.");
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("Stream timeout, resuming...");
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  // 1. Setup Pins
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW); // Ensure motor is OFF
  pinMode(BATTERY_PIN, INPUT);

  // 2. Setup WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected!");

  // 3. Sync Time (Needed for secure database connection)
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  // 4. Setup Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Auth Success");
  } else {
    Serial.printf("Auth Failed: %s\n", config.signer.signupError.message.c_str());
  }
  config.token_status_callback = tokenStatusCallback;
  
  // --- ADD THESE LINES ---
  // Increase the timeout to prevent "payload read timed out" errors
  config.timeout.serverResponse = 10 * 1000; 
  // Increase the SSL buffer size to handle encryption better
  fbdo.setBSSLBufferSize(4096 /* Rx buffer */, 1024 /* Tx buffer */);
  fbdoStream.setBSSLBufferSize(4096, 1024);
  // -----------------------

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // 5. Start Listening to Alert Stream
  // Path matches your database: alerts/ESP32-001/current/active
  if (!Firebase.RTDB.beginStream(&fbdoStream, "/alerts/ESP32-001/current/active")) {
    Serial.printf("Stream begin error: %s\n", fbdoStream.errorReason().c_str());
  }
  Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);

  // 6. Setup Sensors
  if (!htu.begin()) { Serial.println("HTU21D not found!"); while (1); }
  
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { Serial.println("MAX30102 not found!"); while (1); }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  
  Serial.println("System Ready.");
}

// ================= LOOP =================
void loop() {
  // --- TASK 1: READ HEART RATE (Runs constantly) ---
  long irValue = particleSensor.getIR();
  
  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);
    
    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0 ; x < RATE_SIZE ; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
      currentHR = beatAvg;
      Serial.print("♥ HR: "); Serial.println(currentHR);
    }
  }
  
  // Finger removal detection
  if (irValue < 50000) { currentHR = 0; beatAvg = 0; }

  // --- TASK 2: READ SENSORS & BATTERY (Runs every 5 seconds) ---
  if (millis() - lastTempRead > TEMP_INTERVAL) {
    // Check if sensors are disconnected (I2C check)
    Wire.beginTransmission(0x40); // Check Temp Sensor address
    if (Wire.endTransmission() != 0) {
      Serial.println("⚠️ Sensors lost! Attempting to reset...");
    
    // Force re-initialization
    htu.begin(); 
    particleSensor.begin(Wire, I2C_SPEED_FAST);
    particleSensor.setup(); 
    particleSensor.setPulseAmplitudeRed(0x0A);
  }
    currentTemp = htu.readTemperature();
    currentHum = htu.readHumidity();
    currentBattery = getBatteryPercentage();
    
    Serial.printf("T:%.1f | H:%.1f | B:%d%%\n", currentTemp, currentHum, currentBattery);
    lastTempRead = millis();
  }

  // --- TASK 3: SEND TO FIREBASE (Runs every 15 seconds) ---
  if (millis() - lastFirebaseUpdate >= FIREBASE_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
       sendToFirebase();
    } else {
       WiFi.reconnect();
    }
    lastFirebaseUpdate = millis();
  }
  
  // Critical Delay for Stability
  delay(15); 
}

// Function to Send Data Package
void sendToFirebase() {
  if (Firebase.ready()) {
    FirebaseJson json;
    
    // Create Timestamp
    unsigned long long timestamp_ms;
    time_t now = time(nullptr);
    if (now > 100000) {
      timestamp_ms = (unsigned long long)now * 1000ULL;
    } else {
      timestamp_ms = (unsigned long long)(millis()) + 1700000000000ULL;
    }

    // Populate JSON
    json.set("temperature", currentTemp);
    json.set("humidity", currentHum);
    json.set("heartRate", currentHR);
    json.set("batteryLevel", currentBattery);
    json.set("timestamp_ms", timestamp_ms);
    json.set("deviceId", DEVICE_ID);

    Serial.print("Pushing data... ");
    if (Firebase.RTDB.pushJSON(&fbdo, "/sensorReadings", &json)) {
      Serial.println("OK");
    } else {
      Serial.println("Err: " + fbdo.errorReason());
    }
  }
}