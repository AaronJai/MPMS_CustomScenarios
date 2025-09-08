// Single source of truth for UQ headers + basic signal meta

export const UQ_HEADERS = [
  "Time",
  "RelativeTimeMilliseconds",
  "Clock",
  "HR",
  "ST-II",
  "Pulse",
  "SpO2",
  "Perf",
  "etCO2",
  "imCO2",
  "awRR",
  "NBP (Sys)",
  "NBP (Dia)",
  "NBP (Mean)",
  "NBP (Pulse)",
  "NBP (Time Remaining)",
  "ART (Sys)",
  "ART (Dia)",
  "ART (Mean)",
  "etDES",
  "inDES",
  "etISO",
  "inISO",
  "etSEV",
  "inSEV",
  "etN2O",
  "inN2O",
  "MAC",
  "etO2",
  "inO2",
  "Temp",
  "BIS",
  "SQI",
  "EMG",
  "Tidal Volume",
  "Minute Volume",
  "RR",
  "Set Tidal Volume",
  "Set RR",
  "Set I:E Ratio",
  "Set PEEP",
  "Set PAWmax",
  "Set PAWmin",
  "Set Mechanical Ventilation",
  "Tidal Volume Exp (Spiro)",
  "Tidal Volume In (Spiro)",
  "Minute Volume Exp (Spiro)",
  "Minute Volume In (Spiro)",
  "Lung Compliance (Spiro)",
  "Airway Resistance (Spiro)",
  "Max Inspiratory Pressure (Spiro)",
  "Num Patient Alarms",
  "Num Technical Alarms",
] as const;

// --- Numeric signals the editor can plot/edit ------------------------------

export type SignalKey =
  | "HR"
  | "ST-II"
  | "Pulse"
  | "SpO2"
  | "Perf"
  | "etCO2"
  | "imCO2"
  | "awRR"
  | "NBP (Sys)"
  | "NBP (Dia)"
  | "NBP (Mean)"
  | "NBP (Pulse)"
  | "NBP (Time Remaining)"
  | "ART (Sys)"
  | "ART (Dia)"
  | "ART (Mean)"
  | "etDES" | "inDES"
  | "etISO" | "inISO"
  | "etSEV" | "inSEV"
  | "etN2O" | "inN2O"
  | "MAC"
  | "etO2" | "inO2"
  | "Temp"
  | "BIS"
  | "SQI"
  | "EMG"
  | "Tidal Volume"
  | "Minute Volume"
  | "RR"
  | "Set Tidal Volume"
  | "Set RR"
  | "Set PEEP"
  | "Set PAWmax"
  | "Set PAWmin"
  | "Tidal Volume Exp (Spiro)"
  | "Tidal Volume In (Spiro)"
  | "Minute Volume Exp (Spiro)"
  | "Minute Volume In (Spiro)"
  | "Lung Compliance (Spiro)"
  | "Airway Resistance (Spiro)"
  | "Max Inspiratory Pressure (Spiro)"
  | "Num Patient Alarms"
  | "Num Technical Alarms";

// Required columns that are always included and cannot be unchecked
export type RequiredColumn = "Time" | "RelativeTimeMilliseconds" | "Clock";

// All possible selectable columns (required + optional signals)
export type SelectableColumn = RequiredColumn | SignalKey;

export interface SignalMeta {
  unit: string;
  min: number;
  max: number;
  def: number;     // default baseline
  step?: number;   // snap increment for editor
  softLow?: number;  // optional “default band” for shading
  softHigh?: number; // optional “default band” for shading
}

