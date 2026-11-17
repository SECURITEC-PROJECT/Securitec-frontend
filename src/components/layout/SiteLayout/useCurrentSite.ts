import { useOutletContext } from 'react-router-dom'
import type { Site } from '../../../features/sites'

export interface SiteContext {
  site: Site
}

export const useCurrentSite = () => useOutletContext<SiteContext>().site
