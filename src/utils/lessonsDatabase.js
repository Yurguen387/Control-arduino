export const lessonsDatabase = {
  seventh: [
    {
      id: 'l_led',
      title: 'El Semáforo Inteligente (Foco LED)',
      description: 'Aprende cómo el cerebro (Arduino) puede controlar un LED de forma segura usando resistencias para regular el flujo de energía.',
      components: ['Foco LED', 'Resistencia de 220Ω', 'Cables Jumper'],
      wiring: [
        { pin: '5V / Pin 13', componentPin: 'Ánodo (pata larga del LED a través de resistencia)' },
        { pin: 'GND', componentPin: 'Cátodo (pata corta del LED)' }
      ],
      recommendedWidgets: [
        {
          id: 'w_led_on',
          type: 'button',
          title: 'Encender LED (Pin 13)',
          payload: '1',
          color: 'var(--clr-green)',
          icon: 'lightbulb'
        },
        {
          id: 'w_led_off',
          type: 'button',
          title: 'Apagar LED (Pin 13)',
          payload: '0',
          color: 'var(--clr-red)',
          icon: 'lightbulb'
        }
      ],
      commonErrors: [
        'Conectar el LED al revés (la patita más larga es la positiva o ánodo).',
        'No colocar la resistencia de 220Ω. ¡Sin ella, el LED recibirá demasiada energía y podría quemarse en segundos!'
      ],
      questChecks: [
        'He conectado VCC y GND en mi protoboard.',
        'Coloqué la resistencia en serie con la pata larga del LED.',
        'Conecté el Pin 13 del Arduino al LED mediante la resistencia.',
        'La pata corta del LED está conectada directamente a GND.'
      ],
      socraticTree: {
        start: {
          text: '¡Hola explorador! Veo que quieres encender tu primer LED con Arduino. Pero dime... si el agua fluye con demasiada presión por una manguera delgada, ¿qué crees que le pasaría a la manguera?',
          options: [
            { text: 'Se reventaría por la fuerza del agua', nextNode: 'presion' },
            { text: 'El agua fluiría sin causar ningún problema', nextNode: 'nada' }
          ]
        },
        nada: {
          text: 'Mmm, imagínalo de nuevo. La electricidad se comporta igual que el agua. Si forzamos demasiada energía a través de un componente pequeño y delicado como un LED, ¿qué crees que le pasará?',
          options: [
            { text: 'Recibirá tanto voltaje que se quemará', nextNode: 'presion' }
          ]
        },
        presion: {
          text: '¡Correcto! Se quemaría. Para evitar que el LED se queme con la fuerza de la corriente de 5V del Arduino, necesitamos colocar una "válvula" que frene un poco el flujo. ¿Qué componente hace esto?',
          options: [
            { text: 'Un cable de cobre simple', nextNode: 'cable' },
            { text: 'Una resistencia eléctrica', nextNode: 'resistencia' }
          ]
        },
        cable: {
          text: 'Un cable simple no ofrece ninguna oposición, ¡así que toda la fuerza del voltaje pasaría directo! Necesitamos un componente que oponga "resistencia". ¿Cuál sería?',
          options: [
            { text: 'Una resistencia eléctrica', nextNode: 'resistencia' }
          ]
        },
        resistencia: {
          text: '¡Excelente! Una resistencia de 220 ohmios es el escudo perfecto. Ahora, para ordenarle al Arduino en el código que encienda ese pin, ¿qué señal lógica debemos mandar?',
          options: [
            { text: 'Una señal HIGH (1 / Alta Energía)', nextNode: 'high' },
            { text: 'Una señal LOW (0 / Sin Energía)', nextNode: 'low' }
          ]
        },
        high: {
          text: '¡Perfecto! HIGH activa los 5V en el pin 13. Aquí tienes tu código socrático estructurado listo para copiar y subir en tu Arduino IDE:',
          options: [],
          code: `// Código de 7mo: Parpadeo de LED\nconst int LED = 13;\nvoid setup() {\n  pinMode(LED, OUTPUT); // Declaramos el pin como salida\n}\nvoid loop() {\n  digitalWrite(LED, HIGH); // Encendemos el LED\n  delay(1000);             // Esperamos 1 segundo\n  digitalWrite(LED, LOW);  // Apagamos el LED\n  delay(1000);             // Esperamos 1 segundo\n}`
        },
        low: {
          text: 'LOW corta la energía. Si queremos encender el LED, necesitamos encender el flujo. ¿Qué señal usarías?',
          options: [
            { text: 'Señal HIGH (1)', nextNode: 'high' }
          ]
        }
      }
    }
  ],
  eighth: [
    {
      id: 'l_radar',
      title: 'El Radar del Murciélago (Ultrasonido HC-SR04)',
      description: 'Descubre cómo medir distancias sin tocar los objetos y visualiza el eco en un radar interactivo en tiempo real.',
      components: ['Sensor Ultrasónico HC-SR04', 'Servomotor SG90', 'Cables Jumper'],
      wiring: [
        { pin: '5V', componentPin: 'VCC (Alimentación de ambos)' },
        { pin: 'GND', componentPin: 'GND (Tierra común de ambos)' },
        { pin: 'Pin 7', componentPin: 'Trig (Disparador de sonido)' },
        { pin: 'Pin 8', componentPin: 'Echo (Receptor de sonido)' },
        { pin: 'Pin 12', componentPin: 'Señal del Servomotor (Naranja/Amarillo)' }
      ],
      recommendedWidgets: [
        {
          id: 'w_radar_gauge',
          type: 'radar',
          title: 'Radar de Distancia',
          telemetryKey: 'd',
          min: 0,
          max: 150,
          color: 'var(--clr-cyan)',
          icon: 'activity'
        },
        {
          id: 'w_servo_rotary',
          type: 'servo_knob',
          title: 'Girar Radar (Servo)',
          payload: 'SERVO:',
          color: 'var(--clr-purple)',
          icon: 'sliders',
          currentVal: 90
        }
      ],
      commonErrors: [
        'Cruzar los cables de Trig y Echo. Si los conectas al revés, el sensor nunca emitirá sonido ni medirá el rebote.',
        'Mala conexión de GND. Si el sensor y el Arduino no comparten la misma línea de tierra, las lecturas saldrán en 0 o darán valores erráticos.'
      ],
      questChecks: [
        'Conecté VCC y GND de ambos componentes a las líneas de poder.',
        'Conecté el pin Trig del sensor al pin 7 de mi Arduino.',
        'Conecté el pin Echo del sensor al pin 8 de mi Arduino.',
        'Conecté el cable de señal del Servomotor al pin 12 del Arduino.',
        'Verifiqué que los cables estén bien ajustados y no hagan falso contacto.'
      ],
      socraticTree: {
        start: {
          text: '¡Hola! Queremos construir un radar ultrasónico. Los murciélagos vuelan de noche esquivando árboles en total oscuridad. ¿Cómo crees que logran "ver" los obstáculos?',
          options: [
            { text: 'Emiten chillidos y escuchan la rapidez del eco', nextNode: 'eco' },
            { text: 'Desarrollan ojos sensibles al calor (visión térmica)', nextNode: 'termica' }
          ]
        },
        termica: {
          text: 'Los murciélagos no tienen visión térmica. Usan ondas de sonido de alta frecuencia. Emiten el sonido y calculan la distancia midiendo el eco. ¿Cómo llamamos a este proceso biológico?',
          options: [
            { text: 'Ecolocalización', nextNode: 'eco' }
          ]
        },
        eco: {
          text: '¡Exacto! Ecolocalización. El sensor ultrasónico funciona igual: el pin Trig lanza una onda de sonido inaudible (disparo) y el pin Echo mide cuándo regresa esa onda. Si sabemos que el sonido viaja a 340 metros por segundo en el aire, ¿qué variable del rebote necesitamos medir para calcular la distancia?',
          options: [
            { text: 'El volumen del eco devuelto', nextNode: 'volumen' },
            { text: 'El tiempo transcurrido desde el disparo hasta el eco', nextNode: 'tiempo' }
          ]
        },
        volumen: {
          text: 'El volumen cambia por la forma del objeto, por lo que no es preciso. Lo que nos da la distancia exacta es el TIEMPO de viaje de la onda. ¿Qué debemos medir?',
          options: [
            { text: 'El tiempo transcurrido de ida y vuelta', nextNode: 'tiempo' }
          ]
        },
        tiempo: {
          text: '¡Brillante! El tiempo. En programación Arduino, medimos la duración del pin Echo en alto usando la función pulseIn(EchoPin, HIGH). Como el sonido viaja al objeto y regresa, dividimos ese tiempo entre 2. Aquí tienes el código base para implementarlo:',
          options: [],
          code: `// Código de 8vo: Radar Ultrasónico\n#include <Servo.h>\nconst int Trig = 7;\nconst int Echo = 8;\nServo radarServo;\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(Trig, OUTPUT);\n  pinMode(Echo, INPUT);\n  radarServo.attach(12);\n}\nvoid loop() {\n  // Lanzamos pulso de sonido\n  digitalWrite(Trig, LOW); delayMicroseconds(2);\n  digitalWrite(Trig, HIGH); delayMicroseconds(10);\n  digitalWrite(Trig, LOW);\n  long tiempo = pulseIn(Echo, HIGH);\n  float distancia = tiempo * 0.034 / 2.0; // cm\n  Serial.print("Distancia: "); Serial.println(distancia);\n  delay(200);\n}`
        }
      }
    }
  ],
  ninth: [
    {
      id: 'l_motors',
      title: 'El Carro Robot Inalámbrico (Joystick + L298N)',
      description: 'Diseña y programa la tracción de un vehículo robotizado usando el controlador L298N controlado desde la app por Bluetooth.',
      components: ['Puente H L298N', 'Dos Motores DC', 'Batería Externa (9V/12V)', 'Cables Jumper'],
      wiring: [
        { pin: 'Pines 5 y 6', componentPin: 'IN1 y IN2 (Giro de Motor Izquierdo)' },
        { pin: 'Pines 10 y 11', componentPin: 'IN3 y IN4 (Giro de Motor Derecho)' },
        { pin: 'Bornera GND L298N', componentPin: 'GND del Arduino Y GND de tu batería (¡Tierra Común!)' },
        { pin: 'Bornera 12V L298N', componentPin: 'Cable Positivo (+) de la Batería Externa' }
      ],
      recommendedWidgets: [
        {
          id: 'w_wheels',
          type: 'motor',
          title: 'Tracción de Ruedas',
          payload: 'M:',
          color: 'var(--clr-yellow)',
          icon: 'sliders',
          activeMotorDir: 'S'
        },
        {
          id: 'w_joystick_pad',
          type: 'joystick',
          title: 'Joystick de Dirección',
          payload: 'J:',
          color: 'var(--clr-green)',
          icon: 'sliders'
        }
      ],
      commonErrors: [
        'Conectar los motores directo al Arduino. ¡El Arduino se apagará o dañará porque los motores consumen mucha corriente! Usa siempre una batería externa conectada al L298N.',
        'Olvidar unir las tierras (GND) del Arduino y de la batería externa. Sin tierra común, las señales de control de los pines se pierden y el carro no se moverá.'
      ],
      questChecks: [
        'Conecté las salidas OUT1/OUT2 y OUT3/OUT4 del L298N a los motores.',
        'Conecté los pines IN1, IN2, IN3 e IN4 a los pines 5, 6, 10 y 11 del Arduino.',
        'Conecté el positivo de mi batería externa a la bornera de 12V del L298N.',
        'Uní el GND del Arduino con el GND de la batería y la bornera GND del L298N.',
        'El Arduino está alimentado por USB o su propia pila independiente.'
      ],
      socraticTree: {
        start: {
          text: '¡Hola! Vamos a controlar motores con el puente H L298N. Si intentamos conectar dos motores de ruedas directamente a los pines de 5V del Arduino, ¿qué crees que pasaría con la placa?',
          options: [
            { text: 'Los motores girarán súper rápido sin problemas', nextNode: 'rapido' },
            { text: 'El Arduino se apagará, reiniciará o se dañará', nextNode: 'daño' }
          ]
        },
        rapido: {
          text: 'No exactamente. Los motores son actuadores mecánicos y consumen mucha corriente (amperaje). El Arduino solo da energía para "pensar" (baja corriente). ¿Qué le pasará al Arduino si los motores le exigen tanta fuerza eléctrica?',
          options: [
            { text: 'Se quedará sin fuerza, apagándose o reiniciándose', nextNode: 'daño' }
          ]
        },
        daño: {
          text: '¡Correcto! Se apaga o se daña. Por eso usamos el puente L298N alimentado por una batería externa. Ahora bien, para que el Arduino pueda mandarle señales al L298N, ambos circuitos deben tener la misma referencia de voltaje. ¿Qué pines de energía debemos unir obligatoriamente?',
          options: [
            { text: 'Los pines VCC de 5V', nextNode: 'vcc_err' },
            { text: 'Los pines de tierra (GND / Common Ground)', nextNode: 'gnd_ok' }
          ]
        },
        vcc_err: {
          text: 'Si unes los 5V del Arduino con los 9V o 12V de la batería externa, ¡dañarás tu Arduino! Deben compartir la tierra. ¿Cuál es ese pin?',
          options: [
            { text: 'El pin GND (Tierra Común)', nextNode: 'gnd_ok' }
          ]
        },
        gnd_ok: {
          text: '¡Exacto! El GND común permite que las señales de control de los pines 5, 6, 10 y 11 tengan la misma referencia. Para mover el motor izquierdo hacia adelante, activamos IN1 en HIGH e IN2 en LOW. ¿Cómo moverías el motor hacia atrás?',
          options: [
            { text: 'Activando IN1 en LOW e IN2 en HIGH', nextNode: 'reverse' },
            { text: 'Activando ambos pines en HIGH', nextNode: 'lock' }
          ]
        },
        lock: {
          text: 'Si activas ambos en HIGH (o ambos en LOW), los dos polos tendrán el mismo voltaje y el motor se frenará. Necesitamos polaridades opuestas. ¿Cómo iría en reversa?',
          options: [
            { text: 'IN1 en LOW e IN2 en HIGH', nextNode: 'reverse' }
          ]
        },
        reverse: {
          text: '¡Espléndido! Invertir los estados lógicos invierte el giro del motor. Aquí tienes el código base para controlar tracción L298N desde tu robot:',
          options: [],
          code: `// Código de 9no: Tracción L298N\nconst int IN1 = 5;\nconst int IN2 = 6;\nconst int IN3 = 10;\nconst int IN4 = 11;\nvoid setup() {\n  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);\n  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);\n}\nvoid loop() {\n  // Mover adelante\n  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);\n  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);\n  delay(2000);\n  // Detener\n  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);\n  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);\n  delay(1000);\n}`
        }
      }
    }
  ]
};
