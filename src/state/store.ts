import { create } from 'zustand'
import { SignalKey, SIGNALS, DEFAULT_TIMING } from '@/data/columns'

export interface DataPoint {
  x: number; // time in milliseconds
  y: number; // signal value
  isControlPoint?: boolean; // marks this as a user-editable control point
}

export interface SignalState {
  id: SignalKey;
  data: DataPoint[];
  controlPoints: DataPoint[]; // separate array for control points
  isVisible: boolean;
  order: number; // for stacking order
  zoom: {
    scale: 'full' | '5s' | '30s' | '5m' | '10m'; // zoom preset
    startTime: number; // start time in seconds for current view
    endTime: number; // end time in seconds for current view
  };
}

export interface ScenarioStore {
  // Selected signals (from sidebar)
  selectedSignals: SignalKey[];
  
  // Signal data and states
  signalStates: Partial<Record<SignalKey, SignalState>>;
  
  // Timing configuration
  duration: number; // seconds (default 1800 = 30 min)
  sampleRate: number; // milliseconds (default 1000 = 1Hz)
  
  // Actions
  setSelectedSignals: (signals: SignalKey[]) => void;
  initializeSignal: (signalId: SignalKey) => void;
  updateSignalData: (signalId: SignalKey, data: DataPoint[]) => void;
  toggleSignalVisibility: (signalId: SignalKey) => void;
  setDuration: (seconds: number) => void;
  setSampleRate: (ms: number) => void;
  
  // Control point actions
  addControlPoint: (signalId: SignalKey, point: DataPoint) => void;
  moveControlPoint: (signalId: SignalKey, pointIndex: number, newPoint: DataPoint) => void;
  deleteControlPoint: (signalId: SignalKey, pointIndex: number) => void;
  regenerateSignalFromControlPoints: (signalId: SignalKey) => void;
  resetSignalToDefault: (signalId: SignalKey) => void;
  
  // Zoom actions
  setSignalZoom: (signalId: SignalKey, scale: 'full' | '5s' | '30s' | '5m' | '10m', startTime?: number) => void;
}

