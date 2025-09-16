import { create } from 'zustand'
import { SignalKey, SIGNALS, DEFAULT_TIMING, formatTime, formatClock } from '@/data/columns'
import { formatSignalValue } from '@/lib/csv'

export interface DataPoint {
  x: number; // time in milliseconds
  y: number; // signal value
}

export interface SignalState {
  id: SignalKey;
  data: DataPoint[];
  isVisible: boolean;
  order: number; // for stacking order
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
  
  // Reset action
  resetSignalToDefault: (signalId: SignalKey) => void;
  
  // Export actions
  exportRows: (selectedColumns: string[]) => Record<string, string | number | null | undefined>[];
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
            isVisible: true,
            order: nextOrder,
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
          isVisible: true,
          order: nextOrder,
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
        // Keep all control points (they stay in the background)
        // but regenerate baseline data with new duration
        newStates[typedSignalId] = {
          ...currentState,
          data: generateBaselineData(typedSignalId, seconds, get().sampleRate),
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
  
  resetSignalToDefault: (signalId) => {
    const states = get().signalStates;
    const currentState = states[signalId];
    if (!currentState) return;
    
    // Reset to baseline data
    const updatedState = {
      ...currentState,
      data: generateBaselineData(signalId, get().duration, get().sampleRate), // Reset to baseline
    };
    
    set({
      signalStates: {
        ...states,
        [signalId]: updatedState
      }
    });
  },
  
  
  
  exportRows: (selectedColumns) => {
    const { duration, sampleRate, signalStates } = get();
    const samples = Math.floor((duration * 1000) / sampleRate);
    const rows: Record<string, string | number | null | undefined>[] = [];
    
    for (let i = 0; i <= samples; i++) {
      const milliseconds = i * sampleRate;
      const row: Record<string, string | number | null | undefined> = {};
      
      // Process each selected column
      selectedColumns.forEach(columnId => {
        if (columnId === 'Time') {
          row[columnId] = formatTime(milliseconds);
        } else if (columnId === 'RelativeTimeMilliseconds') {
          row[columnId] = milliseconds;
        } else if (columnId === 'Clock') {
          row[columnId] = formatClock(DEFAULT_TIMING.startTime, milliseconds);
        } else {
          // This is a signal column
          const signalState = signalStates[columnId as SignalKey];
          if (signalState && signalState.isVisible) {
            // Find the data point for this time
            const dataPoint = signalState.data.find(point => point.x === milliseconds);
            if (dataPoint) {
              // Clamp value to signal bounds and format
              const signal = SIGNALS[columnId as SignalKey];
              const clampedValue = Math.max(signal.min, Math.min(signal.max, dataPoint.y));
              
              // Format according to signal type
              row[columnId] = formatSignalValue(clampedValue, columnId);
            } else {
              row[columnId] = null; // No data for this time point
            }
          } else {
            // Signal not active - leave as empty
            row[columnId] = null;
          }
        }
      });
      
      rows.push(row);
    }
    
    return rows;
  },
}));
