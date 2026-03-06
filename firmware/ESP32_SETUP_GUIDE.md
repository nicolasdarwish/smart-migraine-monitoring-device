# ESP32 High-Risk Alert Setup Guide

This guide explains how to configure your ESP32 to receive high-risk migraine alerts from Firebase and trigger a vibrating motor.

## 📋 Prerequisites

1. **ESP32 Development Board** (e.g., ESP32 DevKit V1)
2. **Vibrating Motor** (e.g., 3V-5V DC motor with vibration module)
3. **Arduino IDE** with ESP32 board support
4. **Firebase Realtime Database** access (already configured in your project)

## 🔧 Hardware Setup

### Components Needed:
- ESP32 Development Board
- Vibrating Motor (3V-5V)
- Optional: Transistor (2N2222) or MOSFET for motor control if motor draws >40mA
- Optional: Diode (1N4007) for motor protection
- Resistor (220Ω) if using transistor

### Wiring:

**Simple Connection (Motor draws <40mA):**
```
ESP32 GPIO 2 ──── Vibrating Motor (+) ──── GND
```

**With Transistor (Motor draws >40mA):**
```
ESP32 GPIO 2 ──── 220Ω Resistor ──── Transistor Base
Transistor Emitter ──── GND
Transistor Collector ──── Motor (+) ──── Motor (-) ──── 5V
```

**With Protection Diode:**
```
Motor (+) ──── Diode Anode ──── Diode Cathode ──── Motor (-)
```

## 📦 Software Setup

### Step 1: Install Required Libraries

1. Open **Arduino IDE**
2. Go to **Tools > Manage Libraries**
3. Search for and install:
   - **Firebase ESP32 Client** by Mobizt (version 4.x or later)
   - **WiFi** (usually included with ESP32 board package)

### Step 2: Install ESP32 Board Support

1. In Arduino IDE, go to **File > Preferences**
2. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools > Board > Boards Manager**
4. Search for "ESP32" and install "esp32 by Espressif Systems"

### Step 3: Select Board

1. Go to **Tools > Board > ESP32 Arduino**
2. Select your ESP32 board (e.g., "ESP32 Dev Module")
3. Set **Upload Speed** to "115200" (Tools > Upload Speed)

### Step 4: Configure Firebase Database Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **smmd-854c8**
3. Go to **Realtime Database > Rules**
4. Update rules to allow ESP32 to read alerts:

```json
{
  "rules": {
    "alerts": {
      "$deviceId": {
        "current": {
          ".read": true,
          ".write": false
        }
      }
    },
    "sensorReadings": {
      ".read": true,
      ".write": true
    }
  }
}
```

**Note:** For production, use authentication. For testing, you can temporarily allow read access.

### Step 5: Get Firebase Database Secret (Optional but Recommended)

