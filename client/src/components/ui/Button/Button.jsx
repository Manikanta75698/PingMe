import "./Button.css";

export default function Button({

  children,

  variant = "primary",

  size = "md",

  type = "button",

  loading = false,

  disabled = false,

  fullWidth = false,

  leftIcon,

  rightIcon,

  className = "",

  onClick,

  ...rest

}) {

  return (

    <button

      type={type}

      onClick={onClick}

      disabled={disabled || loading}

      className={`
        btn
        btn-${variant}
        btn-${size}
        ${fullWidth ? "btn-full" : ""}
        ${loading ? "btn-loading" : ""}
        ${className}
      `}

      aria-busy={loading}

      {...rest}

    >

      {loading ? (
        <>
          <span className="btn-spinner"></span>

          <span className="btn-text">
            {children}
          </span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="btn-icon">
              {leftIcon}
            </span>
          )}

          <span className="btn-text">
            {children}
          </span>

          {rightIcon && (
            <span className="btn-icon">
              {rightIcon}
            </span>
          )}
        </>
      )}

    </button>

  );

}