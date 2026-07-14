interface AppLogoProps {
  heightClass?: string
  className?: string
}

export default function AppLogo({ heightClass = 'h-10', className = '' }: AppLogoProps) {
  return (
    <span
      className={`inline-flex items-center bg-white rounded-lg border border-gray-200 px-2 py-1 ${className}`}
    >
      <img
        src={`${import.meta.env.BASE_URL}header-logo.png`}
        alt="Pool Boy App"
        className={`${heightClass} w-auto`}
      />
    </span>
  )
}