// Reasonable adult OR defaults (generic, non-patient-specific)
export const SIGNALS: Record<SignalKey, SignalMeta> = {
  // Cardio / Oximetry
  HR:           { unit: "bpm",   min: 0,   max: 220, def: 70,  step: 1, softLow: 60, softHigh: 80 },
  "ST-II":      { unit: "mm",    min: -5,  max: 5,   def: 0,   step: 0.5 }, // ECG ST-segment deviation
  Pulse:        { unit: "bpm",   min: 0,   max: 220, def: 70,  step: 1 },   // typically mirrors HR
  SpO2:         { unit: "%",     min: 50,  max: 100, def: 98,  step: 1, softLow: 96, softHigh: 100 },
  Perf:         { unit: "%PI",   min: 0,   max: 20,  def: 5,   step: 0.1 }, // perfusion index (device-relative)

  // CO2 / Resp
  etCO2:        { unit: "mmHg",  min: 0,   max: 80,  def: 35,  step: 1, softLow: 32, softHigh: 38 },
  imCO2:        { unit: "mmHg",  min: 0,   max: 20,  def: 0,   step: 0.5 }, // inspired CO2 ~ 0 if no rebreathing
  awRR:         { unit: "bpm",   min: 0,   max: 60,  def: 14,  step: 1 },

  // Non-invasive BP
  "NBP (Sys)":  { unit: "mmHg",  min: 50,  max: 220, def: 120, step: 1, softLow: 100, softHigh: 140 },
  "NBP (Dia)":  { unit: "mmHg",  min: 30,  max: 140, def: 75,  step: 1, softLow: 60,  softHigh: 90 },
  "NBP (Mean)": { unit: "mmHg",  min: 40,  max: 180, def: 90,  step: 1, softLow: 70,  softHigh: 105 },
  "NBP (Pulse)":{ unit: "mmHg",  min: 10,  max: 120, def: 45,  step: 1 },    // Sys - Dia
  "NBP (Time Remaining)": { unit: "s", min: 0, max: 900, def: 0, step: 5 },  // countdown to next cuff

  // Arterial line (if present; otherwise leave inactive)
  "ART (Sys)":  { unit: "mmHg",  min: 50,  max: 250, def: 120, step: 1 },
  "ART (Dia)":  { unit: "mmHg",  min: 30,  max: 150, def: 75,  step: 1 },
  "ART (Mean)": { unit: "mmHg",  min: 40,  max: 200, def: 90,  step: 1 },

  // Volatile agents (defaults to 0 for neutral baseline)
  etDES:        { unit: "%",     min: 0,   max: 12,  def: 0,   step: 0.1 },
  inDES:        { unit: "%",     min: 0,   max: 12,  def: 0,   step: 0.1 },
  etISO:        { unit: "%",     min: 0,   max: 5,   def: 0,   step: 0.1 },
  inISO:        { unit: "%",     min: 0,   max: 5,   def: 0,   step: 0.1 },
  etSEV:        { unit: "%",     min: 0,   max: 8,   def: 0,   step: 0.1 },
  inSEV:        { unit: "%",     min: 0,   max: 8,   def: 0,   step: 0.1 },
  etN2O:        { unit: "%",     min: 0,   max: 80,  def: 0,   step: 1 },
  inN2O:        { unit: "%",     min: 0,   max: 80,  def: 0,   step: 1 },
  MAC:          { unit: "MAC",   min: 0,   max: 2,   def: 0,   step: 0.05 }, // derived if agents used

  // Oxygen
  etO2:         { unit: "%",     min: 10,  max: 100, def: 35,  step: 1 },   // end-tidal O2 (FiO2 ~40% → etO2 ~35%)
  inO2:         { unit: "%",     min: 21,  max: 100, def: 40,  step: 1 },   // inspired O2 (room 21%, OR often 30–60%)

  // Misc monitors
  Temp:         { unit: "°C",    min: 30,  max: 42,  def: 36.6, step: 0.1 },
  BIS:          { unit: "idx",   min: 0,   max: 100, def: 50,   step: 1 },  // anesthesia target 40–60
  SQI:          { unit: "%",     min: 0,   max: 100, def: 100,  step: 1 },  // signal quality index
  EMG:          { unit: "arb",   min: 0,   max: 100, def: 20,   step: 1 },  // BIS EMG activity (device-specific)

  // Ventilation volumes/flows
  "Tidal Volume":             { unit: "mL",   min: 100, max: 1200, def: 450, step: 10 },
  "Minute Volume":            { unit: "L/min",min: 1,   max: 20,   def: 6.5, step: 0.1 },
  RR:                         { unit: "bpm",  min: 0,   max: 60,   def: 14,  step: 1 },

  // Vent settings (targets)
  "Set Tidal Volume":         { unit: "mL",   min: 200, max: 800,  def: 450, step: 10 },
  "Set RR":                   { unit: "bpm",  min: 6,   max: 30,   def: 14,  step: 1 },
  "Set PEEP":                 { unit: "cmH2O",min: 0,   max: 20,   def: 5,   step: 1 },
  "Set PAWmax":               { unit: "cmH2O",min: 10,  max: 40,   def: 25,  step: 1 }, // peak airway pressure limit
  "Set PAWmin":               { unit: "cmH2O",min: 0,   max: 10,   def: 2,   step: 1 },

  // Spirometry (measured)
  "Tidal Volume Exp (Spiro)": { unit: "mL",   min: 100, max: 1200, def: 440, step: 10 },
  "Tidal Volume In (Spiro)":  { unit: "mL",   min: 100, max: 1200, def: 460, step: 10 },
  "Minute Volume Exp (Spiro)":{ unit: "L/min",min: 1,   max: 20,   def: 6.4, step: 0.1 },
  "Minute Volume In (Spiro)": { unit: "L/min",min: 1,   max: 20,   def: 6.6, step: 0.1 },
  "Lung Compliance (Spiro)":  { unit: "mL/cmH2O", min: 20, max: 120, def: 60, step: 1 },
  "Airway Resistance (Spiro)":{ unit: "cmH2O/L/s", min: 2, max: 30, def: 8,  step: 0.5 },
  "Max Inspiratory Pressure (Spiro)": { unit: "cmH2O", min: 5, max: 40, def: 18, step: 1 },

  // Counters
  "Num Patient Alarms":       { unit: "count", min: 0, max: 999, def: 0, step: 1 },
  "Num Technical Alarms":     { unit: "count", min: 0, max: 999, def: 0, step: 1 },
};
// Required columns that are always included
export const REQUIRED_COLUMNS: RequiredColumn[] = ["Time", "RelativeTimeMilliseconds", "Clock"];