1. In Firebase Console, go to **Realtime Database > Data**
2. Click the gear icon ⚙️ > **Realtime Database Secrets**
3. Click **Add Secret** (if you don't have one)
4. Copy the secret (you'll use this in the code)

### Step 6: Configure ESP32 Code

1. Open `ESP32_ALERT_CODE.ino` in Arduino IDE
2. Update these values in the code:

```cpp
// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Device ID (MUST match the deviceId in your web app)
#define DEVICE_ID "ESP32-001"  // Change to match your device

// Vibrator Pin (change if using different GPIO)
#define VIBRATOR_PIN 2
```

3. **Optional:** If using Firebase Database Secret:
   ```cpp
   #define FIREBASE_AUTH "your-database-secret-here"
   ```
   And uncomment this line:
   ```cpp
   config.signer.tokens.legacy_token = FIREBASE_AUTH;
   ```

### Step 7: Upload Code

1. Connect ESP32 to your computer via USB
2. Select the correct **Port** (Tools > Port)
3. Click **Upload** button
4. Open **Serial Monitor** (Tools > Serial Monitor) at 115200 baud
5. You should see:
   ```
   === ESP32 Migraine Alert System ===
   Connecting to WiFi...
   ✅ WiFi Connected! IP: 192.168.x.x
   ✅ Firebase initialized
   📡 Listening for alerts on path: /alerts/ESP32-001/current
   === System Ready ===
   ```

## 🧪 Testing

### Test 1: Manual Alert Test

1. In Firebase Console, go to **Realtime Database > Data**
2. Navigate to: `alerts/ESP32-001/current`
3. Add this data:
   ```json
   {
     "active": true,
     "status": "CRITICAL",
     "riskScore": 85,
     "message": "Test alert",
     "suggestedAction": "Test action",
     "timestamp": 1234567890
   }
   ```
4. ESP32 should immediately vibrate for 2 seconds
5. Serial Monitor should show: `🚨 HIGH RISK ALERT!`

### Test 2: Clear Alert

1. In Firebase Console, update the alert:
   ```json
   {
     "active": false,
     "timestamp": 1234567890
   }
   ```
2. ESP32 should stop vibrating
3. Serial Monitor should show: `✅ Alert cleared`

### Test 3: Real Alert from Web App

1. Open your web app dashboard
2. Wait for AI to detect high risk (or simulate one)
3. ESP32 should automatically receive the alert and vibrate

## 📊 Database Structure

The alerts are stored in Firebase Realtime Database at:
```
/alerts/{deviceId}/current
```

**Data Structure:**
```json
{
  "active": true,              // Boolean: Is alert active?
  "riskScore": 85,              // Number: Risk score (0-100)
  "status": "CRITICAL",         // String: "CRITICAL" or "WARNING"
  "message": "High migraine...", // String: AI analysis message
  "suggestedAction": "Rest...",  // String: Recommended action
  "timestamp": 1234567890,      // Number: Unix timestamp (ms)
  "timestampISO": "2024-12-16T..." // String: ISO timestamp
}
```

## 🔄 How It Works

1. **Web App** detects high migraine risk (CRITICAL or WARNING status)
2. **Web App** writes alert to Firebase: `/alerts/{deviceId}/current`
3. **ESP32** polls Firebase every 5 seconds (or uses stream for real-time)
4. **ESP32** reads alert data and checks `active` and `status` fields
5. **ESP32** triggers vibrating motor if `active == true` and `status == "CRITICAL"` or `"WARNING"`
6. **ESP32** vibrates for 2 seconds, then checks again
7. When risk returns to normal, web app sets `active: false`
8. **ESP32** stops vibration

## ⚙️ Customization

### Change Vibration Duration

In `ESP32_ALERT_CODE.ino`:
```cpp
const unsigned long VIBRATION_DURATION = 2000; // Change to desired milliseconds
```

### Change Check Interval

```cpp
const unsigned long VIBRATION_INTERVAL = 5000; // Change to desired milliseconds
```

### Use Real-time Stream (Faster Response)

1. Uncomment the `setupFirebaseStream()` function
2. Call it in `setup()` instead of using polling
3. This provides instant updates (no 5-second delay)

### Different GPIO Pin

Change the pin definition:
```cpp
#define VIBRATOR_PIN 4  // Use GPIO 4 instead of GPIO 2
```

## 🐛 Troubleshooting

### ESP32 Not Connecting to WiFi
- Check SSID and password are correct
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

### Firebase Connection Failed
- Verify Firebase host is correct
- Check internet connection
- Verify database rules allow read access
- Try using Firebase Database Secret for authentication

### Motor Not Vibrating
- Check wiring connections
- Verify GPIO pin number is correct
- Test motor directly with 3V/5V power
- Check if motor needs transistor (if drawing >40mA)

### No Alerts Received
- Verify `DEVICE_ID` matches the deviceId in your web app
- Check Firebase path: `/alerts/{deviceId}/current`
- Check Serial Monitor for error messages
- Verify web app is actually sending alerts

## 📝 Notes

- **Device ID Must Match:** The `DEVICE_ID` in ESP32 code must exactly match the `deviceId` used in your web app
- **Battery Considerations:** If running on battery, consider reducing check interval to save power
- **Multiple Devices:** Each ESP32 should have a unique `DEVICE_ID` to receive its own alerts
- **Production Security:** For production, implement Firebase Authentication instead of open read access

## 🔐 Security Recommendations

For production use:

1. **Use Firebase Authentication:**
   - Create service account in Firebase
   - Use JWT tokens for ESP32 authentication
   - Update database rules to require authentication

2. **Use Database Secrets:**
   - Enable database secrets
   - Use secret in ESP32 code (as shown in code)

3. **Restrict Database Rules:**
   ```json
   {
     "rules": {
       "alerts": {
         "$deviceId": {
           "current": {
             ".read": "auth != null && $deviceId == auth.uid",
             ".write": false
           }
         }
       }
     }
   }
   ```

## ✅ Success Checklist

- [ ] ESP32 connects to WiFi
- [ ] ESP32 connects to Firebase
- [ ] Serial Monitor shows "System Ready"
- [ ] Manual alert test triggers vibration
- [ ] Alert clear stops vibration
- [ ] Real alerts from web app work
- [ ] Device ID matches between web app and ESP32

---

**Need Help?** Check the Serial Monitor output for detailed error messages and debugging information.



