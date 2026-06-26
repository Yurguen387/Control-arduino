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
  const [draggableCardId, setDraggableCardId] = useState(null);
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
    if (window.confirm(t.msgLayoutReset || "Restaurar diseño por defecto?")) {
      const assigned = (activeLesson.recommendedWidgets || []).map((w, idx) => ({
        ...w,
        slotIndex: idx
      }));
      setWidgets(assigned);
      localStorage.setItem(`edu_layout_${activeLesson.id}`, JSON.stringify(assigned));
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
      } else if (widgetType === 'servo_knob') {
        newWidget.payload = widgetPayload || 'SERVO:';
        newWidget.currentVal = 90;
      } else if (widgetType === 'joystick') {
        newWidget.payload = widgetPayload || 'J:';
        // BUG #1 fix: telemetryKey was only in dead-code block below, moved here
        newWidget.telemetryKey = widgetTelemetryKey || 'joyx';
        newWidget.telemetryKey2 = widgetTelemetryKey2 || 'joyy';
      } else if (widgetType === 'motor') {
        newWidget.payload = widgetPayload || 'M:';
        newWidget.activeMotorDir = 'S';
      } else if (widgetType === 'gauge') {
        newWidget.telemetryKey = widgetTelemetryKey;
        newWidget.min = Number(widgetMin);
        newWidget.max = Number(widgetMax);
      } else if (widgetType === 'radar') {
        newWidget.telemetryKey = widgetTelemetryKey || 'd';
        newWidget.min = 0;
        newWidget.max = 150;
      } else if (widgetType === 'dht11') {
        newWidget.telemetryKey = widgetTelemetryKey || 'temp';
        newWidget.telemetryKey2 = widgetTelemetryKey2 || 'hum';
      } else if (widgetType === 'ir') {
        newWidget.telemetryKey = widgetTelemetryKey || 'ir';
      } else if (widgetType === 'sound') {
        newWidget.telemetryKey = widgetTelemetryKey || 'snd';
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
      if (servoAngle > 180) {
        if (servoAngle < 270) servoAngle = 180;
        else servoAngle = 0;
      }

      handleSliderChange(dialId, widget.payload, servoAngle);
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
            
            // Occupied slot (Widget)
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
                draggable={draggableCardId === widget.id}
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnWidget(e, widget)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDraggableCardId(null);
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
                  style={{ cursor: 'grab', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '4px' }}
                  onMouseEnter={() => setDraggableCardId(widget.id)}
                  onMouseLeave={() => setDraggableCardId(null)}
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
                        💡 {widget.isToggled ? 'ON' : 'OFF'} ({widget.payload})
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
                          {widget.payload}
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

                  {/* SPECIALIZED: ULTRASONIC RADAR */}
                  {widget.type === 'radar' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexGrow: 1, alignItems: 'flex-start' }}>
                        <span className="label-tape yellow" style={{ fontSize: '0.55rem' }}>
                          📡 RADAR SENSOR
                        </span>
                        {(() => {
                          const distance = telemetryData ? telemetryData[widget.telemetryKey] : null;
                          const hasAlert = distance !== null && distance < 20;
                          return (
                            <>
                              <div className={`lcd-display ${hasAlert ? 'red' : ''}`} style={{ fontSize: '1.2rem', padding: '0.3rem 0.6rem', marginTop: '0.2rem', width: '100%', justifyContent: 'center' }}>
                                {distance !== null ? `${distance} cm` : '---'}
                              </div>
                              <span style={{ fontSize: '0.6rem', color: hasAlert ? 'var(--clr-red)' : 'var(--clr-green)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                                {distance === null ? 'ESPERANDO...' : hasAlert ? '⚠️ ¡CERCANO!' : '✅ DESPEJADO'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '75px', height: '75px', position: 'relative' }}>
                        <div style={{
                          width: '70px',
                          height: '70px',
                          borderRadius: '50%',
                          background: '#012a1c',
                          border: '3px solid #0f131a',
                          overflow: 'hidden',
                          position: 'relative',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
                        }}>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50px', height: '50px', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '25px', height: '25px', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(16, 185, 129, 0.2)' }} />
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(16, 185, 129, 0.2)' }} />
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            width: '50%',
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4) 0%, transparent 100%)',
                            transformOrigin: '0% 50%',
                            animation: 'spin-clock 2.5s linear infinite',
                            pointerEvents: 'none'
                          }} />
                          {(() => {
                            const distance = telemetryData ? telemetryData[widget.telemetryKey] : null;
                            if (distance === null || distance === undefined) return null;
                            const pct = Math.min(100, Math.max(10, (distance / 150) * 100));
                            return (
                              <div style={{
                                position: 'absolute',
                                bottom: `${pct * 0.35 + 15}%`,
                                left: '50%',
                                width: '6px',
                                height: '6px',
                                background: distance < 20 ? '#ef4444' : '#10b981',
                                borderRadius: '50%',
                                transform: 'translateX(-50%)',
                                boxShadow: `0 0 6px ${distance < 20 ? '#ef4444' : '#10b981'}`,
                                animation: 'pulse-glow 1s infinite'
                              }} />
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SPECIALIZED: DHT11 CLIMATE */}
                  {widget.type === 'dht11' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className="label-tape red" style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem' }}>🌡️ TEMP</span>
                          <div className="lcd-display" style={{ minWidth: '60px', background: '#451a03', color: '#f97316', textShadow: '0 0 4px #f97316' }}>
                            {telemetryData && telemetryData[widget.telemetryKey] !== undefined ? `${telemetryData[widget.telemetryKey]}°C` : '--°C'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span className="label-tape" style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', background: '#1d4ed8' }}>💧 HUM</span>
                          <div className="lcd-display blue" style={{ minWidth: '60px' }}>
                            {telemetryData && telemetryData[widget.telemetryKey2] !== undefined ? `${telemetryData[widget.telemetryKey2]}%` : '--%'}
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '60px' }}>
                        <svg width="45" height="55" viewBox="0 0 50 60" style={{ overflow: 'visible' }}>
                          <line x1="15" y1="46" x2="15" y2="58" stroke="#cbd5e1" strokeWidth="2.5" />
                          <line x1="25" y1="46" x2="25" y2="58" stroke="#cbd5e1" strokeWidth="2.5" />
                          <line x1="35" y1="46" x2="35" y2="58" stroke="#cbd5e1" strokeWidth="2.5" />
                          <rect x="8" y="32" width="34" height="15" rx="2" fill="#1e293b" stroke="#0f131a" strokeWidth="1.5" />
                          <circle cx="34" cy="39" r="1.5" fill="#ef4444" />
                          <rect x="10" y="4" width="30" height="36" rx="3.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
                          <rect x="14" y="8" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="22" y="8" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="30" y="8" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="14" y="16" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="22" y="16" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="30" y="16" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="14" y="24" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="22" y="24" width="5" height="5" rx="1" fill="#0f172a" />
                          <rect x="30" y="24" width="5" height="5" rx="1" fill="#0f172a" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* SPECIALIZED: MOTOR DRIVER */}
                  {widget.type === 'motor' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexGrow: 1 }}>
                        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleMotorClick(widget.id, widget.payload, 'F')}
                            disabled={!isConnected}
                            className={`btn arcade-btn-push ${widget.activeMotorDir === 'F' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: 0, width: '26px', height: '26px', fontSize: '0.7rem', border: '2px solid #0f131a', borderRadius: '50%' }}
                          >
                            ▲
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleMotorClick(widget.id, widget.payload, 'L')}
                            disabled={!isConnected}
                            className={`btn arcade-btn-push ${widget.activeMotorDir === 'L' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: 0, width: '26px', height: '26px', fontSize: '0.7rem', border: '2px solid #0f131a', borderRadius: '50%' }}
                          >
                            ◀
                          </button>
                          <button 
                            onClick={() => handleMotorClick(widget.id, widget.payload, 'S')}
                            disabled={!isConnected}
                            className={`btn arcade-btn-push ${widget.activeMotorDir === 'S' || !widget.activeMotorDir ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: 0, width: '26px', height: '26px', fontSize: '0.7rem', border: '2px solid #0f131a', borderRadius: '50%', background: 'var(--clr-red)' }}
                          >
                            ■
                          </button>
                          <button 
                            onClick={() => handleMotorClick(widget.id, widget.payload, 'R')}
                            disabled={!isConnected}
                            className={`btn arcade-btn-push ${widget.activeMotorDir === 'R' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: 0, width: '26px', height: '26px', fontSize: '0.7rem', border: '2px solid #0f131a', borderRadius: '50%' }}
                          >
                            ▶
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleMotorClick(widget.id, widget.payload, 'B')}
                            disabled={!isConnected}
                            className={`btn arcade-btn-push ${widget.activeMotorDir === 'B' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: 0, width: '26px', height: '26px', fontSize: '0.7rem', border: '2px solid #0f131a', borderRadius: '50%' }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '75px', height: '75px' }}>
                        {(() => {
                          const isSpinning = widget.activeMotorDir && widget.activeMotorDir !== 'S';
                          const spinDir = widget.activeMotorDir || 'R';
                          return (
                            <svg width="75" height="75" viewBox="0 0 85 70" style={{ overflow: 'visible' }}>
                              <rect x="5" y="20" width="38" height="28" rx="4" fill="#f59e0b" stroke="#0f131a" strokeWidth="2" />
                              <rect x="43" y="24" width="10" height="20" rx="2" fill="#cbd5e1" stroke="#0f131a" strokeWidth="1.5" />
                              <g style={{
                                transformOrigin: '23px 34px',
                                animation: isSpinning ? `${spinDir === 'R' || spinDir === 'F' ? 'spin-clock' : 'spin-counter'} 0.5s linear infinite` : 'none'
                              }}>
                                <circle cx="23" cy="34" r="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                                <circle cx="23" cy="34" r="23" fill="none" stroke="#0f131a" strokeWidth="6" />
                                <circle cx="23" cy="34" r="20" fill="none" stroke="#4b5563" strokeWidth="2.5" />
                                <circle cx="23" cy="34" r="16" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                                <line x1="23" y1="18" x2="23" y2="50" stroke="#d97706" strokeWidth="2.5" />
                                <line x1="7" y1="34" x2="39" y2="34" stroke="#d97706" strokeWidth="2.5" />
                              </g>
                            </svg>
                          );
                        })()}
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
                                {isPhysical ? 'Modo: FÍSICO' : `Prefijo: ${widget.payload}`}
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

                  {/* SPECIALIZED: IR DETECTOR */}
                  {widget.type === 'ir' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                        {(() => {
                          const obstacleVal = telemetryData ? telemetryData[widget.telemetryKey] : 0;
                          const active = obstacleVal === 1;
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: active ? 'var(--clr-red)' : '#1e293b',
                                  border: '2px solid #0f131a',
                                  boxShadow: active ? '0 0 8px var(--clr-red)' : 'none',
                                  transition: 'all 0.2s'
                                }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? 'var(--clr-red)' : 'var(--txt-muted)' }}>
                                  {active ? '¡OBSTÁCULO!' : 'LIBRE'}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--txt-muted)', alignSelf: 'center' }}>Clave: {widget.telemetryKey}</span>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '55px', height: '60px' }}>
                        {(() => {
                          const obstacleVal = telemetryData ? telemetryData[widget.telemetryKey] : 0;
                          const active = obstacleVal === 1;
                          return (
                            <svg width="55" height="60" viewBox="0 0 50 60" style={{ overflow: 'visible' }}>
                              {active && (
                                <g opacity="0.85">
                                  <path d="M 17,2 Q 25,-12 33,2" fill="none" stroke="var(--clr-red)" strokeWidth="1.5" strokeDasharray="2,2" className="animate-pulse" />
                                  <path d="M 12,-2 Q 25,-20 38,-2" fill="none" stroke="var(--clr-red)" strokeWidth="1.2" opacity="0.7" />
                                </g>
                              )}
                              <rect x="13" y="14" width="24" height="42" rx="2.5" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
                              <rect x="20" y="26" width="10" height="10" fill="#2563eb" rx="0.5" />
                              <circle cx="25" cy="31" r="2" fill="#ffe870" />
                              <rect x="16" y="42" width="6" height="10" fill="#1e293b" />
                              <line x1="21" y1="56" x2="21" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                              <line x1="25" y1="56" x2="25" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                              <line x1="29" y1="56" x2="29" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                              <rect x="15" y="6" width="6" height="8" rx="1.5" fill="#60a5fa" stroke="#93c5fd" strokeWidth="0.5" />
                              <line x1="17" y1="14" x2="17" y2="10" stroke="#94a3b8" strokeWidth="1" />
                              <line x1="19" y1="14" x2="19" y2="10" stroke="#94a3b8" strokeWidth="1" />
                              <rect x="29" y="6" width="6" height="8" rx="1.5" fill="#1e293b" stroke="#111827" strokeWidth="0.5" />
                              <line x1="31" y1="14" x2="31" y2="10" stroke="#94a3b8" strokeWidth="1" />
                              <line x1="33" y1="14" x2="33" y2="10" stroke="#94a3b8" strokeWidth="1" />
                              <circle cx="18" cy="20" r="1.5" fill="#10b981" />
                              <circle cx="32" cy="20" r="1.5" fill={active ? "#ef4444" : "#4b5563"} />
                            </svg>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* SPECIALIZED: SOUND VU LOUDNESS */}
                  {widget.type === 'sound' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      {(() => {
                        const volume = telemetryData && telemetryData[widget.telemetryKey] !== undefined 
                          ? telemetryData[widget.telemetryKey] 
                          : 0;
                        const activeSegments = Math.round((volume / 100) * 8);
                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                              <div style={{ display: 'flex', gap: '3px', width: '100%', height: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px' }}>
                                {[...Array(8)].map((_, i) => {
                                  const isActive = i < activeSegments;
                                  let color = 'rgba(255,255,255,0.05)';
                                  if (isActive) {
                                    if (i < 4) color = 'var(--clr-green)';
                                    else if (i < 6) color = 'var(--clr-yellow)';
                                    else color = 'var(--clr-red)';
                                  }
                                  return (
                                    <div 
                                      key={i} 
                                      style={{ 
                                        flexGrow: 1, 
                                        background: color, 
                                        borderRadius: '1.5px',
                                        boxShadow: isActive ? `0 0 4px ${color}` : 'none',
                                        transition: 'background 0.1s ease'
                                      }} 
                                    />
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--txt-muted)' }}>
                                <span>Micrófono ({widget.telemetryKey})</span>
                                <b style={{ color: accentColor }}>{volume} %</b>
                              </div>
                            </div>
                            
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '55px', height: '60px' }}>
                              <svg width="55" height="60" viewBox="0 0 50 60" style={{ overflow: 'visible' }}>
                                {volume > 15 && (
                                  <g>
                                    <path d="M 16,0 A 10,10 0 0,1 34,0" fill="none" stroke="var(--clr-red)" strokeWidth="1.5" className="animate-pulse" />
                                    {volume > 40 && (
                                      <path d="M 11,-4 A 15,15 0 0,1 39,-4" fill="none" stroke="var(--clr-red)" strokeWidth="1.2" opacity="0.8" className="animate-pulse" />
                                    )}
                                  </g>
                                )}
                                <rect x="13" y="14" width="24" height="42" rx="2.5" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1.5" />
                                <line x1="18" y1="56" x2="18" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                                <line x1="22" y1="56" x2="22" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                                <line x1="26" y1="56" x2="26" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                                <line x1="30" y1="56" x2="30" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                                <rect x="20" y="26" width="10" height="10" fill="#2563eb" rx="0.5" />
                                <circle cx="25" cy="31" r="2" fill="#ffe870" />
                                <rect x="15" y="4" width="20" height="10" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                                <ellipse cx="25" cy="4" rx="10" ry="2" fill="#1e293b" />
                                <line x1="20" y1="14" x2="20" y2="11" stroke="#cbd5e1" strokeWidth="1" />
                                <line x1="30" y1="14" x2="30" y2="11" stroke="#cbd5e1" strokeWidth="1" />
                                <rect x="16" y="42" width="6" height="8" fill="#1e293b" />
                                <circle cx="18" cy="20" r="1.5" fill="#10b981" />
                                <circle cx="32" cy="20" r="1.5" fill={volume > 30 ? "#ef4444" : "#4b5563"} />
                              </svg>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* SPECIALIZED: SERVO RADIAL KNOB */}
                  {widget.type === 'servo_knob' && (
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexGrow: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>Servo SG90</span>
                        <b style={{ color: accentColor, fontSize: '1.2rem', textShadow: `0 0 6px ${accentColor}` }}>
                          {widget.currentVal !== undefined ? `${widget.currentVal}°` : '90°'}
                        </b>
                        <span style={{ fontSize: '0.65rem', color: 'var(--txt-muted)' }}>Arrastra el aspa</span>
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
                          <path d="M 42.5,70 Q 30,85 20,80" fill="none" stroke="#78350f" strokeWidth="1.5" />
                          <path d="M 42.5,70 Q 35,88 28,83" fill="none" stroke="#dc2626" strokeWidth="1.5" />
                          <path d="M 42.5,70 Q 40,90 35,85" fill="none" stroke="#f97316" strokeWidth="1.5" />
                          <rect x="35" y="10" width="15" height="65" rx="2.5" fill="#1d4ed8" stroke="#1e40af" strokeWidth="1" />
                          <circle cx="42.5" cy="15" r="2.5" fill="#0f172a" />
                          <circle cx="42.5" cy="70" r="2.5" fill="#0f172a" />
                          <rect x="25" y="22" width="35" height="40" rx="3.5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                          <rect x="29" y="36" width="27" height="15" rx="1" fill="#fff" opacity="0.9" />
                          <text x="42.5" y="45" fill="#1e3a8a" fontSize="5" fontWeight="bold" textAnchor="middle">SG90</text>
                          <rect x="29" y="47" width="27" height="2" fill="#dc2626" />
                          <circle cx="42.5" cy="33" r="10" fill="#1d4ed8" />
                          <circle cx="42.5" cy="33" r="6" fill="#ffe870" />
                        </svg>

                        <div 
                          style={{
                            width: '50px',
                            height: '14px',
                            position: 'absolute',
                            top: '26px', 
                            left: '42.5px',
                            transformOrigin: '7px 7px',
                            transform: `translate(-7px, -7px) rotate(${
                              (widget.currentVal !== undefined ? widget.currentVal : 90)
                            }deg)`,
                            transition: 'transform 0.1s ease',
                            pointerEvents: 'none'
                          }}
                        >
                          <svg width="50" height="14" viewBox="0 0 50 14" style={{ overflow: 'visible' }}>
                            <path d="M7,2 L42,4 A3,3 0 0 1 42,10 L7,12 A7,7 0 0 1 7,2 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
                            <circle cx="7" cy="7" r="3.5" fill="#cbd5e1" />
                            <circle cx="18" cy="7" r="1.5" fill="#64748b" />
                            <circle cx="28" cy="7" r="1.5" fill="#64748b" />
                            <circle cx="38" cy="7" r="1.5" fill="#64748b" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

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
                    } else if (type === 'servo_knob') {
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
                    } else if (type === 'motor') {
                      setWidgetIcon('sliders');
                      setWidgetColor('var(--clr-yellow)');
                      setWidgetPayload('M:');
                    } else if (type === 'radar') {
                      setWidgetIcon('activity');
                      setWidgetColor('var(--clr-cyan)');
                      setWidgetTelemetryKey('d');
                    } else if (type === 'dht11') {
                      setWidgetIcon('thermometer');
                      setWidgetColor('var(--clr-blue)');
                      setWidgetTelemetryKey('temp');
                      setWidgetTelemetryKey2('hum');
                    } else if (type === 'ir') {
                      setWidgetIcon('navigation');
                      setWidgetColor('var(--clr-red)');
                      setWidgetTelemetryKey('ir');
                    } else if (type === 'sound') {
                      setWidgetIcon('volume2');
                      setWidgetColor('var(--clr-yellow)');
                      setWidgetTelemetryKey('snd');
                    }
                  }}
                  className="form-input"
                >
                  <option value="button">{t.typeButton}</option>
                  <option value="toggle">{t.typeToggle}</option>
                  <option value="slider">{t.typeSlider}</option>
                  <option value="servo_knob">{t.typeServoKnob}</option>
                  <option value="joystick">{t.typeJoystick}</option>
                  <option value="gauge">{t.typeGauge}</option>
                  <option value="chart">{t.typeChart}</option>
                  <option value="motor">{t.typeMotorDriver}</option>
                  <option value="radar">{t.typeRadar}</option>
                  <option value="dht11">{t.typeDHT11}</option>
                  <option value="ir">{t.typeIRIndicator}</option>
                  <option value="sound">{t.typeSoundVU}</option>
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
              {(widgetType === 'button' || widgetType === 'toggle' || widgetType === 'slider' || widgetType === 'servo_knob' || widgetType === 'joystick' || widgetType === 'motor') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
                    {widgetType === 'slider' || widgetType === 'servo_knob' || widgetType === 'joystick' || widgetType === 'motor'
                      ? 'Prefijo de comando (ej: SERVO:, J:, M:)'
                      : t.widgetPayload}
                  </label>
                  <input
                    type="text"
                    value={widgetPayload}
                    onChange={(e) => setWidgetPayload(e.target.value)}
                    placeholder={t.widgetPayloadPlaceholder}
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                    {widgetType === 'slider' || widgetType === 'servo_knob' || widgetType === 'joystick' || widgetType === 'motor'
                      ? t.helpPayloadPrefix
                      : t.helpPayload}
                  </span>
                </div>
              )}

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
              {(widgetType === 'slider' || widgetType === 'gauge' || widgetType === 'radar') && (
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
              {(widgetType === 'gauge' || widgetType === 'chart' || widgetType === 'radar' || widgetType === 'dht11' || widgetType === 'ir' || widgetType === 'sound') && (
                <div style={{ display: 'grid', gridTemplateColumns: widgetType === 'dht11' ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
                      {widgetType === 'dht11' ? 'Clave Temperatura' : t.widgetTelemetryKey}
                    </label>
                    <input
                      type="text"
                      value={widgetTelemetryKey}
                      onChange={(e) => setWidgetTelemetryKey(e.target.value.trim().toLowerCase())}
                      placeholder="Ej: pot, temp, d"
                      className="form-input"
                    />
                  </div>
                  
                  {widgetType === 'dht11' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>Clave Humedad</label>
                      <input
                        type="text"
                        value={widgetTelemetryKey2}
                        onChange={(e) => setWidgetTelemetryKey2(e.target.value.trim().toLowerCase())}
                        placeholder="Ej: hum"
                        className="form-input"
                      />
                    </div>
                  )}

                  <div style={{ gridColumn: widgetType === 'dht11' ? 'span 2' : 'span 1', fontSize: '0.7rem', color: 'var(--txt-muted)', marginTop: '0.15rem', lineHeight: '1.3' }}>
                    {t.helpTelemetryKey}
                  </div>
                </div>
              )}

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
