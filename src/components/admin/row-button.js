/** Compact labelled action button for dense admin table rows. */
export const ROW_BUTTON = 'inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-clay-admin-border bg-white px-3 text-sm font-semibold text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint disabled:cursor-not-allowed disabled:opacity-45'

/** Square icon-only action button for dense admin table rows; the accessible name lives in aria-label. */
export const ICON_BUTTON = 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-clay-admin-border bg-white text-clay-admin-dark transition hover:border-clay-mint hover:text-clay-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-mint disabled:cursor-not-allowed disabled:opacity-45'

/** Destructive variant of the icon-only action button. */
export const ICON_BUTTON_DANGER = `${ICON_BUTTON} border-red-200 text-red-700 hover:border-red-400 hover:text-red-800`
