"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { UQ_HEADERS, DEFAULT_ACTIVE, SIGNALS, SignalKey, REQUIRED_COLUMNS, RequiredColumn } from "@/data/columns"

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
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      selectedColumns: [...REQUIRED_COLUMNS, ...DEFAULT_ACTIVE],
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast("Selected signals updated", {
      description: (
        <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">{JSON.stringify(data.selectedColumns, null, 2)}</code>
        </pre>
      ),
    })
    
    // TODO: Save to scenario state/store
    console.log("Selected columns:", data.selectedColumns)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Select Signal Columns</h1>
        <p className="text-gray-600">
          Choose which vital signs and measurements to include in your scenario.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="selectedColumns"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base font-semibold">Available Signals</FormLabel>
                  <FormDescription>
                    Select the signals you want to edit and include in your scenario. 
                    Time-related columns (Time, RelativeTimeMilliseconds, Clock) are always required.
                  </FormDescription>
                </div>
                
                <div className="max-h-96 overflow-y-auto border rounded-md p-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
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
                                  className="w-5 h-5"
                                  checked={field.value?.includes(item.id)}
                                  disabled={item.isRequired}
                                  onCheckedChange={(checked) => {
                                    if (item.isRequired) return; // Prevent unchecking required items
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value: string) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className={`text-sm font-normal cursor-pointer ${item.isRequired ? 'text-gray-600 italic' : ''}`}>
                                  {item.label}
                                  {item.unit && (
                                    <span className="text-gray-500 ml-1">({item.unit})</span>
                                  )}
                                  {item.isRequired && (
                                    <span className="text-xs text-gray-400 ml-2">(Required)</span>
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
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex gap-3">
            <Button type="submit" className="flex-1 cursor-pointer">
              Continue to Editor
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => form.reset({ selectedColumns: [...REQUIRED_COLUMNS, ...DEFAULT_ACTIVE] })}
              className="cursor-pointer"
            >
              Reset to Defaults
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
