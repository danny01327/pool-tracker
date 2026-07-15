interface ResourceLink {
  href: string
  title: string
  description: string
}

const LINKS: ResourceLink[] = [
  {
    href: 'https://www.troublefreepool.com',
    title: 'Trouble Free Pool',
    description: "The community, wiki, and Pool School behind this app's recommendations — great for deeper questions or a second opinion from real pool owners.",
  },
  {
    href: 'https://www.tftestkits.com',
    title: 'TF Test Kits',
    description: 'Test kits and reagent refills (FAS-DPD, etc.) — the official source for the kind of testing TFP recommends.',
  },
]

export default function Resources() {
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Resources</h1>
      <div className="space-y-3">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <div className="font-medium text-sky-700 dark:text-sky-400">{link.title} ↗</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{link.description}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
