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
          } else if (widgetType === 'knob') {
            baseWidget.payload = widgetPayload || 'SERVO:';
          } else if (widgetType === 'joystick') {
            baseWidget.payload = widgetPayload || 'J:';
          }  else if (widgetType === 'gauge') {
            baseWidget.telemetryKey = widgetTelemetryKey;
            baseWidget.min = Number(widgetMin);
            baseWidget.max = Number(widgetMax);
          } else if (widgetType === 'radar') {
            baseWidget.telemetryKey = widgetTelemetryKey || 'd';
            baseWidget.min = 0;
            baseWidget.max = 150;
          } else if (false) { } else {
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
      } else if (false) { } else {
                          const pos = joystickRefs.current[widget.id] || { x: 0, y: 0 };
                          posX = pos.x;
                          posY = pos.y;
                          labelX = Math.round((pos.x / 45) * 100);
                          labelY = Math.round(-(pos.y / 45) * 100);
                        }

                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                              <span className="label-tape" style={{ fontSize: '0.55rem' }}> JOYSTICK XY</span>
                              <div className="lcd-display" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', marginTop: '0.1rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', minWidth: '75px' }}>
                                <div>X: {labelX}</div>
                                <div>Y: {labelY}</div>
                              </div>
                              <span style={{ fontSize: '0.55rem', color: 'var(--txt-muted)' }}>
                                {isPhysical ? 'Modo: FÍSICO' : ` ${widget.payload}${labelX},${labelY}`}
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

                                    {/* SPECIALIZED: DIGITAL INDICATOR */}
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

                  

                  {/* SPECIALIZED: RADIAL KNOB (POTENTIOMETER) */}
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
                        <b style={{ color: accentColor, fontSize: '1.2rem' }}>
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
                          {/* 3 Pins at bottom */}
                          <rect x="27" y="65" width="5" height="20" fill="#94a3b8" rx="1" />
                          <rect x="40" y="65" width="5" height="20" fill="#94a3b8" rx="1" />
                          <rect x="53" y="65" width="5" height="20" fill="#94a3b8" rx="1" />
                          
                          {/* Main Body */}
                          <circle cx="42.5" cy="42.5" r="32" fill="#0f172a" stroke="#1d4ed8" strokeWidth="2" />
                          <circle cx="42.5" cy="42.5" r="26" fill="#1e293b" />
                          <circle cx="42.5" cy="42.5" r="18" fill="#334155" />
                          
                          {/* Threading on shaft (decorative) */}
                          <circle cx="42.5" cy="42.5" r="12" fill="transparent" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />

                          {/* Scale marks */}
                          {[...Array(9)].map((_, i) => (
                             <circle 
                               key={i}
                               cx={42.5 + 28 * Math.cos((-225 + i * 33.75) * Math.PI / 180)}
                               cy={42.5 + 28 * Math.sin((-225 + i * 33.75) * Math.PI / 180)}
                               r="1.5"
                               fill="#64748b"
                             />
                          ))}
                        </svg>

                        {/* Knob indicator */}
                        <div 
                          style={{
                            width: '8px',
                            height: '24px',
                            position: 'absolute',
                            top: '18.5px', 
                            left: '38.5px',
                            transformOrigin: '4px 24px', // Pivot at 42.5, 42.5
                            transform: `rotate(${rotation}deg)`,
                            transition: 'transform 0.1s ease',
                            pointerEvents: 'none',
                            background: accentColor,
                            borderRadius: '4px'
                          }}
                        />
                        <div 
                          style={{
                            width: '12px',
                            height: '12px',
                            position: 'absolute',
                            top: '36.5px', 
                            left: '36.5px',
                            borderRadius: '50%',
                            background: '#0f172a',
                            pointerEvents: 'none'
                          }}
                        />
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
                    }    else if (type === 'indicator') {
                      setWidgetIcon('navigation');
                      setWidgetColor('var(--clr-red)');
                      setWidgetTelemetryKey('ir');
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

              {/* Action specific inputs (Outputs) */}
              {(() => {
                const isOutput = ['button', 'toggle', 'slider', 'knob', 'joystick'].includes(widgetType);
                if (!isOutput) return null;

                let options = [];
                if (widgetType === 'indicator') {
                  options = [{ value: 'ind', label: 'Indicador Digital (0/1)' }];
                } else {
                  options = [
                    { value: 'temp', label: 'Temperatura (°C)' },
                    { value: 'hum', label: 'Humedad (%)' },
                    { value: 'pot', label: 'Potenciómetro (0-1023)' },
                    { value: 'd', label: 'Distancia Ultrasonido (cm)' }
                  ];
                }

                let currentVal = widgetTelemetryKey;
                if (false) { } else {
                              setWidgetTelemetryKey(val);
                            }
                          }
                        }}
                        className="form-input"
                      >
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        <option value="custom">Personalizado...</option>
                      </select>
                    </div>

                    {!isPreset && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--clr-cyan)' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)' }}>Clave de Dato Personalizada</label>
                        <input
                          type="text"
                          value={widgetTelemetryKey}
                          onChange={(e) => setWidgetTelemetryKey(e.target.value.trim().toLowerCase())}
                          placeholder="Ej: my_sensor"
                          className="form-input"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                        />
                        
                              placeholder="Ej: hum"
                              className="form-input"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                            />
                          </>
                        )}
                      </div>
                    )}
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
