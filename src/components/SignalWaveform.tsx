import { useRef } from 'react';
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
  ChartEvent,
  ActiveElement,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { SignalKey, SIGNALS } from '@/data/columns';
import { DataPoint, useScenarioStore } from '@/state/store';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

interface SignalWaveformProps {
  signalId: SignalKey;
  duration: number; // seconds
}

export function SignalWaveform({ signalId, duration }: SignalWaveformProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const { signalStates, addControlPoint, deleteControlPoint, resetSignalToDefault, setSignalZoom } = useScenarioStore();
  
  const signal = SIGNALS[signalId];
  const signalState = signalStates[signalId];
  
  if (!signal || !signalState) {
    return <div>Signal not found: {signalId}</div>;
  }

  const { data, controlPoints, zoom } = signalState;

  // Helper function for consistent time formatting
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    // Format based on zoom level to avoid messy decimals
    if (zoom.scale === '5s' || zoom.scale === '30s') {
      return `${minutes}:${Math.round(remainingSeconds).toString().padStart(2, '0')}`;
    } 
      else {
      // For longer durations, show whole seconds
      return `${minutes}:${Math.round(remainingSeconds).toString().padStart(2, '0')}`;
    }
  };

  // Convert data to Chart.js format
  const chartData = {
    datasets: [
      // Main signal line
      {
        label: `${signalId} (${signal.unit})`,
        data: data.map(point => ({
          x: Math.floor(point.x / 1000), // Convert ms to seconds
          y: point.y
        })),
        borderColor: getSignalColor(signalId),
        backgroundColor: getSignalColor(signalId, 0.1),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.1,
        order: 2, // Behind control points
      },
      // Control points
      {
        label: 'Control Points',
        data: controlPoints.map(point => ({
          x: Math.floor(point.x / 1000), // Convert ms to seconds
          y: point.y
        })),
        borderColor: 'rgba(255, 0, 0, 0.8)',
        backgroundColor: 'rgba(255, 0, 0, 0.6)',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false, // Only show points, not connecting lines
        order: 1, // In front of signal line
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
          filter: (legendItem) => legendItem.text !== 'Control Points', // Hide control points from legend
        },
      },
      tooltip: {
        enabled: true,
        filter: (tooltipItem) => tooltipItem.datasetIndex === 0, // Only show tooltip for main line
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
      zoom: {
        pan: {
          enabled: zoom.scale !== 'full', // Disable panning when Full is selected
          mode: 'x',
          onPanComplete: ({ chart }) => {
            const xScale = chart.scales.x;
            if (xScale && zoom.scale !== 'full') {
              const newStartTime = Math.max(0, xScale.min);
              setSignalZoom(signalId, zoom.scale, newStartTime);
            }
          },
        },
        zoom: {
          wheel: {
            enabled: zoom.scale !== 'full', // Disable wheel zoom when Full is selected
          },
          pinch: {
            enabled: zoom.scale !== 'full', // Disable pinch zoom when Full is selected
          },
          mode: 'x',
          onZoomComplete: ({ chart }) => {
            const xScale = chart.scales.x;
            if (xScale && zoom.scale !== 'full') {
              const newStartTime = Math.max(0, xScale.min);
              const newEndTime = Math.min(duration, xScale.max);
              // Auto-detect zoom scale based on time range
              const timeRange = newEndTime - newStartTime;
              let newScale: 'full' | '5s' | '30s' | '5m' | '10m' = zoom.scale;
              if (timeRange <= 7) newScale = '5s';
              else if (timeRange <= 60) newScale = '30s';
              else if (timeRange <= 360) newScale = '5m';
              else if (timeRange <= 720) newScale = '10m';
              else newScale = 'full';
              
              setSignalZoom(signalId, newScale, newStartTime);
            }
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
        min: zoom.startTime,
        max: zoom.endTime,
        grid: {
          display: true,
        },
        ticks: {
          stepSize: zoom.scale === '5s' ? 1 : zoom.scale === '30s' ? 5 : zoom.scale === '5m' ? 30 : zoom.scale === '10m' ? 60 : 300,
          callback: function(value) {
            const seconds = Number(value);
            return formatTime(seconds);
          },
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
    // Enable dragging and clicking
    onHover: (_, elements) => {
      if (chartRef.current) {
        chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'crosshair';
      }
    },
    onClick: handleChartClick,
  };

  // Handle chart clicks
  function handleChartClick(event: ChartEvent, chartElements: ActiveElement[]) {
    if (!chartRef.current) return;

    const nativeEvent = event.native as MouseEvent;

    if (chartElements.length > 0) {
      const element = chartElements[0];
      
      // Check if clicking on a control point (dataset index 1)
      if (element.datasetIndex === 1) {
        // Double click to delete, single click to select for dragging
        const pointIndex = element.index;
        
        // For now, we'll delete on click. Later we can add drag functionality
        if (nativeEvent.detail === 2) { // Double click
          deleteControlPoint(signalId, pointIndex);
        }
        return;
      }
    }
    
    // Click on empty space - add new control point
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;
    
    const dataX = chart.scales.x.getValueForPixel(x);
    const dataY = chart.scales.y.getValueForPixel(y);
    
    if (dataX !== undefined && dataY !== undefined) {
      // Convert seconds back to milliseconds for storage
      const newPoint: DataPoint = {
        x: dataX * 1000,
        y: dataY,
        isControlPoint: true
      };
      
      addControlPoint(signalId, newPoint);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{signalId} ({signal.unit})</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {controlPoints.length} control point{controlPoints.length !== 1 ? 's' : ''} • 
            Click to add • Double-click point to delete
          </div>
          
          {/* Zoom presets */}
          <div className="flex items-center gap-1 border rounded px-1">
            {[
              { label: '5s', value: '5s' as const },
              { label: '30s', value: '30s' as const },
              { label: '5m', value: '5m' as const },
              { label: '10m', value: '10m' as const },
              { label: 'Full', value: 'full' as const }
            ].map(({ label, value }) => (
              <Button
                key={value}
                variant={zoom.scale === value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSignalZoom(signalId, value, 0)}
                className="h-5 px-2 text-xs"
                title={`Zoom to ${label}`}
              >
                {label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetSignalToDefault(signalId)}
            className="h-6 w-6 p-0 text-xs cursor-pointer"
            title="Reset to default values"
          >
            ⟳
          </Button>
        </div>
      </div>
      <div className={`h-48 ${zoom.scale === 'full' ? 'cursor-default' : 'cursor-grab'}`}>
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
