// Test timing functions
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}_${ms.toString().padStart(3, '0')}`;
}

function formatClock(startTime, milliseconds) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  
  const clockMinutes = (startMinute + totalMinutes) % 60;
  const clockHours = (startHour + Math.floor((startMinute + totalMinutes) / 60)) % 24;
  
  return `${clockHours}:${clockMinutes.toString().padStart(2, '0')}`;
}

// Test first 7 samples
console.log('Time\tRelativeTimeMilliseconds\tClock');
for (let i = 0; i < 7; i++) {
  const ms = i * 1000;
  console.log(`${formatTime(ms)}\t${ms}\t${formatClock('00:00', ms)}`);
}
