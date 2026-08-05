import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Download, Upload, X, Trash2, Sliders, ToggleLeft, 
  Thermometer, Activity, Gauge, Lightbulb, Send, Type, Compass,
  AlertTriangle, Navigation, Zap, Volume2, Shield, Pencil
} from 'lucide-react';

export default function DashboardBuilder({
  t,
  isConnected,
  sendData,
  telemetryData,
  activeLesson,
  logs = []
}) {
  const [widgets, setWidgets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState(null);
  
  // Form States
  const [widgetType, setWidgetType] = useState('button');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [widgetPayload, setWidgetPayload] = useState('');
  const [widgetPayloadOff, setWidgetPayloadOff] = useState('');
  const [widgetMin, setWidgetMin] = useState(0);
  const [widgetMax, setWidgetMax] = useState(180);
  const [widgetTelemetryKey, setWidgetTelemetryKey] = useState('');
  const [widgetTelemetryKey2, setWidgetTelemetryKey2] = useState('');
  const [widgetColor, setWidgetColor] = useState('var(--clr-cyan)');
  const [widgetIcon, setWidgetIcon] = useState('send');

  const fileInputRef = useRef(null);

  // Throttling references
  const throttleTimers = useRef({});
  
  // Drag and Drop State
  const [draggedId, setDraggedId] = useState(null);
  const dragStartFromHeader = useRef(false);
  const [editingWidgetId, setEditingWidgetId] = useState(null);
  const [activeButtonId, setActiveButtonId] = useState(null);
  // Stable refs for event listener handles — prevents memory leaks on re-renders
  const joystickHandlersRef = useRef({ move: null, up: null });
  const dialHandlersRef = useRef({ move: null, up: null });

  const startEditWidget = (widget) => {
    setEditingWidgetId(widget.id);
    setWidgetType(widget.type);
    setWidgetTitle(widget.title);
    setWidgetPayload(widget.payload || '');
    setWidgetPayloadOff(widget.payloadOff || '');
    setWidgetMin(widget.min !== undefined ? widget.min : 0);
    setWidgetMax(widget.max !== undefined ? widget.max : 180);
    setWidgetTelemetryKey(widget.telemetryKey || '');
    setWidgetTelemetryKey2(widget.telemetryKey2 || '');
    setWidgetColor(widget.color || 'var(--clr-cyan)');
    setWidgetIcon(widget.icon || 'send');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingWidgetId(null);
    setWidgetTitle('');
    setWidgetPayload('');
    setWidgetPayloadOff('');
    setWidgetMin(0);
    setWidgetMax(180);
    setWidgetTelemetryKey('');
    setWidgetTelemetryKey2('');
    setWidgetColor('var(--clr-cyan)');
    setWidgetIcon('send');
    setTargetSlotIndex(null);
  };

  const handleButtonClick = async (widget) => {
    setActiveButtonId(widget.id);
    setTimeout(() => setActiveButtonId(null), 300);
    await sendData(widget.payload);
  };

  // Maintain telemetry history for charts
  const [chartsHistory, setChartsHistory] = useState({});

  // Load layout from localStorage or default when activeLesson changes
  useEffect(() => {
    const saved = localStorage.getItem(`edu_layout_${activeLesson.id}`);
    let loadedWidgets = [];
    if (saved) {
      try {
        loadedWidgets = JSON.parse(saved);
      } catch (e) {
        loadedWidgets = activeLesson.recommendedWidgets || [];
      }
    } else {
      loadedWidgets = activeLesson.recommendedWidgets || [];
    }

    // Ensure all widgets have a unique slotIndex
    const usedSlots = new Set();
    const assignedWidgets = loadedWidgets.map((w, idx) => {
      let slot = w.slotIndex;
      if (slot === undefined || slot === null || usedSlots.has(slot)) {
        let testSlot = 0;
        while (usedSlots.has(testSlot)) {
          testSlot++;
        }
        slot = testSlot;
      }
      usedSlots.add(slot);
      return { ...w, slotIndex: slot };
    });

    setWidgets(assignedWidgets);
  }, [activeLesson.id]);

  useEffect(() => {
    if (!telemetryData) return;
    
    // Update charts history state
    setChartsHistory((prev) => {
      const updated = { ...prev };
      Object.keys(telemetryData).forEach((key) => {
        const val = telemetryData[key];
        const hist = updated[key] || [];
        updated[key] = [...hist, val].slice(-20); // Keep last 20
      });
      return updated;
    });
  }, [telemetryData]);

  // Export widgets layout to JSON file
  const exportLayout = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(widgets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "classroom_robot_layout.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import widgets layout from JSON file
  const importLayout = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          const usedSlots = new Set();
          const assigned = parsed.map((w, idx) => {
            let slot = w.slotIndex;
            if (slot === undefined || slot === null || usedSlots.has(slot)) {
              let testSlot = 0;
              while (usedSlots.has(testSlot)) {
                testSlot++;
              }
              slot = testSlot;
            }
            usedSlots.add(slot);
            return { ...w, slotIndex: slot };
          });
          setWidgets(assigned);
          localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(assigned));
        } else {
          alert("Layout JSON inválido.");
        }
      } catch (err) {
        alert("Error al cargar archivo: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteWidget = (id) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(updated));
    // BUG #8 fix: clean up any pending throttle timers for deleted widget
    if (throttleTimers.current[id]) {
      clearTimeout(throttleTimers.current[id]);
      delete throttleTimers.current[id];
    }
    if (throttleTimers.current.latestValues) {
      delete throttleTimers.current.latestValues[id];
    }
  };

  const resetToDefault = () => {
    if (window.confirm(t.msgLayoutReset || "¿Limpiar todo el panel?")) {
      setWidgets([]);
      localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify([]));
    }
  };

  const addWidget = (e) => {
    e.preventDefault();
    if (!widgetTitle.trim()) {
      alert("Introduce un título");
      return;
    }

    if (editingWidgetId) {
      // Edit Mode
      const updated = widgets.map((w) => {
        if (w.id === editingWidgetId) {
          const baseWidget = {
            ...w,
            type: widgetType,
            title: widgetTitle,
            color: widgetColor,
            icon: widgetIcon
          };

          if (widgetType === 'button') {
            baseWidget.payload = widgetPayload;
          } else if (widgetType === 'toggle') {
            baseWidget.payload = widgetPayload;
            baseWidget.payloadOff = widgetPayloadOff;
          } else if (widgetType === 'slider') {
            baseWidget.payload = widgetPayload;
            baseWidget.min = Number(widgetMin);
            baseWidget.max = Number(widgetMax);
          } else if (widgetType === 'servo_knob') {
            baseWidget.payload = widgetPayload || 'SERVO:';
          } else if (widgetType === 'joystick') {
            baseWidget.payload = widgetPayload || 'J:';
          } else if (widgetType === 'motor') {
            baseWidget.payload = widgetPayload || 'M:';
          } else if (widgetType === 'gauge') {
            baseWidget.telemetryKey = widgetTelemetryKey;
            baseWidget.min = Number(widgetMin);
            baseWidget.max = Number(widgetMax);
          } else if (widgetType === 'radar') {
            baseWidget.telemetryKey = widgetTelemetryKey || 'd';
            baseWidget.min = 0;
            baseWidget.max = 150;
          } else if (widgetType === 'dht11') {
            baseWidget.telemetryKey = widgetTelemetryKey || 'temp';
            baseWidget.telemetryKey2 = widgetTelemetryKey2 || 'hum';
          } else if (widgetType === 'ir') {
            baseWidget.telemetryKey = widgetTelemetryKey || 'ir';
          } else if (widgetType === 'sound') {
            baseWidget.telemetryKey = widgetTelemetryKey || 'snd';
          } else if (widgetType === 'chart') {
            baseWidget.telemetryKey = widgetTelemetryKey;
          }
          return baseWidget;
        }
        return w;
      });

      setWidgets(updated);
      localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(updated));
      closeModal();
    } else {
      // Add Mode
      let slot = targetSlotIndex;
      if (slot === null) {
        slot = 0;
        const occupiedSlots = new Set(widgets.map(w => w.slotIndex));
        while (occupiedSlots.has(slot)) {
          slot++;
        }
      }

      const newWidget = {
        id: 'w_' + Date.now(),
        type: widgetType,
        title: widgetTitle,
        color: widgetColor,
        icon: widgetIcon,
        slotIndex: slot
      };

      if (widgetType === 'button') {
        newWidget.payload = widgetPayload;
      } else if (widgetType === 'toggle') {
        newWidget.payload = widgetPayload;
        newWidget.payloadOff = widgetPayloadOff;
        newWidget.isToggled = false;
      } else if (widgetType === 'slider') {
        newWidget.payload = widgetPayload;
        newWidget.min = Number(widgetMin);
        newWidget.max = Number(widgetMax);
        newWidget.currentVal = Number(widgetMin);
      } else if (widgetType === 'knob') {
        newWidget.payload = widgetPayload || 'SERVO:';
        newWidget.currentVal = 0;
      } else if (widgetType === 'joystick') {
        newWidget.payload = widgetPayload || 'J:';
        newWidget.telemetryKey = widgetTelemetryKey || 'joyx';
        newWidget.telemetryKey2 = widgetTelemetryKey2 || 'joyy';
      } else if (widgetType === 'gauge') {
        newWidget.telemetryKey = widgetTelemetryKey;
        newWidget.min = Number(widgetMin);
        newWidget.max = Number(widgetMax);
      } else if (widgetType === 'indicator') {
        newWidget.telemetryKey = widgetTelemetryKey || 'ind';
      } else if (widgetType === 'chart') {
        newWidget.telemetryKey = widgetTelemetryKey;
      }

      const updated = [...widgets, newWidget];
      setWidgets(updated);
      localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(updated));
      closeModal();
    }
  };

  // HTML5 Drag and Drop Handlers for Swapping Position
  const handleDragStart = (e, id) => {
    // Only allow dragging if started from the header drag handle
    if (!dragStartFromHeader.current) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnSlot = (e, targetSlotIdx) => {
    e.preventDefault();
    if (!draggedId) return;

    const draggedWidget = widgets.find(w => w.id === draggedId);
    if (!draggedWidget) return;

    // Check if there is already a widget at targetSlotIdx
    const existingWidgetAtTarget = widgets.find(w => w.slotIndex === targetSlotIdx);

    const updated = widgets.map((w) => {
      if (w.id === draggedId) {
        return { ...w, slotIndex: targetSlotIdx };
      }
      if (existingWidgetAtTarget && w.id === existingWidgetAtTarget.id) {
        return { ...w, slotIndex: draggedWidget.slotIndex };
      }
      return w;
    });

    setWidgets(updated);
    localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(updated));
    setDraggedId(null);
  };

  const handleDropOnWidget = (e, targetWidget) => {
    e.preventDefault();
    handleDropOnSlot(e, targetWidget.slotIndex);
  };

  // Slider change transmitter
  const handleSliderChange = (widgetId, prefix, value) => {
    setWidgets((prev) => 
      prev.map((w) => w.id === widgetId ? { ...w, currentVal: value } : w)
    );

    if (!throttleTimers.current.latestValues) throttleTimers.current.latestValues = {};
    throttleTimers.current.latestValues[widgetId] = value;

    if (throttleTimers.current[widgetId]) return;

    throttleTimers.current[widgetId] = setTimeout(async () => {
      const finalVal = throttleTimers.current.latestValues[widgetId];
      await sendData(`${prefix}${finalVal}`);
      delete throttleTimers.current[widgetId];
    }, 200);
  };

  // Toggle switch transmitter
  const handleToggleChange = async (widget) => {
    const newState = !widget.isToggled;
    setWidgets((prev) => 
      prev.map((w) => w.id === widget.id ? { ...w, isToggled: newState } : w)
    );

    const payload = newState ? widget.payload : widget.payloadOff;
    await sendData(payload);
  };

  // Motor Driver Transmitter
  const handleMotorClick = async (widgetId, prefix, direction) => {
    setWidgets((prev) =>
      prev.map((w) => w.id === widgetId ? { ...w, activeMotorDir: direction } : w)
    );
    await sendData(`${prefix}${direction}`);
  };

  // Joystick dragging state references
  const joystickRefs = useRef({});
  const activeJoystickId = useRef(null);

  const startJoystickDrag = (e, id) => {
    if (!isConnected) return;

    // BUG #3 fix: remove any stale listeners before attaching new stable refs
    if (joystickHandlersRef.current.move) {
      window.removeEventListener('mousemove', joystickHandlersRef.current.move);
      window.removeEventListener('mouseup', joystickHandlersRef.current.up);
      window.removeEventListener('touchmove', joystickHandlersRef.current.move);
      window.removeEventListener('touchend', joystickHandlersRef.current.up);
    }

    activeJoystickId.current = id;

    const moveHandler = (ev) => {
      if (!activeJoystickId.current) return;
      if (ev.cancelable) ev.preventDefault();
      updateJoystickPosition(ev);
    };

    const upHandler = async () => {
      const jid = activeJoystickId.current;
      if (!jid) return;

      const w = widgets.find(widget => widget.id === jid);
      const prefix = w ? w.payload : 'J:';

      // Cancel any scheduled throttle timers to prevent trailing movement events
      if (throttleTimers.current[jid]) {
        clearTimeout(throttleTimers.current[jid]);
        delete throttleTimers.current[jid];
      }
      if (throttleTimers.current.latestValues) {
        delete throttleTimers.current.latestValues[jid];
      }

      joystickRefs.current[jid] = { x: 0, y: 0 };
      setWidgets(prev => [...prev]);

      window.removeEventListener('mousemove', joystickHandlersRef.current.move);
      window.removeEventListener('mouseup', joystickHandlersRef.current.up);
      window.removeEventListener('touchmove', joystickHandlersRef.current.move);
      window.removeEventListener('touchend', joystickHandlersRef.current.up);
      joystickHandlersRef.current = { move: null, up: null };

      activeJoystickId.current = null;
      await sendData(`${prefix}0,0`);
    };

    joystickHandlersRef.current = { move: moveHandler, up: upHandler };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', upHandler);

    updateJoystickPosition(e);
  };

  const updateJoystickPosition = (e) => {
    const id = activeJoystickId.current;
    if (!id) return;

    const padElement = document.getElementById(`joypad-${id}`);
    if (!padElement) return;

    const rect = padElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const maxRadius = 45;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    const scaleX = Math.round((dx / maxRadius) * 100);
    const scaleY = Math.round(-(dy / maxRadius) * 100);

    joystickRefs.current[id] = { x: dx, y: dy };
    setWidgets(prev => [...prev]);

    // Throttle coords — always sends the latest captured value
    if (!throttleTimers.current.latestValues) throttleTimers.current.latestValues = {};
    throttleTimers.current.latestValues[id] = { scaleX, scaleY };

    if (throttleTimers.current[id]) return;
    const w = widgets.find(widget => widget.id === id);
    const prefix = w ? w.payload : 'J:';

    throttleTimers.current[id] = setTimeout(async () => {
      const { scaleX: fX, scaleY: fY } = throttleTimers.current.latestValues[id];
      await sendData(`${prefix}${fX},${fY}`);
      delete throttleTimers.current[id];
    }, 200);
  };

  // Radial Dial handler for Servo
  const handleDialMouseDown = (e, widget) => {
    if (!isConnected) return;

    // BUG #4 fix: remove any stale listeners before attaching new ones
    if (dialHandlersRef.current.move) {
      window.removeEventListener('mousemove', dialHandlersRef.current.move);
      window.removeEventListener('mouseup', dialHandlersRef.current.up);
      window.removeEventListener('touchmove', dialHandlersRef.current.move);
      window.removeEventListener('touchend', dialHandlersRef.current.up);
    }

    const dialId = widget.id;
    const handleDialMove = (moveEvent) => {
      const dialEl = document.getElementById(`dial-${dialId}`);
      if (!dialEl) return;

      const rect = dialEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      let servoAngle = angle + 90;
      if (servoAngle < 0) servoAngle += 360;
      
      const min = widget.min !== undefined ? Number(widget.min) : 0;
      const max = widget.max !== undefined ? Number(widget.max) : 180;
      
      let mappedValue = 0;
      if (servoAngle >= 0 && servoAngle <= 270) {
        mappedValue = Math.round(min + (servoAngle / 270) * (max - min));
      } else {
        if (servoAngle > 270 && servoAngle < 315) {
          mappedValue = max;
        } else {
          mappedValue = min;
        }
      }

      handleSliderChange(dialId, widget.payload, mappedValue);
    };

    const handleDialMouseUp = () => {
      window.removeEventListener('mousemove', dialHandlersRef.current.move);
      window.removeEventListener('mouseup', dialHandlersRef.current.up);
      window.removeEventListener('touchmove', dialHandlersRef.current.move);
      window.removeEventListener('touchend', dialHandlersRef.current.up);
      dialHandlersRef.current = { move: null, up: null };
    };

    dialHandlersRef.current = { move: handleDialMove, up: handleDialMouseUp };

    window.addEventListener('mousemove', handleDialMove);
    window.addEventListener('mouseup', handleDialMouseUp);
    window.addEventListener('touchmove', handleDialMove, { passive: false });
    window.addEventListener('touchend', handleDialMouseUp);
  };

  // Icon selector
  const renderIcon = (name, color) => {
    const props = { size: 18, color };
    switch (name) {
      case 'lightbulb': return <Lightbulb {...props} />;
      case 'sliders': return <Sliders {...props} />;
      case 'activity': return <Activity {...props} />;
      case 'gauge': return <Gauge {...props} />;
      case 'thermometer': return <Thermometer {...props} />;
      case 'send': return <Send {...props} />;
      case 'navigation': return <Navigation {...props} />;
      case 'volume2': return <Volume2 {...props} />;
      default: return <Lightbulb {...props} />;
    }
  };

  // Calculate grid board slots
  const maxSlotIndex = widgets.reduce((max, w) => Math.max(max, w.slotIndex ?? 0), 0);
  const minSlots = 12;
  const numSlots = Math.max(minSlots, Math.ceil((maxSlotIndex + 1) / 12) * 12);

  const lastSerialMsg = [...(logs || [])].reverse().find(l => l.type === 'in')?.text || 'SIN DATOS (CONECTA TU PLACA)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Dashboard Top Settings */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--clr-cyan)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Compass size={22} />
            {t.dashboardTitle}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>{t.dashboardDesc}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => { setTargetSlotIndex(null); setShowAddModal(true); }} 
            className="btn btn-primary"
            style={{ height: '36px' }}
          >
            <Plus size={16} />
            {t.btnAddWidget}
          </button>
          
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="btn btn-secondary"
            style={{ height: '36px' }}
          >
            <Upload size={14} />
            {t.btnImport}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={importLayout}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button 
            onClick={exportLayout} 
            className="btn btn-secondary"
            style={{ height: '36px' }}
          >
            <Download size={14} />
            {t.btnExport}
          </button>

          <button 
            onClick={resetToDefault} 
            className="btn btn-secondary"
            style={{ height: '36px', borderColor: 'var(--clr-yellow)', color: 'var(--clr-yellow)', gap: '0.25rem' }}
            title={t.btnResetDefault}
          >
            <Zap size={14} />
            {t.btnResetDefault}
          </button>
        </div>
      </div>

      {/* Live Serial LCD Ticker Banner */}
      <div 
        className="lcd-marquee-container"
        style={{
          background: '#041d14',
          border: '3px solid #0f131a',
          borderRadius: '10px',
          padding: '0.4rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8), 0 3px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <span 
          style={{ 
            fontSize: '0.65rem', 
            color: 'var(--clr-green)', 
            fontWeight: 'bold',
            background: 'rgba(19, 209, 141, 0.1)',
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
            border: '1px solid rgba(19, 209, 141, 0.3)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 3px var(--clr-green)'
          }}
        >
          📡 RX STREAM:
        </span>
        <div 
          style={{ 
            flexGrow: 1, 
            color: '#10b981', 
            fontSize: '0.8rem', 
            fontWeight: 'bold',
            textShadow: '0 0 4px #10b981',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {lastSerialMsg}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? 'var(--clr-green)' : 'var(--clr-red)',
            boxShadow: isConnected ? '0 0 6px var(--clr-green)' : '0 0 6px var(--clr-red)',
            animation: isConnected ? 'pulse-glow 0.8s infinite' : 'none'
          }} />
          <span style={{ fontSize: '0.6rem', color: isConnected ? 'var(--clr-green)' : 'var(--clr-red)', fontWeight: 'bold' }}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Lego-style Grid Board */}
      {widgets.length === 0 ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', borderStyle: 'dashed', borderColor: 'var(--border-subtle)' }}>
          <Compass size={48} color="var(--txt-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--txt-primary)', marginBottom: '0.25rem' }}>{t.noWidgets}</h3>
          <button onClick={() => { setTargetSlotIndex(null); setShowAddModal(true); }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <Plus size={16} />
            {t.btnAddWidget}
          </button>
        </div>
      ) : (
        <div className="widget-grid-board animate-fade-in" style={{ minHeight: '500px' }}>
          {Array.from({ length: numSlots }).map((_, slotIdx) => {
            const widget = widgets.find(w => w.slotIndex === slotIdx);
            
            if (!widget) {
              // Empty dashed drop zone
              return (
                <div
                  key={`empty-${slotIdx}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnSlot(e, slotIdx)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '2px dashed rgba(255, 255, 255, 0.04)',
                    borderRadius: '12px',
                    height: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                  }}
                  onClick={() => {
                    setTargetSlotIndex(slotIdx);
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={20} style={{ color: 'var(--txt-muted)', opacity: 0.25 }} />
                </div>
              );
            }
            
            const accentColor = widget.color || 'var(--clr-cyan)';
            return (
              <div 
                key={widget.id} 
                className="widget-card arcade-card animate-fade-in" 
                style={{ 
                  borderTop: `4px solid ${accentColor}`,
                  opacity: draggedId === widget.id ? 0.3 : 1,
                  height: '190px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.3rem',
                  padding: '0.85rem'
                }}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnWidget(e, widget)}
                onDragEnd={() => {
                  setDraggedId(null);
                  dragStartFromHeader.current = false;
                }}
              >
                {/* Rivets decoration */}
                <div className="card-rivet tl" />
                <div className="card-rivet tr" />
                <div className="card-rivet bl" />
                <div className="card-rivet br" />
                
                {/* Header widget (Drag Handle) */}
                <div 
                  className="widget-header" 
                  style={{ cursor: 'grab', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '4px', touchAction: 'none' }}
                  onMouseDown={() => { dragStartFromHeader.current = true; }}
                  onTouchStart={() => { dragStartFromHeader.current = true; }}
                >
                  <span className="widget-title" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {renderIcon(widget.icon, accentColor)}
                    {widget.title}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button 
                      onClick={() => startEditWidget(widget)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-muted)' }}
                      title="Editar Control"
                    >
                      <Pencil size={13} />
                    </button>
                    <button 
                      onClick={() => deleteWidget(widget.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-muted)' }}
                      title={t.widgetDelete}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="widget-content" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                  
                  {/* BUTTON */}
                  {widget.type === 'button' && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <div 
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (isConnected) handleButtonClick(widget);
                        }}
                        style={{ 
                          cursor: isConnected ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: activeButtonId === widget.id ? 'translateY(4px)' : 'none',
                          transition: 'transform 0.05s ease',
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <svg width="76" height="76" viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
                          <circle cx="40" cy="44" r="34" fill="#0f172a" opacity="0.4" />
                          <circle cx="40" cy="40" r="34" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
                          <circle cx="40" cy="40" r="28" fill="#0f172a" />
                          <circle 
                            cx="40" 
                            cy={activeButtonId === widget.id ? 42 : 38} 
                            r="24" 
                            fill={activeButtonId === widget.id ? accentColor : `url(#btnGrad-${widget.id})`} 
                            stroke="#0f172a" 
                            strokeWidth="2.5" 
                            style={{ transition: 'all 0.05s ease' }}
                          />
                          {activeButtonId !== widget.id && (
                            <path d="M 22,30 A 20,20 0 0,1 58,30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
                          )}
                          <defs>
                            <radialGradient id={`btnGrad-${widget.id}`} cx="40%" cy="40%" r="60%">
                              <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                              <stop offset="50%" stopColor={accentColor} />
                              <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
                            </radialGradient>
                          </defs>
                        </svg>
                      </div>
                      <div className="label-tape red" style={{ marginTop: '0.2rem', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        🚀 {widget.payload}
                      </div>
                    </div>
                  )}

                  {/* TOGGLE */}
                  {widget.type === 'toggle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <div 
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (isConnected) handleToggleChange(widget);
                        }}
                        style={{ 
                          cursor: isConnected ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                                       <svg width="100" height="70" viewBox="0 0 100 70" style={{ overflow: 'visible' }}>
                          {/* Metal plate base for the switch */}
                          <rect x="25" y="10" width="50" height="50" rx="8" fill="#475569" stroke="#0f172a" strokeWidth="3.5" />
                          <rect x="29" y="14" width="42" height="42" rx="4" fill="#0f172a" />
                          
                          {/* Bezel for LED */}
                          <circle cx="50" cy="22" r="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                          <circle cx="50" cy="22" r="4" fill={widget.isToggled ? accentColor : "#334155"} />
                          {widget.isToggled && (
                            <circle cx="50" cy="22" r="8" fill={accentColor} opacity="0.5" filter="blur(2px)" />
                          )}
                          
                          {/* Toggle slot */}
                          <rect x="46" y="32" width="8" height="18" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                          
                          {/* Toggle Lever */}
                          {widget.isToggled ? (
                            <g style={{ transition: 'all 0.1s' }}>
                              <line x1="50" y1="41" x2="50" y2="30" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                              <line x1="50" y1="41" x2="50" y2="30" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
                              <circle cx="50" cy="28" r="6" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
                              <circle cx="48" cy="26" r="2" fill="#fff" opacity="0.6" />
                            </g>
                          ) : (
                            <g style={{ transition: 'all 0.1s' }}>
                              <line x1="50" y1="41" x2="50" y2="48" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                              <line x1="50" y1="41" x2="50" y2="48" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                              <circle cx="50" cy="50" r="6" fill="#4b5563" stroke="#0f172a" strokeWidth="1.5" />
                            </g>
                          )}
                        </svg>
                      </div>
                      <div className={`label-tape ${widget.isToggled ? 'green' : 'yellow'}`} style={{ marginTop: '0.2rem' }}>
                        🚀 {widget.isToggled ? widget.payload : widget.payloadOff}
                      </div>
                    </div>
                  )}
 
                  {/* SLIDER */}
                  {widget.type === 'slider' && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 0.5rem' }}>
                        <div className="lcd-display" style={{ minWidth: '70px', fontSize: '0.85rem' }}>
                          📟 {widget.currentVal !== undefined ? widget.currentVal : widget.min}
                        </div>
                        <div className="label-tape" style={{ fontSize: '0.6rem' }}>
                          🚀 {widget.payload}{widget.currentVal !== undefined ? widget.currentVal : widget.min}
                        </div>
                      </div>
                      <div style={{ width: '100%', padding: '0 0.5rem', display: 'flex', alignItems: 'center', position: 'relative', height: '40px' }}>
                        <input
                          type="range"
                          className="arcade-slider"
                          min={widget.min}
                          max={widget.max}
                          value={widget.currentVal !== undefined ? widget.currentVal : widget.min}
                          disabled={!isConnected}
                          onChange={(e) => handleSliderChange(widget.id, widget.payload, Number(e.target.value))}
                          style={{
                            width: '100%',
                            cursor: isConnected ? 'pointer' : 'not-allowed',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', color: 'var(--txt-muted)', padding: '0 0.5rem' }}>
                        <span>MIN: {widget.min}</span>
                        <span>MAX: {widget.max}</span>
                      </div>
                    </div>
                  )}

                  {/* TEXT INPUT */}
                  {widget.type === 'text_input' && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div className="lcd-display blue" style={{ width: '100%', fontSize: '0.7rem', justifyContent: 'flex-start', height: '24px' }}>
                        ⚙️ SEND_CMD:
                      </div>
                      <div style={{ display: 'flex', width: '100%', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="CMD..."
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              await sendData(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          disabled={!isConnected}
                          className="form-input"
                          style={{ 
                            flexGrow: 1, 
                            height: '36px', 
                            fontSize: '0.8rem', 
                            border: '2px solid #0f131a', 
                            background: '#0f172a', 
                            borderRadius: '8px',
                            fontFamily: 'var(--font-mono)'
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousSibling;
                            if (input && input.value.trim()) {
                              sendData(input.value);
                              input.value = '';
                            }
                          }}
                          disabled={!isConnected}
                          className="btn btn-secondary arcade-btn-push"
                          style={{ 
                            height: '36px', 
                            width: '36px', 
                            padding: 0,
                            borderRadius: '50%',
                            background: 'var(--clr-yellow)',
                            color: '#0f131a',
                            borderColor: '#0f131a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 3px 0 #92400e'
                          }}
                        >
                          ✈️
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STANDARD GAUGE */}
                  {widget.type === 'gauge' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexGrow: 1, alignItems: 'flex-start' }}>
                        <span className="label-tape yellow" style={{ fontSize: '0.55rem' }}>
                          📟 {(widget.telemetryKey || '???').toUpperCase()}
                        </span>
                        <div className="lcd-display" style={{ fontSize: '1.2rem', padding: '0.4rem 0.8rem', marginTop: '0.2rem' }}>
                          {telemetryData && telemetryData[widget.telemetryKey] !== undefined 
                            ? telemetryData[widget.telemetryKey] 
                            : '---'}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '75px', height: '75px' }}>
                        <svg width="75" height="75" viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
                          <circle cx="40" cy="40" r="36" fill="#f8fafc" stroke="#0f172a" strokeWidth="3.5" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                          <path d="M 14,56 A 30,30 0 0,1 40,10" fill="none" stroke="#10b981" strokeWidth="4" />
                          <path d="M 40,10 A 30,30 0 0,1 66,56" fill="none" stroke="#ef4444" strokeWidth="4" />
                          <line x1="14" y1="56" x2="20" y2="53" stroke="#0f172a" strokeWidth="2" />
                          <line x1="40" y1="10" x2="40" y2="17" stroke="#0f172a" strokeWidth="2" />
                          <line x1="66" y1="56" x2="60" y2="53" stroke="#0f172a" strokeWidth="2" />
                          <g 
                            style={{ 
                              transform: `rotate(${(() => {
                                const val = telemetryData && telemetryData[widget.telemetryKey] !== undefined ? telemetryData[widget.telemetryKey] : widget.min;
                                const pct = Math.min(100, Math.max(0, ((val - widget.min) / (widget.max - widget.min || 1)) * 100));
                                return -120 + (pct / 100) * 240;
                              })()}deg)`,
                              transformOrigin: '40px 40px',
                              transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                          >
                            <line x1="40" y1="40" x2="40" y2="12" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="40" cy="20" r="2" fill="#fff" />
                          </g>
                          <circle cx="40" cy="40" r="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                          <circle cx="40" cy="40" r="2.5" fill="#94a3b8" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* LINE CHART */}
                  {widget.type === 'chart' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.2rem' }}>
                      <div style={{ height: '76px', width: '100%', background: '#022c22', border: '3px solid #0f131a', borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.6)' }}>
                        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.25 }}>
                          <line x1="0" y1="19" x2="100%" y2="19" stroke="#10b981" strokeWidth="0.5" />
                          <line x1="0" y1="38" x2="100%" y2="38" stroke="#10b981" strokeWidth="0.5" />
                          <line x1="0" y1="57" x2="100%" y2="57" stroke="#10b981" strokeWidth="0.5" />
                          <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#10b981" strokeWidth="0.5" />
                          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#10b981" strokeWidth="0.5" />
                          <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#10b981" strokeWidth="0.5" />
                        </svg>
                        {chartsHistory[widget.telemetryKey] && chartsHistory[widget.telemetryKey].length > 1 ? (
                          <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }} preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              points={(() => {
                                const history = chartsHistory[widget.telemetryKey];
                                const minVal = Math.min(...history);
                                const maxVal = Math.max(...history);
                                const range = maxVal - minVal || 1;
                                return history.map((val, idx) => {
                                  const x = (idx / (history.length - 1)) * 100;
                                  const y = 43 - ((val - minVal) / range) * 36;
                                  return `${x},${y}`;
                                }).join(' ');
                              })()}
                              style={{ filter: 'drop-shadow(0 0 5px #10b981)' }}
                            />
                          </svg>
                        ) : (
                          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#10b981', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                            🔊 ESPERANDO DATOS...
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="label-tape" style={{ fontSize: '0.55rem' }}>
                          📊 OSCILLOSCOPE: {widget.telemetryKey}
                        </div>
                        <div className="lcd-display" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                          VAL: {chartsHistory[widget.telemetryKey] && chartsHistory[widget.telemetryKey].length > 0 
                            ? chartsHistory[widget.telemetryKey][chartsHistory[widget.telemetryKey].length - 1] 
                            : '--'}
                        </div>
                      </div>
                    </div>
                  )}


                  {/* SPECIALIZED: JOYSTICK */}
                  {widget.type === 'joystick' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      {(() => {
                        const isPhysical = telemetryData && 
                          telemetryData[widget.telemetryKey] !== undefined && 
                          telemetryData[widget.telemetryKey2] !== undefined;

                        let posX = 0;
                        let posY = 0;
                        let labelX = 0;
                        let labelY = 0;

                        if (isPhysical) {
                          const physX = telemetryData[widget.telemetryKey];
                          const physY = telemetryData[widget.telemetryKey2];
                          // Convert 0-1023 to -24px to +24px range
                          posX = Math.round(((physX - 512) / 512) * 24);
                          posY = Math.round(((physY - 512) / 512) * 24);
                          labelX = physX;
                          labelY = physY;
                        } else {
                          const pos = joystickRefs.current[widget.id] || { x: 0, y: 0 };
                          posX = pos.x;
                          posY = pos.y;
                          labelX = Math.round((pos.x / 45) * 100);
                          labelY = Math.round(-(pos.y / 45) * 100);
                        }

                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                              <span className="label-tape" style={{ fontSize: '0.55rem' }}>🕹️ JOYSTICK XY</span>
                              <div className="lcd-display" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', marginTop: '0.1rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', minWidth: '75px' }}>
                                <div>X: {labelX}</div>
                                <div>Y: {labelY}</div>
                              </div>
                              <span style={{ fontSize: '0.55rem', color: 'var(--txt-muted)' }}>
                                {isPhysical ? 'Modo: FÍSICO' : `🚀 ${widget.payload}${labelX},${labelY}`}
                              </span>
                            </div>
                            
                            <div 
                              id={`joypad-${widget.id}`}
                              onMouseDown={(e) => startJoystickDrag(e, widget.id)}
                              onTouchStart={(e) => startJoystickDrag(e, widget.id)}
                              style={{
                                width: '80px',
                                height: '80px',
                                background: '#0f172a',
                                border: '3px solid #1e293b',
                                borderRadius: '50%',
                                position: 'relative',
                                cursor: isConnected && !isPhysical ? 'grab' : (isPhysical ? 'not-allowed' : 'not-allowed'),
                                touchAction: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.6)'
                              }}
                            >
                              <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                              <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(255,255,255,0.05)' }} />
                              <div style={{ position: 'absolute', width: '56px', height: '56px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.05)' }} />
                              
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'radial-gradient(circle at 35% 35%, #475569 0%, #1e293b 70%, #0f172a 100%)',
                                  border: '2.5px solid #0f131a',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                                  position: 'absolute',
                                  transform: `translate(${posX}px, ${posY}px)`,
                                  pointerEvents: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: isPhysical ? 'transform 0.15s ease' : 'none'
                                }}
                              >
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.25)', background: 'radial-gradient(circle at 35% 35%, #64748b 0%, #334155 70%)' }} />
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8', position: 'absolute', top: '6px', left: '6px', opacity: 0.6 }} />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* DIGITAL INDICATOR */}
                  {widget.type === 'indicator' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                        {(() => {
                          const val = telemetryData ? telemetryData[widget.telemetryKey] : 0;
                          const active = val === 1 || val === "1" || val === true || val === "true" || val > 0;
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: active ? widget.color || 'var(--clr-green)' : 'rgba(255,255,255,0.05)',
                                  border: '2px solid #0f131a',
                                  boxShadow: active ? `0 0 10px ${widget.color || 'var(--clr-green)'}` : 'none',
                                  transition: 'all 0.2s'
                                }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? (widget.color || 'var(--clr-green)') : 'var(--txt-muted)' }}>
                                  {active ? 'ACTIVO (1)' : 'INACTIVO (0)'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--txt-muted)' }}>Clave: {widget.telemetryKey}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}




                  {/* KNOB (POTENTIOMETER) */}
                  {widget.type === 'knob' && (() => {
                    const min = widget.min !== undefined ? Number(widget.min) : 0;
                    const max = widget.max !== undefined ? Number(widget.max) : 180;
                    const current = widget.currentVal !== undefined ? widget.currentVal : min;
                    const ratio = (current - min) / (max - min || 1);
                    const rotation = -135 + (ratio * 270);
                    
                    return (
                      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>Potenciómetro</span>
                          <b style={{ color: accentColor, fontSize: '1.2rem', textShadow: `0 0 6px ${accentColor}` }}>
                            {current}
                          </b>
                          <div className="label-tape" style={{ fontSize: '0.55rem', display: 'inline-block', maxWidth: 'max-content', marginTop: '0.2rem' }}>
                            {widget.payload}{current}
                          </div>
                        </div>
                        
                        <div 
                          id={`dial-${widget.id}`}
                          onMouseDown={(e) => handleDialMouseDown(e, widget)}
                          onTouchStart={(e) => handleDialMouseDown(e, widget)}
                          style={{
                            width: '85px',
                            height: '85px',
                            position: 'relative',
                            cursor: isConnected ? 'pointer' : 'not-allowed',
                            touchAction: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <svg width="85" height="85" viewBox="0 0 85 85" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                            <circle cx="42.5" cy="42.5" r="40" fill="#0f172a" stroke="#1e293b" strokeWidth="4" />
                            <path d="M 14,71 A 40 40 0 1 1 71,71" fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                          </svg>

                          <div 
                            style={{
                              width: '4px',
                              height: '40px',
                              position: 'absolute',
                              top: '2.5px', 
                              left: '40.5px',
                              transformOrigin: '2px 40px',
                              transform: `rotate(${rotation}deg)`,
                              transition: 'transform 0.1s ease',
                              pointerEvents: 'none'
                            }}
                          >
                            <div style={{ width: '4px', height: '12px', background: 'var(--clr-cyan)', borderRadius: '2px', boxShadow: '0 0 8px var(--clr-cyan)' }} />
                          </div>
                          
                          <div style={{
                            position: 'absolute',
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 35% 35%, #475569 0%, #1e293b 70%, #0f172a 100%)',
                            border: '2px solid #0f131a',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                            pointerEvents: 'none'
                          }} />
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Widget Modal Overlay */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '460px', background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--clr-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingWidgetId ? <Pencil size={18} /> : <Plus size={18} />}
                {editingWidgetId ? (t.widgetEditTitle || 'Editar Control') : t.btnAddWidget}
              </h3>
              <button 
                onClick={closeModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={addWidget} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Type Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>{t.widgetType}</label>
                <select
                  value={widgetType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setWidgetType(type);
                    if (type === 'button') {
                      setWidgetIcon('send');
                      setWidgetColor('var(--clr-cyan)');
                    } else if (type === 'toggle') {
                      setWidgetIcon('lightbulb');
                      setWidgetColor('var(--clr-green)');
                    } else if (type === 'slider') {
                      setWidgetIcon('sliders');
                      setWidgetColor('var(--clr-yellow)');
                    } else if (type === 'knob') {
                      setWidgetIcon('sliders');
                      setWidgetColor('var(--clr-purple)');
                    } else if (type === 'joystick') {
                      setWidgetIcon('sliders');
                      setWidgetColor('var(--clr-green)');
                      setWidgetPayload('J:');
                      setWidgetTelemetryKey('joyx');
                      setWidgetTelemetryKey2('joyy');
                    } else if (type === 'gauge') {
                      setWidgetIcon('gauge');
                      setWidgetColor('var(--clr-cyan)');
                    } else if (type === 'chart') {
                      setWidgetIcon('activity');
                      setWidgetColor('var(--clr-purple)');
                    } else if (type === 'indicator') {
                      setWidgetIcon('lightbulb');
                      setWidgetColor('var(--clr-red)');
                      setWidgetTelemetryKey('ind');
                    }
                  }}
                  className="form-input"
                >
                  <option value="button">{t.typeButton}</option>
                  <option value="toggle">{t.typeToggle}</option>
                  <option value="slider">{t.typeSlider}</option>
                  <option value="knob">Potenciómetro</option>
                  <option value="joystick">{t.typeJoystick}</option>
                  <option value="gauge">{t.typeGauge}</option>
                  <option value="chart">{t.typeChart}</option>
                  <option value="indicator">Luz Indicadora (Dato digital)</option>
                </select>
              </div>

              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>{t.widgetTitleLabel}</label>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="Ej: Servomotor, Ultrasonido, etc."
                  className="form-input"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                  {t.helpTitle}
                </span>
              </div>

              {/* Action specific inputs */}
              {(widgetType === 'button' || widgetType === 'toggle' || widgetType === 'slider' || widgetType === 'knob') && (() => {
                const predefinedPayloads = ["SERVO:", "MOTA:", "MOTB:", "LED:", "BEEP:", "1", "0"];
                const isCustomPayload = !predefinedPayloads.includes(widgetPayload);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
                      Destino / Acción (Prefijo)
                    </label>
                    <select
                      value={isCustomPayload ? "custom" : widgetPayload}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setWidgetPayload("");
                        } else {
                          setWidgetPayload(e.target.value);
                        }
                      }}
                      className="form-input"
                      style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                    >
                      <option value="SERVO:">Servomotor (SERVO:)</option>
                      <option value="MOTA:">Motor A (MOTA:)</option>
                      <option value="MOTB:">Motor B (MOTB:)</option>
                      <option value="LED:">LED / Foco (LED:)</option>
                      <option value="BEEP:">Zumbador (BEEP:)</option>
                      <option value="1">Señal Digital 1 (1)</option>
                      <option value="0">Señal Digital 0 (0)</option>
                      <option value="custom">-- Escribir Personalizado --</option>
                    </select>
                    {isCustomPayload && (
                      <input
                        type="text"
                        value={widgetPayload}
                        onChange={(e) => setWidgetPayload(e.target.value)}
                        placeholder={t.widgetPayloadPlaceholder}
                        className="form-input"
                        style={{ marginTop: '0.25rem' }}
                      />
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                      Selecciona qué componente en el Arduino recibirá este valor.
                    </span>
                  </div>
                );
              })()}

              {/* Toggle off payload */}
              {widgetType === 'toggle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>{t.widgetPayloadOff}</label>
                  <input
                    type="text"
                    value={widgetPayloadOff}
                    onChange={(e) => setWidgetPayloadOff(e.target.value)}
                    placeholder={t.widgetPayloadOffPlaceholder}
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                    {t.helpPayloadOff}
                  </span>
                </div>
              )}

              {/* Ranges */}
              {(widgetType === 'slider' || widgetType === 'gauge') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>{t.widgetMin}</label>
                    <input
                      type="number"
                      value={widgetMin}
                      onChange={(e) => setWidgetMin(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>{t.widgetMax}</label>
                    <input
                      type="number"
                      value={widgetMax}
                      onChange={(e) => setWidgetMax(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2', fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                    {t.helpRanges}
                  </div>
                </div>
              )}

              {/* Telemetry keys */}
              {(widgetType === 'gauge' || widgetType === 'chart' || widgetType === 'indicator') && (() => {
                const predefinedKeys = ["temp", "hum", "d", "pot", "ldr", "snd", "ind"];
                const isCustomKey = !predefinedKeys.includes(widgetTelemetryKey);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
                        Origen del Dato (Clave)
                      </label>
                      <select
                        value={isCustomKey ? "custom" : widgetTelemetryKey}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setWidgetTelemetryKey("");
                          } else {
                            setWidgetTelemetryKey(e.target.value);
                          }
                        }}
                        className="form-input"
                        style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="d">Distancia Ultrasónica (d)</option>
                        <option value="temp">Temperatura (temp)</option>
                        <option value="hum">Humedad (hum)</option>
                        <option value="pot">Potenciómetro (pot)</option>
                        <option value="ldr">Luz / Fotorresistencia (ldr)</option>
                        <option value="snd">Nivel de Sonido (snd)</option>
                        <option value="ind">Sensor Digital (ind)</option>
                        <option value="custom">-- Escribir Personalizado --</option>
                      </select>
                      {isCustomKey && (
                        <input
                          type="text"
                          value={widgetTelemetryKey}
                          onChange={(e) => setWidgetTelemetryKey(e.target.value.trim().toLowerCase())}
                          placeholder="Ej: temp, pot, vel"
                          className="form-input"
                          style={{ marginTop: '0.25rem' }}
                        />
                      )}
                    </div>
                    
                    <div style={{ gridColumn: 'span 1', fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                      Selecciona la clave con la que el Arduino está enviando este dato.
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="btn btn-secondary"
                  style={{ height: '34px' }}
                >
                  {t.widgetCancel}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ height: '34px' }}
                >
                  {editingWidgetId ? (t.widgetUpdate || 'Actualizar') : t.widgetSave}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
