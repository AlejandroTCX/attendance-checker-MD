"use client"

import type React from "react"

import { Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onFileUpload: (content: string, type: "attendance" | "employees") => void
  type: "attendance" | "employees"
  label: string
  description: string
}

export function FileUpload({ onFileUpload, type, label, description }: FileUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        onFileUpload(content, type)
      }
      reader.readAsText(file)
    }
  }

  return (
    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <label className="flex flex-col items-center gap-2 cursor-pointer">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
          <Button type="button" variant="secondary" size="sm" className="mt-2">
            Seleccionar archivo
          </Button>
        </label>
      </CardContent>
    </Card>
  )
}
