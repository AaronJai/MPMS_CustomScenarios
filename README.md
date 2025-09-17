# MPMS Custom Scenarios

A modern React-based application for creating and editing medical scenario waveforms with interactive signal manipulation and CSV import/export capabilities.

## Overview

MPMS Custom Scenarios is a sophisticated waveform editor designed for medical professionals to create realistic patient monitoring scenarios. The application provides an intuitive interface for:

- **Interactive Waveform Editing**: Drag-and-drop control points to shape vital sign patterns
- **Smart Interpolation**: Preserves existing data characteristics while allowing smooth adjustments
- **CSV Import/Export**: Full round-trip support for importing existing scenarios and exporting custom ones
- **Multi-Signal Management**: Handle multiple vital signs simultaneously with synchronized controls
- **Advanced Chart Features**: Zoom, pan, and visual feedback with professional Chart.js integration

## Key Features

### 🎯 **Interactive Signal Editing**
- Drag any point on a waveform to create control points
- Cascading effects that intelligently affect subsequent data points
- Shape-preserving interpolation that maintains data personality
- Visual feedback with orange indicators for modified points

### 📊 **Professional Charting**
- Built on Chart.js v4 with modern plugin architecture
- Dynamic point sizing based on zoom level
- Synchronized zoom across multiple charts
- Soft bands for normal value ranges
- Real-time updates with smooth animations

### 📁 **CSV Integration**
- Import existing CSV files with automatic time format detection
- Supports various time formats (HH:MM:SS_MMM, milliseconds)
- Export scenarios with configurable column selection
- Intelligent signal mapping with case-insensitive matching

### ⚙️ **Advanced Controls**
- Global cascade toggle for different editing behaviors
- Synchronized zoom across all charts
- Flexible duration support (handles non-rounded times like 15:37)
- Signal visibility management with ordering

## File Structure

```
src/
├── App.tsx                # Main application component and layout
├── main.tsx               # Application entry point and React root
├── globals.css            # Global styles and CSS variables
├── vite-env.d.ts          # TypeScript environment definitions
│
├── assets/                # Static assets
│   └── react.svg          # React logo
│
├── components/            # Reusable UI components
│   ├── ColumnSelect.tsx   # Signal selection and CSV import/export form
│   ├── Waveforms.tsx      # Interactive Chart.js waveform component
│   └── ui/                # Shadcn/UI primitive components
|
├── data/                  # Data definitions and constants
│   └── columns.ts         # Signal definitions, default values, and column mappings
│
├── hooks/                 # Custom React hooks
│   └── use-mobile.ts      # Mobile device detection hook
│
├── lib/                   # Utility libraries
│   ├── csv.ts             # CSV parsing and export utilities
│   └── utils.ts           # General utility functions and helpers
│
├── state/                 # Global state management
│   └── store.ts           # Zustand store with signal data and actions
│
└── views/                 # Page-level view components
    ├── AppSidebar.tsx     # Main sidebar layout with signal selection
    └── WaveformEditor.tsx # Main waveform editing interface
```
- Note: for development, `ColumnSelect.tsx` and `Waveform.tsx` are your main files. Sections within them, especially in `Waveform.tsx` could be modularised/refactored but given the application's simplicity, it did not seem important

## Architecture

### **State Management**
- **Zustand** for global state management
- Signal data with modification tracking (`isUserModified` flags)
- CSV import/export actions
- Global UI controls (zoom sync, cascade toggle)

### **Chart System**
- **Chart.js v4** with React wrapper (react-chartjs-2)
- **chartjs-plugin-dragdata** for interactive point manipulation
- **chartjs-plugin-zoom** for pan/zoom functionality
- **chartjs-plugin-annotation** for soft bands and markers

### **UI Framework**
- **React 18** with TypeScript for type safety
- **Shadcn/UI** components for consistent design system
- **Tailwind CSS** for utility-first styling
- **Sonner** for toast notifications

### **Data Processing**
- **Papaparse** for robust CSV parsing
- Dynamic time format detection and conversion
- Signal bounds validation and constraint enforcement
- Intelligent interpolation algorithms

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## Usage

1. **Select Signals**: Choose vital signs from the sidebar
2. **Edit Waveforms**: Drag points on charts to create control points
3. **Configure Settings**: Use global toggles for cascade and zoom sync
4. **Import/Export**: Load existing CSV files or export your scenarios

The application automatically handles data interpolation, maintains signal bounds, and provides visual feedback for all modifications.