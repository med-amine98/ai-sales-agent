import React from 'react'

const Button = ({ 
  className = "", 
  variant = "default", 
  size = "default", 
  asChild = false,
  children, 
  ...props 
}) => {
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    ghost: "hover:bg-slate-100 text-slate-700",
    link: "text-indigo-600 underline-offset-4 hover:underline"
  }
  
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 rounded-lg px-3 text-xs",
    lg: "h-11 rounded-xl px-8 text-base",
    icon: "h-9 w-9 p-0"
  }
  
  const combinedClass = `inline-flex items-center justify-center font-bold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${combinedClass} ${children.props.className || ''}`.trim(),
      ...props
    })
  }
  
  return (
    <button
      className={combinedClass}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }