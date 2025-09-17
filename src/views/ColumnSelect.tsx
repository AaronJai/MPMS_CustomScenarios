"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { UQ_HEADERS, DEFAULT_ACTIVE, SIGNALS, SignalKey, REQUIRED_COLUMNS, RequiredColumn } from "@/data/columns"
import { useScenarioStore } from "@/state/store"
import { toCsv, downloadCsv } from "@/lib/csv"

// Create items array from UQ_HEADERS, separating required from optional
const items = UQ_HEADERS.map((header) => ({
  id: header,
  label: header,
  // Add unit info for signals that have metadata
  unit: header in SIGNALS ? (SIGNALS[header as SignalKey]?.unit || "") : "",
  // Mark if this is a required column
  isRequired: REQUIRED_COLUMNS.includes(header as RequiredColumn)
}))

const FormSchema = z.object({
  selectedColumns: z.array(z.string())
    .refine((value) => value.some((item) => item), {
      message: "You have to select at least one signal.",
    })
    .refine((value) => REQUIRED_COLUMNS.every(req => value.includes(req)), {
      message: "Required time columns must be selected.",
    }),
})

export function ColumnSelect() {
  const { setSelectedSignals, exportRows, duration, setDuration, importCSV } = useScenarioStore()
  
  // Local state for duration input (in minutes)
  const [durationMinutes, setDurationMinutes] = useState(Math.round(duration / 60))
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      selectedColumns: [...REQUIRED_COLUMNS, ...DEFAULT_ACTIVE],
    },
  })

  // Initialize store with default signals on mount
  useEffect(() => {
    setSelectedSignals(DEFAULT_ACTIVE)
  }, [setSelectedSignals])

  // Sync local duration state when store duration changes
  useEffect(() => {
    setDurationMinutes(Math.round(duration / 60))
  }, [duration])

  function onSubmit(data: z.infer<typeof FormSchema>) {
    // Filter out required columns to get only the signals
    const selectedSignals = data.selectedColumns.filter(
      (col): col is SignalKey => !REQUIRED_COLUMNS.includes(col as RequiredColumn)
    ) as SignalKey[]
    
    // Update the store with selected signals
    setSelectedSignals(selectedSignals)
    
    // Ensure columns are in UQ_HEADERS order (not form selection order)
    const orderedColumns = UQ_HEADERS.filter(header => data.selectedColumns.includes(header))
    
    // Generate CSV data using UQ_HEADERS order
    const rows = exportRows(orderedColumns)
    const csvContent = toCsv(orderedColumns, rows)
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `scenario_${timestamp}.csv`
    
    // Download the CSV
    downloadCsv(csvContent, filename)
    
    toast("CSV Export Complete", {
      description: (
        <div className="text-sm">
          <p>Exported {orderedColumns.length} columns, {rows.length} rows</p>
          <p className="text-gray-500 mt-1">Downloaded as: {filename}</p>
        </div>
      ),
    })
  }

  // Update store when form values change (for real-time chart updates)
  function handleColumnChange(checked: boolean, columnId: string) {
    const currentValues = form.getValues("selectedColumns")
    const newValues = checked 
      ? [...currentValues, columnId]
      : currentValues.filter(id => id !== columnId)
    
    form.setValue("selectedColumns", newValues)
    
    // Update store with selected signals (excluding required columns)
    const selectedSignals = newValues.filter(
      (col): col is SignalKey => !REQUIRED_COLUMNS.includes(col as RequiredColumn)
    ) as SignalKey[]
    
    setSelectedSignals(selectedSignals)
  }

  // Handle duration update
  function handleDurationUpdate() {
    const minutes = Math.max(1, Math.min(240, durationMinutes))
    setDuration(minutes * 60) // Convert to seconds
    toast("Duration Updated", {
      description: `Scenario length set to ${minutes} minutes`,
    })
  }

  // Handle CSV import
  function handleImportCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await importCSV(file);
        
        // Update form to reflect imported signals
        const currentSignals = useScenarioStore.getState().selectedSignals;
        const newColumns = [...REQUIRED_COLUMNS, ...currentSignals]; // Include required columns
        form.setValue('selectedColumns', newColumns);
        
        toast("CSV Import Successful", {
          description: `Imported ${currentSignals.length} signals from ${file.name}`,
        });
      } catch (error) {
        toast("CSV Import Failed", {
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    };
    input.click();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Signal Selection</h2>
        <p className="text-sm text-gray-600">
          Choose signals to include in your scenario.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <FormField
            control={form.control}
            name="selectedColumns"
            render={() => (
              <FormItem className="flex-1 flex flex-col">
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="number"
                      min="1"
                      max="240"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-16 h-8 text-xs"
                      placeholder="30"
                    />
                    <span className="text-xs text-gray-600">minutes</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDurationUpdate}
                      className="h-8 px-3 text-xs cursor-pointer"
                    >
                      Update
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="selectedColumns"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  className="w-4 h-4"
                                  checked={field.value?.includes(item.id)}
                                  disabled={item.isRequired}
                                  onCheckedChange={(checked) => {
                                    if (item.isRequired) return;
                                    handleColumnChange(!!checked, item.id)
                                  }}
                                />
                              </FormControl>
                              <div className="flex-1 min-w-0">
                                <FormLabel className={`text-xs font-normal cursor-pointer block truncate ${item.isRequired ? 'text-gray-600 italic' : ''}`}>
                                  {item.label}
                                  {item.unit && (
                                    <span className="text-gray-500 ml-1">({item.unit})</span>
                                  )}
                                  {item.isRequired && (
                                    <span className="text-xs text-gray-400 block">(Required)</span>
                                  )}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
                <FormMessage className="px-4" />
              </FormItem>
            )}
          />
          
          <div className="p-4 border-t space-y-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                const defaultColumns = [...REQUIRED_COLUMNS, ...DEFAULT_ACTIVE];
                form.reset({ selectedColumns: defaultColumns });
                
                // Update store with default signals (excluding required columns)
                const selectedSignals = defaultColumns.filter(
                  (col): col is SignalKey => !REQUIRED_COLUMNS.includes(col as RequiredColumn)
                ) as SignalKey[];
                
                setSelectedSignals(selectedSignals);
              }}
              className="w-full text-xs cursor-pointer"
              size="sm"
            >
              Reset to Default Vitals
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleImportCSV}
              className="w-full text-xs cursor-pointer"
              size="sm"
            >
              Import CSV
            </Button>
            <Button 
              type="submit" 
              variant="default"
              className="w-full text-xs cursor-pointer"
              size="sm"
            >
              Export CSV
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
