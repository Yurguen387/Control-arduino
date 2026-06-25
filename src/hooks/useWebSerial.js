import { useState, useEffect, useRef } from 'react';

export function useWebSerial(onTelemetryReceived) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [connectionType, setConnectionTypeState] = useState(() => {
    return localStorage.getItem('edu_conn_type') || 'usb';
  }); // 'usb' | 'bluetooth'
  const [portName, setPortName] = useState(null);
  const [baudRate, setBaudRateState] = useState(() => {
    const saved = localStorage.getItem('edu_baud_rate');
    return saved ? parseInt(saved, 10) : 9600;
  });
  const [logs, setLogs] = useState([]);

  const setConnectionType = (type) => {
    setConnectionTypeState(type);
    localStorage.setItem('edu_conn_type', type);
  };

  const setBaudRate = (baud) => {
    setBaudRateState(baud);
    localStorage.setItem('edu_baud_rate', String(baud));
  };

  useEffect(() => {
    if (isConnected) return;
    const defaultBaud = 9600;
    setBaudRateState(defaultBaud);
    localStorage.setItem('edu_baud_rate', String(defaultBaud));
  }, [connectionType, isConnected]);

  const isSupported = typeof window !== 'undefined' && 'serial' in navigator;

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const keepReadingRef = useRef(false);
  const simulationIntervalRef = useRef(null);
  
  // Callback ref to always use the latest telemetry callback without re-running effects
  const onTelemetryRef = useRef(onTelemetryReceived);
  useEffect(() => {
    onTelemetryRef.current = onTelemetryReceived;
  }, [onTelemetryReceived]);

  // Append a message to the logs
  const addLog = (type, text) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-299), { type, text, timestamp }]); // Limit to last 300 logs
  };

  const clearLogs = () => setLogs([]);

  // Handle incoming data strings, parsing telemetries if present
  const processIncomingLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Output raw line to the serial logs
    addLog('in', trimmed);

    // Check if line represents telemetry data
    // Protocol: key1:val1,key2:val2,...
    // E.g.: "pot:512,light:340,temp:23.5"
    if (trimmed.includes(':')) {
      const data = {};
      let isTelemetry = true;
      
      const pairs = trimmed.split(',');
      for (const pair of pairs) {
        const parts = pair.split(':');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parseFloat(parts[1].trim());
          if (!isNaN(val)) {
            data[key] = val;
          } else {
            // It might be a system message like MSG:LED ON
            isTelemetry = false;
            break;
          }
        } else {
          isTelemetry = false;
          break;
        }
      }

      if (isTelemetry && Object.keys(data).length > 0) {
        if (onTelemetryRef.current) {
          onTelemetryRef.current(data);
        }
      }
    }
  };

  // Connect to the actual Web Serial device
  const connect = async () => {
    if (!isSupported) {
      addLog('sys', 'Web Serial API not supported by this browser.');
      return false;
    }

    if (isSimulated) {
      // Turn off simulation first
      setSimulated(false);
    }

    setIsConnecting(true);
    addLog('sys', 'Requesting serial port selection...');
    
    try {
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      
      addLog('sys', `Opening port at ${baudRate} baud...`);
      await port.open({ baudRate });
      
      setIsConnected(true);
      setIsConnecting(false);
      setPortName('Arduino Uno / Serial Device');
      addLog('sys', 'Port opened successfully. Start communicating.');

      // Start the reading loop
      keepReadingRef.current = true;
      startReadingLoop(port);
      return true;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      addLog('sys', `Connection error: ${err.message}`);
      return false;
    }
  };

  // Start reading loop
  const startReadingLoop = async (port) => {
    const decoder = new TextDecoder();
    let buffer = '';

    while (port.readable && keepReadingRef.current) {
      try {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        
        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            // Decode chunk and append to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.substring(0, newlineIndex);
              buffer = buffer.substring(newlineIndex + 1);
              processIncomingLine(line);
            }
          }
        } catch (error) {
          console.error('Serial read error:', error);
          addLog('sys', `Read error: ${error.message}`);
        } finally {
          reader.releaseLock();
          readerRef.current = null;
        }
      } catch (err) {
        console.error('Readable stream error:', err);
        break;
      }
    }
  };

  // Disconnect from serial port
  const disconnect = async () => {
    // Stop simulation if it is active
    if (isSimulated) {
      setSimulated(false);
      return;
    }

    addLog('sys', 'Disconnecting...');
    keepReadingRef.current = false;
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error(e);
      }
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        console.error('Error closing port:', e);
      }
      portRef.current = null;
    }

    setIsConnected(false);
    setPortName(null);
    addLog('sys', 'Disconnected.');
  };

  // Send data through serial (or simulated)
  const sendData = async (text, terminator = '\r\n') => {
    let formattedText = String(text);
    if (terminator === '\\n' || terminator === '\n') formattedText += '\n';
    else if (terminator === '\\r' || terminator === '\r') formattedText += '\r';
    else if (terminator === '\\r\\n' || terminator === '\r\n') formattedText += '\r\n';
    else if (terminator !== 'none' && terminator !== '') formattedText += terminator;

    addLog('out', text);

    if (isSimulated) {
      // Simulate Arduino action locally
      setTimeout(() => {
        const command = text.trim();
        if (command === '1' || command === 'LED_ON') {
          addLog('in', 'MSG:LED Encendido');
        } else if (command === '0' || command === 'LED_OFF') {
          addLog('in', 'MSG:LED Apagado');
        } else if (command.startsWith('SERVO:')) {
          const val = command.split(':')[1];
          addLog('in', `MSG:Servo angulo ${val}`);
        } else {
          addLog('in', `ECHO: ${command}`);
        }
      }, 200);
      return true;
    }

    if (!portRef.current) {
      addLog('sys', 'Cannot send data: No device connected.');
      return false;
    }

    const writeTask = async () => {
      if (!portRef.current) return false;
      try {
        const writer = portRef.current.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(formattedText));
        writer.releaseLock();
        return true;
      } catch (err) {
        console.error(err);
        addLog('sys', `Write error: ${err.message}`);
        return false;
      }
    };

    // Queue the writes sequentially to avoid "stream is already locked" errors
    if (!portRef.current.writeQueue) {
      portRef.current.writeQueue = Promise.resolve();
    }
    
    portRef.current.writeQueue = portRef.current.writeQueue.then(writeTask).catch(() => false);
    return portRef.current.writeQueue;
  };

  // Toggle simulated port mode
  const setSimulated = (enable) => {
    if (enable === isSimulated) return;

    if (enable) {
      // Disconnect real port if connected
      if (isConnected) {
        disconnect();
      }
      setIsSimulated(true);
      setIsConnected(true);
      setPortName('Simulated Arduino Board');
      addLog('sys', 'Simulation mode activated. Generating dummy telemetry.');

      // Start dummy telemetry generation
      let counter = 0;
      simulationIntervalRef.current = setInterval(() => {
        counter += 0.25;
        
        // Ultrasonic distance sweeping (10cm to 150cm) to trigger radar/alerts
        const d = Math.round(80 + Math.sin(counter * 0.6) * 70);
        
        // Temperature (20C to 25C) & Humidity (40% to 60%)
        const temp = (22.5 + Math.sin(counter * 0.1) * 2.5 + Math.random() * 0.15).toFixed(1);
        const hum = Math.round(50 + Math.cos(counter * 0.15) * 10 + Math.random() * 1);
        
        // IR Obstacle (1 = obstacle detected, 0 = free)
        const ir = (Math.sin(counter * 0.4) > 0.75) ? 1 : 0;
        
        // Sound volume (KY-038 KY loudness index 10 to 90)
        const snd = Math.round(35 + Math.sin(counter * 1.8) * 25 + Math.random() * 10);
        
        // Joystick physical pins
        const joyx = Math.round(512 + Math.sin(counter) * 350);
        const joyy = Math.round(512 + Math.cos(counter) * 350);
        
        const line = `d:${d},temp:${temp},hum:${hum},ir:${ir},snd:${snd},joyx:${joyx},joyy:${joyy}`;
        processIncomingLine(line);
      }, 750);
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setIsSimulated(false);
      setIsConnected(false);
      setPortName(null);
      addLog('sys', 'Simulation mode deactivated.');
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return {
    isSupported,
    isConnected,
    isConnecting,
    isSimulated,
    connectionType,
    setConnectionType,
    portName,
    baudRate,
    setBaudRate,
    logs,
    connect,
    disconnect,
    sendData,
    clearLogs,
    setSimulated,
  };
}
