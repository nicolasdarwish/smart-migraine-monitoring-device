# Smart Migraine Monitoring Device (SMMD)

A wearable IoT solution designed to track physiological and environmental triggers to predict potential migraine episodes. By combining real-time sensor data with AI-driven analysis, the system empowers users to take preventive measures before severe symptoms occur.

## Project Structure

| Folder | Description |
|--------|-------------|
| **firmware/** | ESP32 Arduino code, setup guides, and alert system documentation |
| **web-app/** | React/Vite dashboard for monitoring and device management |
| **hardware/** | Component datasheets, motor testing, and hardware documentation |
| **docs/** | Final report, posters, Gantt chart, and chapter write-ups |
| **media/** | Project images and screenshots |
| **src/** | Legacy ESP32 source (see `firmware/` for main code) |

## Quick Start

### Firmware (ESP32)
1. Open `firmware/esp32_connection_firebase.ino` in Arduino IDE
2. Install required libraries (Firebase, MAX30105, HTU21DF)
3. Configure WiFi and Firebase credentials
4. See `firmware/ESP32_SETUP_GUIDE.md` for details

### Web App
```bash
cd web-app
npm install
# Set GEMINI_API_KEY in .env.local
npm run dev
```

## Tech Stack
- **Hardware:** ESP32, MAX30105 (heart rate), HTU21DF (temp/humidity), vibration motor
- **Backend:** Firebase Realtime Database
- **Frontend:** React, TypeScript, Vite
- **AI:** Gemini API for risk analysis


Smart Migraine Monitoring Device
A wearable IoT solution designed to track physiological and environmental triggers to predict potential migraine episodes. By combining real-time sensor data with AI-driven analysis, the system empowers users to take preventive measures before severe symptoms occur.

📝 Project Description

This project features a compact, battery-powered wearable built around an ESP32 microcontroller. It continuously gathers data from integrated sensors, processes measurements locally, and transmits information to a remote server for AI analysis. If a high risk is detected, the device provides immediate haptic feedback via a vibration motor and updates a linked mobile application.

Course: ELCP391 - Senior Project / Engineering Design.

Institution: University of Balamand, Faculty of Engineering.

🛠️ Technologies & Tools

Microcontroller: ESP32 (Wi-Fi & Bluetooth 4.2 BLE).

Sensors: * MAX30102: Pulse oximetry and heart-rate monitoring.

  HTU21D: High-precision temperature and humidity sensing.

Power Management: 1100mAh Li-ion battery, TP4056 USB-C charging module, and HT7333 voltage regulator.

Communication: I²C for sensor data, HTTP/REST for cloud syncing, and NTP for accurate timestamping.

Cloud Backend: Firebase Realtime Database with SSL/TLS encryption.

Development: Arduino IDE (C++), Python for ML analysis.

🚀 How to Use

Hardware Setup: Power the wearable using the integrated Li-ion battery.

App Connectivity: Open the linked mobile application and create a user account to pair the device via Wi-Fi.

Real-Time Monitoring: The device will begin tracking heart rate and environmental conditions immediately.

Alert Response: Upon receiving a haptic vibration (alert), check the app for suggested preventative actions or medication.

Charging: Use any standard USB-C cable to recharge the device when the app indicates low battery.

📋 Requirements & Dependencies

Hardware: ESP32 Dev Module, MAX30102, HTU21D, Vibration Motor, 1100mAh Li-Po battery.

Libraries: * <WiFi.h> and <Firebase_ESP_Client.h>.

<MAX30105.h> and <heartRate.h> for beat detection.

<Adafruit_HTU21DF.h> for environmental data.

Software: Arduino IDE and a configured Firebase project.

👥 Project Role

As a Computer Engineering Student, my contributions included:

Designing the hardware circuitry, including the voltage divider for battery sensing and MOSFET switching for the vibration motor.

Developing the firmware in C++ to manage non-blocking task execution and I²C communication.

Integrating the SSL/TLS security layer for encrypted health data transmission to the cloud.

📈 Results & Key Findings

Accuracy: The system achieved a high level of reliability with a target margin of error not exceeding 5%.

Stability: Implemented a Moving Average Filter to successfully eliminate heart rate signal noise and false spikes.

Efficiency: The device supports at least 4.4 hours of continuous operation under maximum Wi-Fi load, with significantly longer runtimes in standby.

User Impact: The prototype demonstrates that combining subjective diary input with objective sensor data provides a more holistic view of migraine patterns than traditional methods.
