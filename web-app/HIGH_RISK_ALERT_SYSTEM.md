# High-Risk Migraine Alert System

## Overview

This system automatically sends high-risk migraine alerts to Firebase Realtime Database when the AI detects a CRITICAL or WARNING status. The ESP32 device reads these alerts and triggers a vibrating motor to notify the user.

## How It Works

### 1. Web App (Dashboard)
- AI analyzes sensor data every 2 minutes
- When risk score ≥ 41 (WARNING or CRITICAL), alert is sent to Firebase
- Alert is written to: `/alerts/{deviceId}/current`
- When risk returns to NORMAL, alert is cleared

### 2. Firebase Realtime Database
- Stores alerts at: `/alerts/{deviceId}/current`
- ESP32 reads from this path in real-time
- Data structure:
  ```json
  {
    "active": true,
    "riskScore": 85,
    "status": "CRITICAL",
    "message": "High migraine risk detected...",
    "suggestedAction": "Take immediate action...",
    "timestamp": 1234567890,
    "timestampISO": "2024-12-16T..."
  }
  ```

### 3. ESP32 Device
- Polls Firebase every 5 seconds (or uses stream for instant updates)
- Reads alert data from `/alerts/{deviceId}/current`
- Triggers vibrating motor when `active == true` and `status == "CRITICAL"` or `"WARNING"`
- Stops vibration when alert is cleared

## Implementation Details

### Web App Code Changes

**File: `services/firebase.ts`**
- Added `alertsPath: 'alerts'` to Firebase config
- Added `sendHighRiskAlert()` function to write alerts
- Added `clearHighRiskAlert()` function to clear alerts

**File: `pages/DashboardPage.tsx`**
- Integrated alert sending in AI analysis loop
- Sends alert when status is CRITICAL or WARNING (riskScore ≥ 41)
- Clears alert when status returns to NORMAL

### Database Path Structure

```
/alerts/
  └── {deviceId}/
      └── current/
          ├── active: boolean
          ├── riskScore: number
          ├── status: "CRITICAL" | "WARNING"
          ├── message: string
          ├── suggestedAction: string
          ├── timestamp: number
          └── timestampISO: string
```

## Configuration

### Web App
No additional configuration needed. The system automatically:
- Detects deviceId from sensor readings
- Sends alerts when high risk is detected
- Clears alerts when risk returns to normal

### ESP32
See `ESP32_SETUP_GUIDE.md` for complete setup instructions.

**Key Configuration:**
1. WiFi credentials
2. Device ID (must match web app deviceId)
3. Firebase host URL
4. GPIO pin for vibrating motor

## Testing

### Test from Web App
1. Wait for AI to detect high risk (or simulate one)
2. Check Firebase Console: `/alerts/{deviceId}/current`
3. Should see alert data with `active: true`
4. ESP32 should vibrate within 5 seconds

### Test Manually
1. Go to Firebase Console > Realtime Database
2. Navigate to `/alerts/ESP32-001/current`
3. Add test data:
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
4. ESP32 should immediately vibrate

## Alert Thresholds

- **NORMAL** (0-40): No alert sent, any existing alert is cleared
- **WARNING** (41-70): Alert sent, vibration triggered
- **CRITICAL** (71-100): Alert sent, vibration triggered

## Troubleshooting

### Alert Not Sent
- Check browser console for errors
- Verify deviceId is set correctly
- Check Firebase connection
- Verify database rules allow writes

### ESP32 Not Receiving Alerts
- Verify deviceId matches between web app and ESP32
- Check Firebase path: `/alerts/{deviceId}/current`
- Check ESP32 Serial Monitor for errors
- Verify WiFi connection
- Check Firebase database rules allow reads

### Motor Not Vibrating
- Check wiring connections
- Verify GPIO pin number
- Test motor directly with power
- Check Serial Monitor for alert reception

## Security Notes

**Current Implementation:**
- Alerts are written without authentication (for simplicity)
- Database rules should restrict writes to authenticated users only
- ESP32 reads without authentication (for testing)

**Production Recommendations:**
1. Use Firebase Authentication for web app writes
2. Use Database Secrets for ESP32 authentication
3. Update database rules to require authentication
4. Implement device registration/authentication

## Database Rules (Firebase Console)

For testing, use these rules:
```json
{
  "rules": {
    "alerts": {
      "$deviceId": {
        "current": {
          ".read": true,
          ".write": "auth != null"
        }
      }
    }
  }
}
```

For production, restrict reads:
```json
{
  "rules": {
    "alerts": {
      "$deviceId": {
        "current": {
          ".read": "auth != null && $deviceId == auth.uid",
          ".write": "auth != null && $deviceId == auth.uid"
        }
      }
    }
  }
}
```

## Files Created

1. **ESP32_ALERT_CODE.ino** - Complete ESP32 Arduino code
2. **ESP32_SETUP_GUIDE.md** - Detailed setup instructions
3. **HIGH_RISK_ALERT_SYSTEM.md** - This file (system overview)

## Next Steps

1. **Hardware Setup:**
   - Connect vibrating motor to ESP32
   - Follow wiring diagram in ESP32_SETUP_GUIDE.md

2. **Software Setup:**
   - Install Arduino libraries
   - Configure ESP32 code with your credentials
   - Upload code to ESP32

3. **Testing:**
   - Test manual alert from Firebase Console
   - Test real alert from web app
   - Verify vibration works correctly

4. **Production:**
   - Implement authentication
   - Update database rules
   - Test with real sensor data

---

**Questions?** Check the ESP32 Serial Monitor for detailed debugging information.



