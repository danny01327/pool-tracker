interface AppLogoProps {
  heightClass?: string
  className?: string
}

export default function AppLogo({ heightClass = 'h-12', className = '' }: AppLogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}header-logo.png`}
      alt="Pool Boy App"
      className={`${heightClass} w-auto rounded-md ${className}`}
    />
  )
}
