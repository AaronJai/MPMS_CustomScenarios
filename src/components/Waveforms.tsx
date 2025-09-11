import { useRef, useState, useEffect, useCallback } from 'react';
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
  const { signalStates, addControlPoint, deleteControlPoint, undoLastControlPoint, redoLastControlPoint, resetSignalToDefault, setSignalZoom } = useScenarioStore();
  
  // State for modifier key deletion mode
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isChartFocused, setIsChartFocused] = useState(false);
  
  const signal = SIGNALS[signalId];
  const signalState = signalStates[signalId];
  
  // Handle keyboard events for modifier keys and undo/redo
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isChartFocused) return;
    
    // Check for Ctrl/Cmd key
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLastControlPoint(signalId);
        return;
      }
      if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoLastControlPoint(signalId);
        return;
      }
      setIsDeleteMode(true);
    }
  }, [isChartFocused, signalId, undoLastControlPoint, redoLastControlPoint]);
  
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      setIsDeleteMode(false);
    }
  }, []);
  
  // Set up global keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  if (!signal || !signalState) {
    return <div>Signal not found: {signalId}</div>;
  }

  const { data, controlPoints, zoom } = signalState;

  // Helper function for consistent time formatting
  const formatTime = (seconds: number, zoomScale?: string): string => {
    // For fine zoom levels, show decimal precision
    if (zoomScale === '5s' || zoomScale === '30s') {
      const totalSeconds = Math.round(seconds * 10) / 10; // Round to 1 decimal place
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      
      return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
    } else {
      // For other zoom levels, use whole seconds
      const totalSeconds = Math.round(seconds);
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // Convert data to Chart.js format
  const chartData = {
    datasets: [
      // Main signal line
      {
        label: `${signalId} (${signal.unit})`,
        data: data.map(point => ({
          x: point.x / 1000, // Convert ms to seconds - keep decimal precision
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
          x: point.x / 1000, // Convert ms to seconds - keep decimal precision
          y: point.y
        })),
        borderColor: isDeleteMode ? 'rgba(255, 100, 100, 1)' : 'rgba(255, 0, 0, 0.8)',
        backgroundColor: isDeleteMode ? 'rgba(255, 100, 100, 0.8)' : 'rgba(255, 0, 0, 0.6)',
        borderWidth: isDeleteMode ? 3 : 2,
        pointRadius: isDeleteMode ? 9 : 7,
        pointHoverRadius: isDeleteMode ? 13 : 10,
        pointHitRadius: isDeleteMode ? 20 : 12,
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
        backgroundColor: 'rgba(0,0,0,0.35)',
        filter: (tooltipItem) => tooltipItem.datasetIndex === 0, // Only show tooltip for main line
        callbacks: {
          title: (context) => {
            const seconds = context[0]?.parsed?.x;
            if (typeof seconds !== 'number') return '';
            return `Time: ${formatTime(seconds, zoom.scale)}`;
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
            return formatTime(seconds, zoom.scale);
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
        if (isDeleteMode) {
          // In delete mode, show normal pointer cursor
          chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'crosshair';
        }
      }
    },
    onClick: handleChartClick,
  };

  // Helper function to snap time to grid based on zoom scale
  function snapTimeToGrid(timeSeconds: number, zoomScale: string): number {
    let snapInterval: number;
    
    switch (zoomScale) {
      case '5s':
        snapInterval = 1;
        break;
      case '30s':
        snapInterval = 5;
        break;
      case '5m':
        snapInterval = 30;
        break;
      case '10m':
        snapInterval = 60;
        break;
      default: // 'full'
        snapInterval = 60;
        break;
    }
    
    return Math.round(timeSeconds / snapInterval) * snapInterval;
  }

  // Handle chart clicks
  function handleChartClick(event: ChartEvent, chartElements: ActiveElement[]) {
    if (!chartRef.current) return;

    const nativeEvent = event.native as MouseEvent;

    if (chartElements.length > 0) {
      const element = chartElements[0];
      
      // Check if clicking on a control point (dataset index 1)
      if (element.datasetIndex === 1) {
        const pointIndex = element.index;
        
        if (isDeleteMode) {
          // In delete mode, single click deletes immediately
          deleteControlPoint(signalId, pointIndex);
        } else {
          // Normal mode: keep double-click deletion for backwards compatibility
          if (nativeEvent.detail === 2) { // Double click
            deleteControlPoint(signalId, pointIndex);
          }
        }
        return;
      }
    }
    
    // Click on empty space
    if (isDeleteMode) {
      // In delete mode, clicking empty space does nothing
      return;
    }
    
    // Normal mode: add new control point
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;
    
    const dataX = chart.scales.x.getValueForPixel(x);
    const dataY = chart.scales.y.getValueForPixel(y);
    
    if (dataX !== undefined && dataY !== undefined) {
      // Snap the time to appropriate grid intervals based on zoom scale
      const snappedTimeSeconds = snapTimeToGrid(dataX, zoom.scale);
      
      // Convert seconds back to milliseconds for storage
      const newPoint: DataPoint = {
        x: snappedTimeSeconds * 1000,
        y: dataY,
        isControlPoint: true
      };
      
      addControlPoint(signalId, newPoint);
    }
  }

  return (
    <div className={`bg-white border rounded-lg p-4 mb-4 ${isDeleteMode ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{signalId} ({signal.unit})</h3>
        <div className="flex items-center gap-2">
          {isDeleteMode && (
            <div className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded">
              DELETE MODE
            </div>
          )}
          <div className="text-xs text-gray-500">
            {controlPoints.length} control point{controlPoints.length !== 1 ? 's' : ''} • 
            {isDeleteMode ? (
              <> Click point to delete • 'Z' to undo • 'Y' to redo</>
            ) : (
              <> Click to add • Hold Ctrl/Cmd for delete options</>
            )}
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
                variant={zoom.scale === value ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  // Calculate current viewport center
                  const currentCenter = (zoom.startTime + zoom.endTime) / 2;
                  
                  // Calculate new start time centered on current view
                  let newStartTime: number;
                  if (value === 'full') {
                    newStartTime = 0;
                  } else {
                    // Get duration for the new zoom scale
                    const scaleDurations = {
                      '5s': 4,
                      '30s': 30,
                      '5m': 300,
                      '10m': 600
                    };
                    const newDuration = scaleDurations[value];
                    
                    // Center the new window on current center
                    newStartTime = Math.max(0, currentCenter - (newDuration / 2));
                    
                    // Ensure we don't go beyond the total duration
                    if (newStartTime + newDuration > duration) {
                      newStartTime = Math.max(0, duration - newDuration);
                    }
                  }
                  
                  setSignalZoom(signalId, value, newStartTime);
                }}
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
      <div 
        className={`h-48 ${zoom.scale === 'full' ? 'cursor-default' : 'cursor-pointer'} ${isDeleteMode ? 'ring-2 ring-red-300' : ''}`}
        tabIndex={0}
        onFocus={() => setIsChartFocused(true)}
        onBlur={() => setIsChartFocused(false)}
        onMouseEnter={() => setIsChartFocused(true)}
        onMouseLeave={() => setIsChartFocused(false)}
        style={{ outline: 'none' }}
      >
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
