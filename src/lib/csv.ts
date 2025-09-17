/**
 * RFC4180 compliant CSV utilities for UQ scenario export
 */

/**
 * Escapes a CSV field value according to RFC4180 standard:
 * - Encloses in quotes if contains comma, quote, or newline
 * - Doubles any internal quotes
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If field contains comma, quote, or newline, it must be enclosed in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}

/**
 * Converts data to CSV format with proper RFC4180 compliance
 * @param headers Array of column headers
 * @param rows Array of row objects with column values
 * @returns RFC4180 compliant CSV string
 */
export function toCsv(headers: string[], rows: Record<string, string | number | null | undefined>[]): string {
  // Create header row
  const headerRow = headers.map(escapeCsvField).join(',');
  
  // Create data rows
  const dataRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeCsvField(value);
    }).join(',');
  });
  
  // Join with newlines (RFC4180 specifies CRLF, but \n is widely accepted)
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Formats a number according to signal configuration
 * @param value The numeric value to format
 * @param signalId The signal identifier for precision lookup
 * @returns Formatted number string
 */
export function formatSignalValue(value: number, signalId: string): string {
  // For now, use simple rules based on signal patterns
  // HR, RR, counts = integers
  // Temperatures, percentages, pressures = 1 decimal
  // Precision values like BIS = integers
  // Flows, MAC = 1-2 decimals
  
  if (signalId.includes('HR') || 
      signalId.includes('RR') || 
      signalId.includes('Pulse') ||
      signalId.includes('SpO2') ||
      signalId.includes('BIS') ||
      signalId.includes('SQI') ||
      signalId.includes('EMG') ||
      signalId.includes('Set RR')) {
    // Integer values
    return Math.round(value).toString();
  }
  
  if (signalId.includes('MAC')) {
    // MAC values use 2 decimals for precision
    return value.toFixed(2);
  }
  
  // Default to 1 decimal place for most medical values
  return value.toFixed(1);
}

/**
 * Downloads a CSV string as a file
 * @param csvContent The CSV content string
 * @param filename The filename for download
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
