import { useScenarioStore } from '@/state/store'
import { SignalWaveform } from '@/components/SignalWaveform'

export function Editor() {
  const { signalStates, duration } = useScenarioStore()
  
  // Get visible signals sorted by order
  const visibleSignals = Object.values(signalStates)
    .filter(state => state?.isVisible)
    .sort((a, b) => (a?.order || 0) - (b?.order || 0))
  
  if (visibleSignals.length === 0) {
    return (
      <div className="h-full p-6">
        <div className="h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Signal Editor</h2>
            <p className="text-gray-500">
              Select signals from the sidebar to start editing waveforms.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Charts will appear here as you select vital signs to monitor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="space-y-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Signal Waveforms</h2>
          <p className="text-sm text-gray-600">
            Editing {visibleSignals.length} signal{visibleSignals.length !== 1 ? 's' : ''} • 
            Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} • 
            Sample Rate: 1 Hz
          </p>
        </div>
        
        {visibleSignals.map((signalState) => {
          if (!signalState) return null
          
          return (
            <SignalWaveform
              key={signalState.id}
              signalId={signalState.id}
              duration={duration}
            />
          )
        })}
      </div>
    </div>
  )
}