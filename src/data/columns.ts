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

export type SignalKey =
  | "HR"
  | "SpO2"
  | "RR"
  | "etCO2"
  | "NBP (Sys)"
  | "NBP (Dia)"
  | "NBP (Mean)";

// Required columns that are always included and cannot be unchecked
export type RequiredColumn = "Time" | "RelativeTimeMilliseconds" | "Clock";

// All possible selectable columns (required + optional signals)
export type SelectableColumn = RequiredColumn | SignalKey;

export interface SignalMeta {
  unit: string;
  min: number;
  max: number;
  def: number;
  step?: number; // snap increment
}

export const SIGNALS: Record<SignalKey, SignalMeta> = {
  HR:         { unit: "bpm",    min: 0,   max: 220, def: 70, step: 1 },
  SpO2:       { unit: "%",      min: 50,  max: 100, def: 98, step: 1 },
  RR:         { unit: "bpm",    min: 0,   max: 60,  def: 14, step: 1 },
  etCO2:      { unit: "mmHg",   min: 0,   max: 80,  def: 35, step: 1 },
  "NBP (Sys)":  { unit: "mmHg", min: 50,  max: 220, def: 120, step: 1 },
  "NBP (Dia)":  { unit: "mmHg", min: 30,  max: 140, def: 75,  step: 1 },
  "NBP (Mean)": { unit: "mmHg", min: 40,  max: 180, def: 90,  step: 1 }
};

// Required columns that are always included
export const REQUIRED_COLUMNS: RequiredColumn[] = ["Time", "RelativeTimeMilliseconds", "Clock"];

// Which optional signals are selected by default in MVP:
export const DEFAULT_ACTIVE: SignalKey[] = ["HR", "SpO2", "RR", "etCO2"];

// Helper function to get all active columns (required + selected signals)
export function getAllActiveColumns(selectedSignals: SignalKey[]): SelectableColumn[] {
  return [...REQUIRED_COLUMNS, ...selectedSignals];
}
