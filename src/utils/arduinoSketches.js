export const arduinoSketches = {
  config: `/**
 * TK-Connect: Configuración del Módulo Bluetooth HC-06 (Modo Puente)
 * 
 * Para configurar tu Bluetooth sin usar librerías de software, utilizaremos
 * el Arduino Uno como un puente directo de comunicación (USB-a-TTL).
 * 
 * Conexión física para Configuración AT (Modo Puente):
 * - Arduino Pin 0 (RX)  ->  HC-06 RXD (Conexión directa)
 * - Arduino Pin 1 (TX)  ->  HC-06 TXD (Conexión directa)
 * - Arduino Pin 5V      ->  HC-06 VCC
 * - Arduino Pin GND     ->  HC-06 GND
 * 
 * INSTRUCCIONES DE USO:
 * 1. Sube este código vacío a tu Arduino Uno (¡asegúrate de que los cables de datos
 *    RX/TX del Bluetooth estén desconectados durante la carga!).
 * 2. Una vez diga "Subido con éxito" en el Arduino IDE, desconecta el cable USB.
 * 3. Realiza la conexión del módulo Bluetooth en modo puente descrita arriba.
 * 4. Conecta el cable USB, abre la pestaña "Configurador Bluetooth" en esta app y
 *    reconfigura el nombre y PIN de tu módulo interactiva y cómodamente.
 */

void setup() {
  // Vacío. Al no iniciar el puerto serial en el microcontrolador (ATmega328P),
  // los pines 0 y 1 quedan libres para que la computadora hable
  // directamente con el módulo Bluetooth HC-06 a través del chip USB.
}

void loop() {
  // Vacío.
}
`,

  demo: `/**
 * TK-Connect: Código Integrado de Sensores y Dashboard Escolar
 * (Versión Senior: Lectura asíncrona, Timeout Seguro, Memoria Estable)
 * 
 * DEPENDENCIAS:
 * Asegúrate de instalar la librería "DHT sensor library" de Adafruit (y su dependecia
 * "Adafruit Unified Sensor") desde el Gestor de Librerías del Arduino IDE antes de compilar.
 * 
 * Este programa lee múltiples sensores y envía telemetría cada 500ms
 * al Dashboard en formato "clave:valor" separado por comas (ej: "temp:23.0,hum:40.0,d:45.0").
 * También escucha comandos seriales de forma no bloqueante para controlar actuadores.
 * 
 * CONEXIÓN DE COMPONENTES:
 * 1. Bluetooth HC-06 (Modo Crossover): RXD->Pin 1 (TX Arduino), TXD->Pin 0 (RX Arduino), VCC->5V, GND->GND
 *    ⚠️ ¡MUY IMPORTANTE!: Desconecta el cable VCC (alimentación) o RX/TX del Bluetooth antes de
 *    subir este código por USB o de lo contrario dará error de carga (avrdude sync error).
 * 2. DHT11 (Clima): Pin Datos -> Pin Digital 4
 * 3. HC-SR04 (Ultrasonido): Trig -> Pin Digital 7, Echo -> Pin Digital 8
 * 4. Infrarrojo (Obstáculo): Pin Salida -> Pin Digital 9
 * 5. KY-038 (Sonido): Pin Analógico -> Pin Analógico A2
 * 6. Joystick: X -> Pin Analógico A0, Y -> Pin Analógico A1
 * 7. Servo: Pin Señal -> Pin Digital 12
 * 8. Puente H L298N (Motores DC): IN1->Pin 5, IN2->Pin 6, IN3->Pin 10, IN4->Pin 11
 */

#include <Servo.h>
#include <DHT.h>

// Sensor de Temperatura y Humedad DHT11
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Sensor de Ultrasonido HC-SR04
const int TRIG_PIN = 7;
const int ECHO_PIN = 8;

// Sensor Infrarrojo
const int IR_PIN = 9;

// Actuador Servomotor
Servo miServo;
const int SERVO_PIN = 12;

// Puente H L298N (Motores Izquierdo y Derecho)
const int IN1 = 5;
const int IN2 = 6;
const int IN3 = 10;
const int IN4 = 11;

// LED Integrado
const int LED_PIN = 13;

unsigned long previousMillis = 0;
const long telemetryInterval = 500; // Enviar telemetría cada 500 ms

// Variables para lectura serial no bloqueante
const byte numChars = 32;
char receivedChars[numChars];
boolean newData = false;

void setup() {
  // Configurar pines
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  pinMode(IR_PIN, INPUT);

  // Configurar pines del puente H
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  detenerMotores();

  // Inicializar componentes
  Serial.begin(9600);
  dht.begin();
  miServo.attach(SERVO_PIN);
  miServo.write(90); // Servo en posición media inicial

  // Enviamos señales de inicio y conexión exitosa
  Serial.println("--- ROBOT EDUCATIVO INICIADO ---");
  Serial.println("CONNECTED");
}

void loop() {
  // 1. Escuchar comandos desde el puerto Serial de forma NO bloqueante
  recvWithEndMarker();
  if (newData) {
    processCommand();
    newData = false;
  }

  // 2. Enviar telemetría periódicamente al Dashboard
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= telemetryInterval) {
    previousMillis = currentMillis;
    sendTelemetry();
  }
}

// LECTURA SERIAL NO BLOQUEANTE
void recvWithEndMarker() {
  static byte ndx = 0;
  char endMarker = '\\n';
  char rc;
  
  while (Serial.available() > 0 && newData == false) {
    rc = Serial.read();

    if (rc != endMarker && rc != '\\r') {
      receivedChars[ndx] = rc;
      ndx++;
      if (ndx >= numChars) {
        ndx = numChars - 1; // Prevenir desbordamiento de buffer
      }
    }
    else if (rc == endMarker) {
      receivedChars[ndx] = '\\0'; // Terminar cadena
      ndx = 0;
      newData = true;
    }
  }
}

// PROCESADOR DE COMANDOS
void processCommand() {
  // Convertir a String para facilidad, seguro porque es una instancia efímera pequeña
  String data = String(receivedChars);
  data.trim();

  if (data.length() == 0) return;

  if (data == "1" || data == "LED_ON") {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("MSG:LED Encendido");
  } 
  else if (data == "0" || data == "LED_OFF") {
    digitalWrite(LED_PIN, LOW);
    Serial.println("MSG:LED Apagado");
  }
  else if (data.startsWith("SERVO:")) {
    int angulo = data.substring(6).toInt();
    angulo = constrain(angulo, 0, 180);
    miServo.write(angulo);
    Serial.print("MSG:Servo girado a ");
    Serial.println(angulo);
  }
  else if (data.startsWith("J:")) {
    int commaIdx = data.indexOf(',');
    if (commaIdx != -1) {
      int x = data.substring(2, commaIdx).toInt();
      int y = data.substring(commaIdx + 1).toInt();
      
      if (y > 40) moverAdelante();
      else if (y < -40) moverAtras();
      else if (x > 40) girarDerecha();
      else if (x < -40) girarIzquierda();
      else detenerMotores();
    }
  }
  else if (data.startsWith("M:")) {
    char dir = data.charAt(2);
    if (dir == 'F') moverAdelante();
    else if (dir == 'B') moverAtras();
    else if (dir == 'L') girarIzquierda();
    else if (dir == 'R') girarDerecha();
    else detenerMotores();
  }
}

// GENERADOR DE TELEMETRÍA SEGURO Y EFICIENTE
void sendTelemetry() {
  // A. Leer Ultrasonido (Distancia) con TIMEOUT de seguridad (30ms)
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Un timeout de 30000 microsegundos asegura que nunca se bloquee por completo
  long duracion = pulseIn(ECHO_PIN, HIGH, 30000);
  float distancia;
  if (duracion == 0) {
    distancia = 400.0; // Fuera de rango o error
  } else {
    distancia = duracion * 0.034 / 2.0;
  }

  // B. Leer Clima (DHT11)
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  if (isnan(temp)) temp = 0.0;
  if (isnan(hum)) hum = 0.0;

  // C. Leer Infrarrojo (Digital: 1 = libre, 0 = obstáculo)
  int irValor = digitalRead(IR_PIN);
  int obstaculo = (irValor == LOW) ? 1 : 0; 

  // D. Leer volumen de sonido (KY-038)
  int sonido = analogRead(A2);
  int volumen = map(sonido, 0, 1023, 0, 100);

  // E. Leer Joystick físico (Pines A0 y A1)
  int joyFisicoX = analogRead(A0);
  int joyFisicoY = analogRead(A1);

  // F. Formatear y enviar evitando fragmentación de String
  char buffer[120];
  char tempStr[8];
  char humStr[8];
  char distStr[8];

  // dtostrf(variable, width, precision, buffer)
  dtostrf(temp, 4, 1, tempStr);
  dtostrf(hum, 4, 1, humStr);
  dtostrf(distancia, 4, 1, distStr);

  sprintf(buffer, "d:%s,temp:%s,hum:%s,ir:%d,snd:%d,joyx:%d,joyy:%d",
          distStr, tempStr, humStr, obstaculo, volumen, joyFisicoX, joyFisicoY);

  Serial.println(buffer);
}

// FUNCIONES DE CONTROL DE MOTORES L298N
void moverAdelante() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  Serial.println("MSG:Motores Adelante");
}

void moverAtras() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  Serial.println("MSG:Motores Atras");
}

void girarIzquierda() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  Serial.println("MSG:Motores Izquierda");
}

void girarDerecha() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  Serial.println("MSG:Motores Derecha");
}

void detenerMotores() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  Serial.println("MSG:Motores Parados");
}
`
};
