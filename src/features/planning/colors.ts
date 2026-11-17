/** Une couleur par site, stable tant que la liste des sites ne change pas. */
const PALETTE = ['#1f78c1', '#2e9e6a', '#f5a623', '#7939b8', '#d32f2f', '#00897b', '#c2185b', '#5d4037']

export const siteColor = (siteIds: string[], siteId: string) => PALETTE[Math.max(0, siteIds.indexOf(siteId)) % PALETTE.length]
