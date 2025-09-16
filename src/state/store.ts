import { create } from 'zustand'
import { SignalKey, SIGNALS, DEFAULT_TIMING, formatTime, formatClock } from '@/data/columns'
import { formatSignalValue } from '@/lib/csv'

export interface DataPoint {
  x: number; // time in milliseconds
  y: number; // signal value
  isUserModified?: boolean; // tracks if this point was manually edited by user
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
  
  // Global zoom sync
  globalZoomSync: boolean;
  globalZoomState: { min: number; max: number } | null;
  
  // Actions
  setSelectedSignals: (signals: SignalKey[]) => void;
  initializeSignal: (signalId: SignalKey) => void;
  updateSignalData: (signalId: SignalKey, data: DataPoint[]) => void;
  toggleSignalVisibility: (signalId: SignalKey) => void;
  setDuration: (seconds: number) => void;
  setSampleRate: (ms: number) => void;
  setGlobalZoomSync: (enabled: boolean) => void;
  setGlobalZoomState: (zoomState: { min: number; max: number } | null) => void;
  
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
  globalZoomSync: false,
  globalZoomState: null,
  
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
    
    // Preserve existing signal data and only extend/truncate based on new duration
    const states = get().signalStates;
    const newStates: Partial<Record<SignalKey, SignalState>> = {};
    const sampleRate = get().sampleRate;
    const newSamples = Math.floor((seconds * 1000) / sampleRate);
    
    Object.keys(states).forEach(signalId => {
      const typedSignalId = signalId as SignalKey;
      const currentState = states[typedSignalId];
      if (currentState) {
        const signal = SIGNALS[typedSignalId];
        if (!signal) return;
        
        const existingData = [...currentState.data];
        const newData: DataPoint[] = [];
        
        // Copy existing data points that fit within the new duration
        for (let i = 0; i <= newSamples; i++) {
          const targetTime = i * sampleRate;
          const existingPoint = existingData.find(point => point.x === targetTime);
          
          if (existingPoint) {
            // Use existing data point (preserves user modifications)
            newData.push({ ...existingPoint });
          } else {
            // Create new baseline point for times that didn't exist before
            newData.push({ 
              x: targetTime, 
              y: signal.def,
              isUserModified: false 
            });
          }
        }
        
        // Apply cascading effects to any new points added when duration increased
        // Find the last user-modified point in the existing data
        const existingMaxTime = Math.max(...existingData.map(p => p.x));
        const lastModifiedPoint = existingData
          .filter(point => point.isUserModified && point.x <= existingMaxTime)
          .sort((a, b) => b.x - a.x)[0]; // Get the rightmost modified point
        
        if (lastModifiedPoint && newSamples * sampleRate > existingMaxTime) {
          // Duration was increased - apply cascading to new points
          const deltaY = lastModifiedPoint.y - signal.def; // Difference from baseline
          
          // Find if there are any other modified points after the last one (there shouldn't be, but check)
          const hasModifiedAfter = existingData.some(point => 
            point.x > lastModifiedPoint.x && point.isUserModified
          );
          
          if (!hasModifiedAfter && deltaY !== 0) {
            // Apply the delta to all new points beyond the existing duration
            for (let i = 0; i < newData.length; i++) {
              const point = newData[i];
              if (point.x > existingMaxTime && !point.isUserModified) {
                const cascadedValue = signal.def + deltaY;
                const constrainedValue = Math.max(signal.min, Math.min(signal.max, cascadedValue));
                newData[i] = {
                  ...point,
                  y: constrainedValue
                };
              }
            }
          }
        }
        
        newStates[typedSignalId] = {
          ...currentState,
          data: newData
        };
      }
    });
    
    set({ signalStates: newStates });
  },
  
  setSampleRate: (ms) => {
    set({ sampleRate: ms });
    
    // Preserve existing signal data and interpolate for new sample rate
    const states = get().signalStates;
    const newStates: Partial<Record<SignalKey, SignalState>> = {};
    const duration = get().duration;
    const newSamples = Math.floor((duration * 1000) / ms);
    
    Object.keys(states).forEach(signalId => {
      const typedSignalId = signalId as SignalKey;
      const currentState = states[typedSignalId];
      if (currentState) {
        const signal = SIGNALS[typedSignalId];
        if (!signal) return;
        
        const existingData = [...currentState.data];
        const newData: DataPoint[] = [];
        
        // Create new data points at the new sample rate
        for (let i = 0; i <= newSamples; i++) {
          const targetTime = i * ms;
          
          // Find closest existing data point
          const exactMatch = existingData.find(point => point.x === targetTime);
          if (exactMatch) {
            // Use exact match (preserves user modifications)
            newData.push({ ...exactMatch });
          } else {
            // Find the two closest points for interpolation
            const beforePoint = existingData
              .filter(point => point.x < targetTime)
              .sort((a, b) => b.x - a.x)[0]; // Closest before
            const afterPoint = existingData
              .filter(point => point.x > targetTime)
              .sort((a, b) => a.x - b.x)[0]; // Closest after
            
            let interpolatedValue = signal.def;
            let isModified = false;
            
            if (beforePoint && afterPoint) {
              // Linear interpolation between two points
              const timeDiff = afterPoint.x - beforePoint.x;
              const valueDiff = afterPoint.y - beforePoint.y;
              const timeFactor = (targetTime - beforePoint.x) / timeDiff;
              interpolatedValue = beforePoint.y + (valueDiff * timeFactor);
              
              // Consider it modified if either surrounding point was modified
              isModified = beforePoint.isUserModified || afterPoint.isUserModified || false;
            } else if (beforePoint) {
              // Use the last known value
              interpolatedValue = beforePoint.y;
              isModified = beforePoint.isUserModified || false;
            } else if (afterPoint) {
              // Use the first known value
              interpolatedValue = afterPoint.y;
              isModified = afterPoint.isUserModified || false;
            }
            
            newData.push({ 
              x: targetTime, 
              y: interpolatedValue,
              isUserModified: isModified
            });
          }
        }
        
        newStates[typedSignalId] = {
          ...currentState,
          data: newData
        };
      }
    });
    
    set({ signalStates: newStates });
  },
  
  setGlobalZoomSync: (enabled) => {
    set({ globalZoomSync: enabled });
  },
  
  setGlobalZoomState: (zoomState) => {
    set({ globalZoomState: zoomState });
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
