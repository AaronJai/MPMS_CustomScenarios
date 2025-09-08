import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { ColumnSelect } from "@/views/ColumnSelect"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="p-4">
          <h1 className="text-lg font-bold">MPMS Scenario Builder</h1>
          <p className="text-sm text-gray-600">Create custom vital scenarios</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-0">
        <ColumnSelect />
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <div className="p-4 text-xs text-gray-500">
          <p>MVP - Trend Data Only</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
