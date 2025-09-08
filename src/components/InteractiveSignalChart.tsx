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
  Legend
);

interface InteractiveSignalChartProps {
  signalId: SignalKey;
  duration: number; // seconds
}

export function InteractiveSignalChart({ signalId, duration }: InteractiveSignalChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const { signalStates, addControlPoint, deleteControlPoint, resetSignalToDefault } = useScenarioStore();
  
  const signal = SIGNALS[signalId];
  const signalState = signalStates[signalId];
  
  if (!signal || !signalState) {
    return <div>Signal not found: {signalId}</div>;
  }

  const { data, controlPoints } = signalState;

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
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `Time: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          },
          label: (context) => {
            return `${signalId}: ${context.parsed.y.toFixed(1)} ${signal.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Time (seconds)',
        },
        min: 0,
        max: duration,
        ticks: {
          stepSize: 300, // 5-minute intervals
          callback: function(value) {
            const seconds = Number(value);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
      <div className="h-48">
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