// Generate baseline data for a signal
function generateBaselineData(signalId: SignalKey, duration: number, sampleRate: number): DataPoint[] {
  const signal = SIGNALS[signalId];
  if (!signal) return [];
  
  const samples = Math.floor((duration * 1000) / sampleRate);
  const data: DataPoint[] = [];
  
  for (let i = 0; i <= samples; i++) {
    const x = i * sampleRate;
    // Start with baseline value, could add slight variation later
    const y = signal.def;
    data.push({ x, y });
  }
  
  return data;
}

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  selectedSignals: [],
  signalStates: {},
  duration: DEFAULT_TIMING.durationMinutes * 60, // 30 minutes in seconds
  sampleRate: DEFAULT_TIMING.sampleRateMs, // 1000ms = 1Hz
  
  setSelectedSignals: (signals) => {
    const currentSignals = get().selectedSignals;
    const currentStates = get().signalStates;
    let nextOrder = Math.max(...Object.values(currentStates).map(s => s.order), 0);
    
    // Initialize new signals
    const newStates = { ...currentStates };
    signals.forEach(signalId => {
      if (!currentSignals.includes(signalId)) {
        // New signal - initialize it
        if (!newStates[signalId]) {
          nextOrder++;
          newStates[signalId] = {
            id: signalId,
            data: generateBaselineData(signalId, get().duration, get().sampleRate),
            controlPoints: [], // Initialize with empty control points
            isVisible: true,
            order: nextOrder,
            zoom: {
              scale: 'full',
              startTime: 0,
              endTime: get().duration,
            }
          };
        } else {
          // Signal was previously created but deselected - make it visible
          newStates[signalId].isVisible = true;
        }
      }
    });
    
    // Hide deselected signals (but preserve their data)
    currentSignals.forEach(signalId => {
      if (!signals.includes(signalId) && newStates[signalId]) {
        newStates[signalId].isVisible = false;
      }
    });
    
    set({
      selectedSignals: signals,
      signalStates: newStates
    });
  },
  
  initializeSignal: (signalId) => {
    const states = get().signalStates;
    if (states[signalId]) return; // Already exists
    
    const nextOrder = Math.max(...Object.values(states).map(s => s.order), 0) + 1;
    
    set({
      signalStates: {
        ...states,
        [signalId]: {
          id: signalId,
          data: generateBaselineData(signalId, get().duration, get().sampleRate),
          controlPoints: [], // Initialize with empty control points
          isVisible: true,
          order: nextOrder,
          zoom: {
            scale: 'full',
            startTime: 0,
            endTime: get().duration,
          }
        }
      }
    });
  },
  
  updateSignalData: (signalId, data) => {
    const states = get().signalStates;
    if (!states[signalId]) return;
    
    set({
      signalStates: {
        ...states,
        [signalId]: {
          ...states[signalId],
          data
        }
      }
    });
  },
  
  toggleSignalVisibility: (signalId) => {
    const states = get().signalStates;
    if (!states[signalId]) return;
    
    set({
      signalStates: {
        ...states,
        [signalId]: {
          ...states[signalId],
          isVisible: !states[signalId].isVisible
        }
      }
    });
  },
  
  setDuration: (seconds) => {
    set({ duration: seconds });
    
    // Regenerate all signal data with new duration
    const states = get().signalStates;
    const newStates: Partial<Record<SignalKey, SignalState>> = {};
    
    Object.keys(states).forEach(signalId => {
      const typedSignalId = signalId as SignalKey;
      const currentState = states[typedSignalId];
      if (currentState) {
        newStates[typedSignalId] = {
          ...currentState,
          data: generateBaselineData(typedSignalId, seconds, get().sampleRate)
        };
      }
    });
    
    set({ signalStates: newStates });
  },
  
  setSampleRate: (ms) => {
    set({ sampleRate: ms });
    
    // Regenerate all signal data with new sample rate
    const states = get().signalStates;
    const newStates: Partial<Record<SignalKey, SignalState>> = {};
    
    Object.keys(states).forEach(signalId => {
      const typedSignalId = signalId as SignalKey;
      const currentState = states[typedSignalId];
      if (currentState) {
        newStates[typedSignalId] = {
          ...currentState,
          data: generateBaselineData(typedSignalId, get().duration, ms)
        };
      }
    });
    
    set({ signalStates: newStates });
  },
  
  // Control point methods
  addControlPoint: (signalId, point) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState) return;
    
    // Constrain the point to signal bounds
    const signal = SIGNALS[signalId];
    const constrainedPoint = {
      ...point,
      y: Math.max(signal.min, Math.min(signal.max, point.y)),
      x: Math.max(0, Math.min(get().duration * 1000, point.x)),
    };
    
    // Insert in chronological order
    const newControlPoints = [...currentState.controlPoints, constrainedPoint]
      .sort((a, b) => a.x - b.x);
    
    const updatedState = {
      ...currentState,
      controlPoints: newControlPoints,
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
    
    // Regenerate signal data from control points
    get().regenerateSignalFromControlPoints(signalId);
  },
  
  moveControlPoint: (signalId, pointIndex, newPoint) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState || !currentState.controlPoints[pointIndex]) return;
    
    const signal = SIGNALS[signalId];
    const constrainedPoint = {
      ...newPoint,
      y: Math.max(signal.min, Math.min(signal.max, newPoint.y)),
      x: Math.max(0, Math.min(get().duration * 1000, newPoint.x)),
    };
    
    const newControlPoints = [...currentState.controlPoints];
    newControlPoints[pointIndex] = constrainedPoint;
    
    // Re-sort in chronological order
    newControlPoints.sort((a, b) => a.x - b.x);
    
    const updatedState = {
      ...currentState,
      controlPoints: newControlPoints,
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
    
    // Regenerate signal data from control points
    get().regenerateSignalFromControlPoints(signalId);
  },
  
  deleteControlPoint: (signalId, pointIndex) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState || !currentState.controlPoints[pointIndex]) return;
    
    const newControlPoints = currentState.controlPoints.filter((_, index) => index !== pointIndex);
    
    const updatedState = {
      ...currentState,
      controlPoints: newControlPoints,
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
    
    // Regenerate signal data from control points
    get().regenerateSignalFromControlPoints(signalId);
  },
  
  regenerateSignalFromControlPoints: (signalId) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState) return;
    
    const signal = SIGNALS[signalId];
    const { controlPoints } = currentState;
    const { duration, sampleRate } = get();
    
    // Generate interpolated data
    const samples = Math.floor((duration * 1000) / sampleRate);
    const newData: DataPoint[] = [];
    
    for (let i = 0; i <= samples; i++) {
      const x = i * sampleRate;
      let y = signal.def; // Default value
      
      if (controlPoints.length === 0) {
        // No control points - use baseline
        y = signal.def;
      } else if (controlPoints.length === 1) {
        // Single control point - use that value
        y = controlPoints[0].y;
      } else {
        // Multiple control points - interpolate
        y = interpolateValue(x, controlPoints, signal.def);
      }
      
      newData.push({ x, y });
    }
    
    const updatedState = {
      ...currentState,
      data: newData,
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
  },
  
  resetSignalToDefault: (signalId) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState) return;
    
    // Clear all control points and regenerate baseline data
    const updatedState = {
      ...currentState,
      controlPoints: [], // Clear all control points
      data: generateBaselineData(signalId, get().duration, get().sampleRate), // Reset to baseline
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
  },
  
  setSignalZoom: (signalId, scale, startTime) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState) return;
    
    const duration = get().duration;
    let newStartTime = startTime ?? 0;
    let newEndTime = duration;
    
    // Calculate time ranges based on scale
    switch (scale) {
      case '5s':
        newEndTime = Math.min(newStartTime + 5, duration);
        break;
      case '30s':
        newEndTime = Math.min(newStartTime + 30, duration);
        break;
      case '5m':
        newEndTime = Math.min(newStartTime + 300, duration); // 5 minutes = 300 seconds
        break;
      case '10m':
        newEndTime = Math.min(newStartTime + 600, duration); // 10 minutes = 600 seconds
        break;
      case 'full':
      default:
        newStartTime = 0;
        newEndTime = duration;
        break;
    }
    
    // Ensure we don't exceed bounds
    if (newEndTime > duration) {
      newEndTime = duration;
      if (scale !== 'full') {
        const scaleSeconds = scale === '5s' ? 5 : scale === '30s' ? 30 : scale === '5m' ? 300 : 600;
        newStartTime = Math.max(0, newEndTime - scaleSeconds);
      }
    }
    
    const updatedState = {
      ...currentState,
      zoom: {
        scale,
        startTime: newStartTime,
        endTime: newEndTime,
      }
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
  },
}));

// Helper function for linear interpolation between control points
function interpolateValue(x: number, controlPoints: DataPoint[], defaultValue: number): number {
  // Find the two control points that bracket this x value
  const sortedPoints = [...controlPoints].sort((a, b) => a.x - b.x);
  
  // Before first control point
  if (x <= sortedPoints[0].x) {
    return sortedPoints[0].y;
  }
  
  // After last control point
  if (x >= sortedPoints[sortedPoints.length - 1].x) {
    return sortedPoints[sortedPoints.length - 1].y;
  }
  
  // Between control points - linear interpolation
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const p1 = sortedPoints[i];
    const p2 = sortedPoints[i + 1];
    
    if (x >= p1.x && x <= p2.x) {
      // Linear interpolation formula
      const ratio = (x - p1.x) / (p2.x - p1.x);
      return p1.y + ratio * (p2.y - p1.y);
    }
  }
  
  return defaultValue;
}
