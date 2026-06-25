# Guía de Conexión Completa | Complete Connection Guide

Esta guía explica detalladamente cómo conectar tu módulo Bluetooth HC-06 al Arduino Uno, programarlo y enlazarlo con la aplicación **EDU-Connect**.

---

## 🇪🇸 GUÍA EN ESPAÑOL

### Paso 1: Conexión Física (Hardware)
Conecta los pines del módulo **HC-06** a tu **Arduino Uno** siguiendo esta configuración. Es sumamente importante realizar las conexiones con el Arduino apagado (desconectado del USB).

| Pin del HC-06 | Pin del Arduino Uno | Descripción | Color de Cable Sugerido |
| :--- | :--- | :--- | :--- |
| **VCC** | **5V** | Alimentación del módulo | Rojo |
| **GND** | **GND** | Conexión a tierra común | Negro |
| **TXD** | **Pin 2 (RX)** | Transmisión de datos del Bluetooth al Arduino | Amarillo / Naranja |
| **RXD** | **Pin 3 (TX)** | Recepción de datos del Arduino al Bluetooth | Verde / Azul |

> ⚠️ **Nota para el pin RXD (Seguridad del Módulo):** El pin RXD del HC-06 trabaja a niveles lógicos de **3.3V**. El Arduino Uno transmite a **5V** por sus pines digitales. Para proteger el módulo y prolongar su vida útil, se recomienda colocar un divisor de voltaje simple entre el Pin 3 del Arduino y el pin RXD del HC-06 (una resistencia de 1kΩ en serie con el Pin 3, y una de 2kΩ a GND). Para actividades escolares rápidas, la conexión directa suele funcionar, pero el divisor es la mejor práctica de ingeniería.

---

### Paso 2: Programación en el Arduino IDE
1. Abre el software **Arduino IDE** en tu computadora.
2. Ve a la pestaña **"Códigos Arduino"** en esta aplicación y copia el código que necesites:
   - **Código Puente (Bridge)**: Si vas a cambiar el nombre o contraseña del Bluetooth en la pestaña "Configurador Bluetooth".
   - **Código Demostrativo (Demo)**: Si vas a usar los widgets de control y telemetría en el "Panel de Control".
3. Pega el código en el espacio de trabajo en blanco del Arduino IDE.
4. Conecta tu placa Arduino Uno a la computadora mediante el cable USB.
5. En el menú superior de Arduino IDE:
   - Ve a **Herramientas > Placa** y selecciona **"Arduino Uno"**.
   - Ve a **Herramientas > Puerto** y selecciona el puerto USB detectado (ej: `COM3` en Windows, `/dev/cu.usbmodem...` en Mac).
6. Presiona el botón con la flecha hacia la derecha **"Subir" (Upload)** en la parte superior izquierda de la IDE.
7. Espera a que en la barra de estado inferior aparezca la confirmación: **"Subido con éxito"** o **"Done uploading"**.

---

### Paso 3: Vinculación Bluetooth con el Sistema Operativo
Antes de abrir el puerto en la app, la computadora debe reconocer físicamente el dispositivo Bluetooth.

#### En Windows:
1. Ve a **Configuración > Dispositivos > Bluetooth y otros dispositivos**.
2. Asegúrate de que el Bluetooth esté **Activado**.
3. Haz clic en **Agregar Bluetooth u otro dispositivo** y selecciona **Bluetooth**.
4. Enciende tu Arduino (conectándole el USB a cualquier fuente de energía para que el HC-06 encienda. Su LED rojo parpadeará rápido).
5. Espera a que aparezca en la lista:
   - Se llamará **"HC-06"** si es nuevo.
   - O tendrá el nombre personalizado si ya realizaste la reconfiguración.
6. Selecciónalo y escribe el PIN de vinculación: **`1234`** (de fábrica) o tu nuevo PIN de 4 números.
7. Haz clic en **Conectar**. Debe aparecer como "Emparejado" o "Vinculado".

#### En macOS:
1. Abre **Preferencias del Sistema > Bluetooth**.
2. Conecta tu Arduino para encender el HC-06 (su luz roja comenzará a parpadear).
3. En la lista de dispositivos detectados, busca **"HC-06"** o tu nombre personalizado.
4. Haz clic en **Conectar / Enlazar**.
5. Te pedirá el código de seguridad. Escribe **`1234`** (o tu código nuevo) y acepta.

