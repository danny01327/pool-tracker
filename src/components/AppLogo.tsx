interface AppLogoProps {
  iconSize?: number
  textClassName?: string
  className?: string
}

export default function AppLogo({ iconSize = 28, textClassName = 'text-lg', className = '' }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 font-semibold ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt="Pool Boy"
        width={iconSize}
        height={iconSize}
        className="rounded-md"
      />
      <span className={textClassName}>Pool Boy</span>
    </div>
  )
}
