/*
 * SmartPark AI — ESP32 Edge Slot Sensor & Servo Gate Controller
 * 
 * Hardware Requirements:
 * - ESP32 NodeMCU Development Board
 * - HC-SR04 Ultrasonic Distance Sensor
 * - SG90 Micro Servo (Barrier Gate)
 * - Status LEDs (Green: Available, Red: Occupied, Yellow: Reserved)
 * - 0.96" I2C OLED Display (Optional)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// SmartPark Backend Endpoint
const char* serverUrl = "http://YOUR_EC2_PUBLIC_IP:5000/api/iot/sensor-event";
const char* gateUrl = "http://YOUR_EC2_PUBLIC_IP:5000/api/iot/gate/control";

// Device Identification
const char* DEVICE_ID = "ESP32_SENSOR_A01";
const int SLOT_ID = 1;

// Pin Definitions
#define TRIG_PIN 5
#define ECHO_PIN 18
#define SERVO_PIN 13
#define LED_GREEN 2
#define LED_RED 4

// Distance Threshold
const int OCCUPIED_THRESHOLD_CM = 50;

Servo barrierGate;
String lastReportedState = "UNKNOWN";
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 5000; // Send telemetry every 5 seconds

void setup() {
  Serial.begin(115200);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  
  barrierGate.attach(SERVO_PIN);
  barrierGate.write(0); // Gate Closed initially

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

long measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 999; // Out of range
  return duration * 0.034 / 2;
}

void sendTelemetry(long distance) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["slotId"] = SLOT_ID;
    doc["distanceCm"] = distance;
    doc["rawVoltage"] = 3.3;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("[IoT Telemetry] HTTP %d: %s\n", httpResponseCode, response.c_str());
    } else {
      Serial.printf("[IoT Telemetry Error] %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
}

void loop() {
  long distance = measureDistanceCm();
  String currentState = (distance <= OCCUPIED_THRESHOLD_CM) ? "OCCUPIED" : "AVAILABLE";

  // Update Status LEDs
  if (currentState == "OCCUPIED") {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, LOW);
  } else {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_GREEN, HIGH);
  }

  // Trigger telemetry on state change or heartbeat interval
  unsigned long now = millis();
  if (currentState != lastReportedState || (now - lastTelemetryTime >= telemetryInterval)) {
    Serial.printf("[Sensor] Dist: %ld cm | State: %s\n", distance, currentState.c_str());
    sendTelemetry(distance);
    lastReportedState = currentState;
    lastTelemetryTime = now;
  }

  delay(500);
}