---

### Paso 4: Conexión con la App EDU-Connect
1. Abre la aplicación **EDU-Connect** en un navegador compatible (**Google Chrome** o **Microsoft Edge**).
2. En la barra superior de la app, selecciona la velocidad de comunicación en **Baudios** (generalmente **9600** para el Bluetooth HC-06).
3. Presiona el botón **"Conectar"**.
4. El navegador desplegará una lista con los puertos disponibles:
   - En **Windows**, selecciona el puerto COM virtual asignado a tu Bluetooth emparejado (puedes verificar en el administrador de dispositivos cuál es, o probar los puertos COM listados).
   - En **Mac**, selecciona el puerto que comience con `/dev/tty.[NombreDeTuModulo]-Port` o similar.
5. Presiona **Conectar** en la ventana flotante del navegador.
6. El indicador de estado de la app cambiará a **"Conectado"** (luz verde) y el LED rojo de tu HC-06 dejará de parpadear y se quedará encendido fijo. ¡La conexión inalámbrica está lista!

---

## 🇺🇸 ENGLISH GUIDE

### Step 1: Hardware Connections
Connect your **HC-06** module to your **Arduino Uno** using the following pin map. Please make these connections while the Arduino is powered off.

| HC-06 Pin | Arduino Uno Pin | Description | Suggested Cable Color |
| :--- | :--- | :--- | :--- |
| **VCC** | **5V** | Module Power | Red |
| **GND** | **GND** | Common Ground | Black |
| **TXD** | **Pin 2 (RX)** | Transmit data from BT to Arduino | Yellow / Orange |
| **RXD** | **Pin 3 (TX)** | Receive data from Arduino to BT | Green / Blue |

> ⚠️ **Note for RXD Pin (Module Protection):** The HC-06 RXD pin operates at **3.3V**. Since the Arduino Uno transmits signals at **5V**, it is best practice to install a voltage divisor (1kΩ resistor in series with Pin 3, and a 2kΩ resistor to GND) to drop the 5V transmit signal down to a safe 3.3V.

### Step 2: Uploading Code from Arduino IDE
1. Open the **Arduino IDE** software.
2. Head to the **"Arduino Codes"** tab in this app and copy the sketch:
   - **Bridge Sketch**: Used for renaming the module under the "Bluetooth Configurator" tab.
   - **Demo Sketch**: Used for interacting with dashboard widgets.
3. Paste the code into the Arduino IDE workspace.
4. Connect the Arduino Uno to your computer using a USB cable.
5. In the Arduino IDE top menu:
   - Go to **Tools > Board** and select **"Arduino Uno"**.
   - Go to **Tools > Port** and choose your Arduino USB Port (e.g. `COM3` on Windows).
6. Press the **"Upload"** button (Right-pointing arrow icon).
7. Confirm that the message **"Done uploading"** appears in the bottom status bar.

### Step 3: Pairing Bluetooth with the Operating System
#### Windows:
1. Open **Settings > Devices > Bluetooth & other devices**.
2. Make sure Bluetooth is toggled **On**.
3. Click **Add Bluetooth or other device** and select **Bluetooth**.
4. Power up the Arduino Uno (the HC-06 LED should blink rapidly).
5. Choose **"HC-06"** (or your custom name) from the list.
6. Enter PIN **`1234`** (factory default) or your new 4-digit PIN.
7. Click **Connect**. The status should change to "Paired".

#### macOS:
1. Open **System Preferences > Bluetooth**.
2. Power up the Arduino Uno.
3. Look for **"HC-06"** or your custom name in the list.
4. Click **Connect / Pair**.
5. Input PIN **`1234`** (or your new PIN) and click Pair.

### Step 4: Connecting with the Web App
1. Launch **EDU-Connect** in **Google Chrome** or **Microsoft Edge**.
2. Set the **Baud Rate** to **9600** in the header.
3. Click the **"Connect"** button.
4. From the browser prompt, select your device:
   - In **Windows**, choose the COM port matching your paired Bluetooth.
   - In **Mac**, choose the port matching `/dev/tty.[DeviceName]-Port`.
5. Click **Connect**. The app status light will turn green, and the HC-06 LED will remain solid red. Ready to go!