// Which optional signals are selected by default in MVP:
export const DEFAULT_ACTIVE: SignalKey[] = ["HR", "SpO2", "RR", "etCO2"];

// Helper function to get all active columns (required + selected signals)
export function getAllActiveColumns(selectedSignals: SignalKey[]): SelectableColumn[] {
  return [...REQUIRED_COLUMNS, ...selectedSignals];
}

// --- Timing Configuration ---------------------------------------------------

export interface TimingConfig {
  sampleRateMs: number;      // milliseconds between samples (1000 = 1Hz)
  startTime: string;         // HH:MM format for Clock column
  durationMinutes: number;   // total scenario duration
}

export const DEFAULT_TIMING: TimingConfig = {
  sampleRateMs: 1000,        // 1 second intervals (1 Hz)
  startTime: "00:00",        // midnight start
  durationMinutes: 30,       // 30 minute default scenario
};

// Utility functions for time formatting
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}_${ms.toString().padStart(3, '0')}`;
}

export function formatClock(startTime: string, milliseconds: number): string {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  
  const clockMinutes = (startMinute + totalMinutes) % 60;
  const clockHours = (startHour + Math.floor((startMinute + totalMinutes) / 60)) % 24;
  
  return `${clockHours}:${clockMinutes.toString().padStart(2, '0')}`;
}

// Generate time series data for export
export function generateTimeColumns(config: TimingConfig = DEFAULT_TIMING): Array<{
  Time: string;
  RelativeTimeMilliseconds: number;
  Clock: string;
}> {
  const samples = Math.floor((config.durationMinutes * 60 * 1000) / config.sampleRateMs);
  const timeData = [];
  
  for (let i = 0; i <= samples; i++) {
    const milliseconds = i * config.sampleRateMs;
    timeData.push({
      Time: formatTime(milliseconds),
      RelativeTimeMilliseconds: milliseconds,
      Clock: formatClock(config.startTime, milliseconds),
    });
  }
  
  return timeData;
}
