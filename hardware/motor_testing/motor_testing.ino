// Define the GPIO pin connected to the MOSFET Gate
// We will use GPIO 18, a common choice for output on ESP32
const int MOTOR_PIN = D2; 

void setup() {
  Serial.begin(115200);
  // Set the motor pin as an output
  pinMode(MOTOR_PIN, OUTPUT);
  Serial.println("Vibration Motor Test Ready.");
  Serial.println("Motor will cycle: ON (500ms), OFF (1500ms).");
}

void loop() {
  // 1. Turn the Motor ON
  // By setting the MOSFET Gate HIGH (3.3V), the MOSFET is fully switched ON,
  // connecting the motor's negative terminal to ground.
  digitalWrite(MOTOR_PIN, HIGH);
  Serial.println("Motor ON");
  delay(1500); // Vibrate for 500 milliseconds

  // 2. Turn the Motor OFF
  // By setting the MOSFET Gate LOW (0V), the MOSFET is switched OFF,
  // disconnecting the motor's negative terminal from ground.
  digitalWrite(MOTOR_PIN, LOW);
  Serial.println("Motor OFF");
  delay(3000); // Pause for 1500 milliseconds (1.5 seconds)

  // This cycle will repeat indefinitely.
}