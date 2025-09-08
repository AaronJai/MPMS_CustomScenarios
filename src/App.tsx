import { SidebarProvider, SidebarTrigger, SidebarInset } from './components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { Editor } from './views/Editor'

function App() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        <header className="border-b p-4 flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Scenario Editor</h1>
        </header>
        <div className="flex-1">
          <Editor />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
