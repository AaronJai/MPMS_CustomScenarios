export function Editor() {
  return (
    <div className="h-full p-6">
      <div className="h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Signal Editor</h2>
          <p className="text-gray-500">
            This is where the waveform graphs will be displayed and edited.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Selected signals will appear here as interactive graphs.
          </p>
        </div>
      </div>
    </div>
  )
}