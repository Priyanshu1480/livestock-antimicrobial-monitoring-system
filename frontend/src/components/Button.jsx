// Reusable Button component with multiple colorful variants and interactive effects
const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  disabled = false, 
  className = "",
  onClick,
  type = "button",
  ...props 
}) => {
  const baseClasses = "font-medium rounded-lg transition-all duration-300 ease-out transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  }
  
  const variantClasses = {
    primary: "bg-teal-600 hover:bg-teal-500 text-white shadow-[0_2px_10px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_16px_rgba(20,184,166,0.4)] hover:-translate-y-0.5",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-slate-700",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:-translate-y-0.5",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_2px_10px_rgba(225,29,72,0.3)] hover:shadow-[0_4px_16px_rgba(225,29,72,0.4)] hover:-translate-y-0.5",
    warning: "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_2px_10px_rgba(217,119,6,0.3)] hover:shadow-[0_4px_16px_rgba(217,119,6,0.4)] hover:-translate-y-0.5",
    info: "bg-sky-600 hover:bg-sky-500 text-white shadow-[0_2px_10px_rgba(2,132,199,0.3)] hover:shadow-[0_4px_16px_rgba(2,132,199,0.4)] hover:-translate-y-0.5",
    ghost: "bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white",
    outline: "border border-slate-600 text-slate-200 hover:bg-slate-800 hover:border-slate-500 hover:-translate-y-0.5",
  }
  
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
