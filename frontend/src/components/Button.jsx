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
  const baseClasses = "font-semibold rounded-lg transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  }
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-cyan-500/50 hover:animate-pulse",
    secondary: "bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md hover:shadow-slate-500/50 hover:animate-pulse",
    success: "bg-gradient-to-r from-emerald-400 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/50 hover:animate-pulse",
    danger: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg hover:shadow-rose-500/50 hover:animate-pulse",
    warning: "bg-gradient-to-r from-amber-400 to-orange-600 text-white shadow-lg hover:shadow-amber-500/50 hover:animate-pulse",
    info: "bg-gradient-to-r from-sky-400 to-cyan-600 text-white shadow-lg hover:shadow-sky-500/50 hover:animate-pulse",
    ghost: "bg-transparent border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400/10 hover:shadow-cyan-500/50 hover:animate-pulse",
    outline: "border-2 border-slate-500 text-slate-200 hover:bg-slate-700 hover:border-slate-400 hover:animate-pulse",
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
