import React from 'react'

const Toast = ({ children, className = "", ...props }) => {
  return (
    <div className={`bg-white border rounded-lg shadow-lg p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

const ToastProvider = ({ children }) => {
  return <>{children}</>
}

const ToastViewport = ({ className = "", ...props }) => {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col gap-2 ${className}`} {...props} />
  )
}

const ToastTitle = ({ className = "", children, ...props }) => {
  return (
    <div className={`font-semibold ${className}`} {...props}>
      {children}
    </div>
  )
}

const ToastDescription = ({ className = "", children, ...props }) => {
  return (
    <div className={`text-sm text-gray-600 ${className}`} {...props}>
      {children}
    </div>
  )
}

const ToastClose = ({ className = "", ...props }) => {
  return (
    <button className={`ml-auto ${className}`} {...props}>
      ✕
    </button>
  )
}

const ToastAction = ({ className = "", children, ...props }) => {
  return (
    <button className={`text-sm text-blue-600 hover:text-blue-800 ${className}`} {...props}>
      {children}
    </button>
  )
}

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction
}