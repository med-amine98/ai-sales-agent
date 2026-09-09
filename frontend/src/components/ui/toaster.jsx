import React from 'react'
import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription } from './toast'

export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport>
        {/* Les toasts seront rendus ici dynamiquement */}
      </ToastViewport>
    </ToastProvider>
  )
}