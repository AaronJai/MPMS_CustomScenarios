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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SignalKey, SIGNALS } from '@/data/columns';
import { DataPoint } from '@/state/store';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SignalChartProps {
  signalId: SignalKey;
  data: DataPoint[];
  duration: number; // seconds
}

export function SignalChart({ signalId, data, duration }: SignalChartProps) {
  const signal = SIGNALS[signalId];
  
  if (!signal) {
    return <div>Signal not found: {signalId}</div>;
  }

  // Convert data to Chart.js format
  const chartData = {
    labels: data.map(point => Math.floor(point.x / 1000)), // Convert ms to seconds for labels
    datasets: [
      {
        label: `${signalId} (${signal.unit})`,
        data: data.map(point => point.y),
        borderColor: getSignalColor(signalId),
        backgroundColor: getSignalColor(signalId, 0.1),
        borderWidth: 2,
        pointRadius: 0, // Hide points for cleaner look
        pointHoverRadius: 4,
        tension: 0.1, // Slight curve for smoother lines
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (context) => {
            const seconds = context[0]?.label;
            const minutes = Math.floor(Number(seconds) / 60);
            const remainingSeconds = Number(seconds) % 60;
            return `Time: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          },
          label: (context) => {
            return `${signalId}: ${context.parsed.y} ${signal.unit}`;
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
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="h-48">
        <Line data={chartData} options={options} />
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
