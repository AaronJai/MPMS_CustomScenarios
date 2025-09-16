import { useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
  Chart,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import dragDataPlugin from 'chartjs-plugin-dragdata';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { useScenarioStore } from '@/state/store';
import { SignalKey, SIGNALS } from '@/data/columns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  dragDataPlugin,
  annotationPlugin
);

interface SignalWaveformProps {
  signalId: SignalKey;
  duration: number; // seconds
}

export function SignalWaveform({ signalId, duration }: SignalWaveformProps) {
  const chartRef = useRef<ChartJS<'line', { x: number; y: number }[]>>(null);
  const { signalStates, resetSignalToDefault } = useScenarioStore();
  const [isDragging, setIsDragging] = useState(false); // Track drag state to prevent pan conflicts
  
  // Store zoom state to persist across re-renders
  const [zoomState, setZoomState] = useState<{ min: number; max: number } | null>(null);
  
  const signal = SIGNALS[signalId];
  const signalState = signalStates[signalId];
  
  if (!signal || !signalState) {
    return <div>Signal not found: {signalId}</div>;
  }

  const { data } = signalState;

  // Function to update point radius based on zoom level
  const updatePointRadius = (chart: Chart) => {
    if (!chart.scales?.x) return;
    
    const xScale = chart.scales.x;
    const visibleRange = xScale.max - xScale.min; // Current visible time range in seconds
    const totalDataPoints = data.length;
    const visibleDataPoints = totalDataPoints * (visibleRange / duration);
    
    // Calculate points per pixel in the visible area
    const chartWidth = chart.width || 800; // Fallback width
    const pointsPerPixel = visibleDataPoints / chartWidth;
    
    // Dynamic radius: smaller when more crowded, larger when more sparse
    let newRadius = 2; // Default
    if (pointsPerPixel > 0.5) newRadius = 0; // Hide points when very crowded
    else if (pointsPerPixel > 0.2) newRadius = 1; // Very small points
    else if (pointsPerPixel > 0.1) newRadius = 2; // Standard points
    else newRadius = 3; // Larger points when zoomed in
    
    // Update the main signal dataset (skip soft band datasets)
    const mainDatasetIndex = signal.softLow !== undefined && signal.softHigh !== undefined ? 2 : 0;
    if (chart.data.datasets[mainDatasetIndex]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataset = chart.data.datasets[mainDatasetIndex] as any;
      dataset.pointRadius = newRadius;
      chart.update('none'); // Update without animation for smooth experience
    }
  };

  // Helper function for consistent time formatting
  const formatTime = (seconds: number): string => {
    // Round to whole seconds for clean display
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Convert data to Chart.js format
  const chartData = {
    datasets: [
      // Soft band background (if available)
      ...(signal.softLow !== undefined && signal.softHigh !== undefined ? (() => {
        console.log(`Creating soft bands for ${signalId}: ${signal.softLow} - ${signal.softHigh}`);
        return [{
          label: `${signalId} Normal Range`,
          data: data.map(point => ({
            x: point.x / 1000, // Convert ms to seconds
            y: signal.softHigh // Top of the soft band
          })),
          fill: '+1', // Fill to the next dataset (softLow)
          backgroundColor: getSignalColor(signalId, 0.15), // Light background color
          borderColor: getSignalColor(signalId, 0.3),
          borderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: 0,
          tension: 0,
          dragData: false, // Don't allow dragging the soft band
          order: 10, // Render behind main line
        }, {
          label: `${signalId} Normal Range Lower`,
          data: data.map(point => ({
            x: point.x / 1000, // Convert ms to seconds
            y: signal.softLow // Bottom of the soft band
          })),
          fill: false,
          backgroundColor: 'transparent',
          borderColor: getSignalColor(signalId, 0.3),
          borderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: 0,
          tension: 0,
          dragData: false, // Don't allow dragging the soft band
          order: 11, // Render behind main line
        }];
      })() : []),
      // Main signal line
      {
        label: `${signalId} (${signal.unit})`,
        data: data.map(point => ({
          x: point.x / 1000, // Convert ms to seconds - keep decimal precision
          y: point.y
        })),
        borderColor: getSignalColor(signalId),
        backgroundColor: getSignalColor(signalId, 0.1),
        borderWidth: 2, // Standard line width
        pointRadius: 0, // Start with no points - will be dynamically set
        pointHoverRadius: 6,
        pointHitRadius: 10,
        tension: 0.1,
        dragData: true, // Enable dragging for this dataset
        order: 1, // Render in front of soft bands
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: { size: 12 },
          filter: (legendItem) => {
            // Hide soft band datasets from legend (they contain "Normal Range" in label)
            return !legendItem.text?.includes('Normal Range');
          },
        },
        onClick: () => {
          // Disable legend clicking to prevent toggling datasets
          return false;
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.35)',
        callbacks: {
          title: (context) => {
            const seconds = context[0]?.parsed?.x;
            if (typeof seconds !== 'number') return '';
            return `Time: ${formatTime(seconds)}`;
          },
          label: (context) => {
            return `${signalId}: ${context.parsed.y.toFixed(1)} ${signal.unit}`;
          },
        },
      },
      dragData: {
        round: 1, // Round to 1 decimal place
        showTooltip: true, // Show tooltip during dragging
        dragX: false, // Disable dragging along X-axis (time should stay fixed)
        onDragStart: (_e: unknown, datasetIndex: number, index: number, value: unknown) => {
          // Called when drag starts - disable pan to prevent conflicts
          // Only allow dragging the main signal dataset
          const mainDatasetIndex = signal.softLow !== undefined && signal.softHigh !== undefined ? 2 : 0;
          if (datasetIndex !== mainDatasetIndex) return;
          
          setIsDragging(true);
          console.log('Drag start', { datasetIndex, index, value });
        },
        onDrag: (_e: unknown, _datasetIndex: number, _index: number, value: number | { x: number; y: number } | null) => {
          // Called during drag - constrain Y values to signal bounds
          if (!value || typeof value === 'number') return true;
          
          const constrainedValue = Math.max(signal.min, Math.min(signal.max, value.y));
          if (constrainedValue !== value.y) {
            // Return false to prevent the drag if out of bounds
            return false;
          }
          return true; // Allow the drag
        },
        onDragEnd: (_e: unknown, datasetIndex: number, index: number, value: unknown) => {
          // Called when drag ends - update the store data first, then re-enable pan
          // Only allow dragging the main signal dataset (last dataset with dragData: true)
          const mainDatasetIndex = signal.softLow !== undefined && signal.softHigh !== undefined ? 2 : 0;
          if (datasetIndex !== mainDatasetIndex) return;
          
          if (typeof value === 'object' && value && 'x' in value && 'y' in value) {
            const pointValue = value as { x: number; y: number };
            const constrainedValue = Math.max(signal.min, Math.min(signal.max, pointValue.y));
            
            // Update the data array with the new value
            const newData = [...data];
            if (newData[index]) {
              newData[index] = { ...newData[index], y: constrainedValue };
              useScenarioStore.getState().updateSignalData(signalId, newData);
            }
          }
          
          // Small delay before re-enabling pan to ensure store update completes
          setTimeout(() => {
            setIsDragging(false);
          }, 50);
        },
      },
      annotation: {
        annotations: {
          // Annotations can be added here dynamically based on store state
          // Example: soft bands, time markers, threshold lines
        },
      },
      zoom: {
        limits: {
          x: {
            min: 0, // Cannot zoom before start of scenario
            max: duration, // Cannot zoom beyond end of scenario
            minRange: 5, // Minimum zoom range of 5 seconds (prevents over-zooming)
          },
        },
        pan: {
          enabled: !isDragging, // Disable panning when dragging points
          mode: 'x', // Only pan on X-axis (time)
          threshold: 10, // Minimum pan distance to trigger
          onPanComplete: ({ chart }) => {
            // Save zoom state to persist across re-renders
            const xScale = chart.scales.x;
            if (xScale) {
              setZoomState({ min: xScale.min, max: xScale.max });
            }
            updatePointRadius(chart);
          },
        },
        zoom: {
          wheel: {
            enabled: !isDragging, // Disable wheel zoom when dragging points
            speed: 0.1, // Smooth zoom speed
          },
          pinch: {
            enabled: !isDragging, // Disable pinch zoom when dragging points
          },
          mode: 'x', // Only zoom on X-axis (time)
          onZoomComplete: ({ chart }) => {
            // Save zoom state to persist across re-renders
            const xScale = chart.scales.x;
            if (xScale) {
              setZoomState({ min: xScale.min, max: xScale.max });
            }
            updatePointRadius(chart);
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Time',
        },
        min: zoomState?.min ?? 0,
        max: zoomState?.max ?? duration,
        grid: {
          display: true,
        },
        ticks: {
          callback: function(value) {
            const seconds = Number(value);
            return formatTime(seconds);
          },
          // Dynamic step size calculation based on visible range
          maxTicksLimit: 10, // Limit to reasonable number of ticks
          autoSkip: true, // Allow Chart.js to skip ticks if too crowded
        },
      },
      y: {
        title: {
          display: true,
          text: `${signalId} (${signal.unit})`,
        },
        min: signal.min,
        max: signal.max,
        // Add soft bands if available
        ...(signal.softLow && signal.softHigh && {
          grid: {
            color: (context) => {
              const value = context.tick.value;
              if (typeof value === 'number' && value >= signal.softLow! && value <= signal.softHigh!) {
                return 'rgba(34, 197, 94, 0.2)'; // Green zone
              }
              return 'rgba(0, 0, 0, 0.1)';
            },
          },
        }),
      },
    },
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{signalId} ({signal.unit})</h3>
        <div className="flex items-center gap-2">
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const chart = chartRef.current;
              if (chart) {
                chart.resetZoom();
                setZoomState(null); // Clear saved zoom state
              }
            }}
            className="h-6 w-20 p-0 text-xs cursor-pointer"
            title="Reset zoom to full view"
          >
            Reset Zoom
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetSignalToDefault(signalId)}
            className="h-6 w-20 p-0 text-xs cursor-pointer"
            title="Reset to default values"
          >
            Reset Graph
          </Button>
        </div>
      </div>
      <div className="h-48 cursor-pointer">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}

// Generate consistent colors for signals
function getSignalColor(signalId: SignalKey, alpha: number = 1): string {
  const colors = [
    `rgba(239, 68, 68, ${alpha})`,   // red
    `rgba(34, 197, 94, ${alpha})`,   // green  
    `rgba(59, 130, 246, ${alpha})`,  // blue
    `rgba(168, 85, 247, ${alpha})`,  // purple
    `rgba(245, 158, 11, ${alpha})`,  // amber
    `rgba(236, 72, 153, ${alpha})`,  // pink
    `rgba(20, 184, 166, ${alpha})`,  // teal
    `rgba(99, 102, 241, ${alpha})`,  // indigo
  ];
  
  // Use signal name to consistently assign colors
  const index = Object.keys(SIGNALS).indexOf(signalId) % colors.length;
  return colors[index];
}
