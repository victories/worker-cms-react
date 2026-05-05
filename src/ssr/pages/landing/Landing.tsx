import type { LandingConfig } from '../../pages/Landing';
import { Landing as LegacyLanding } from '../../pages/Landing';

export interface LandingProps {
  config: LandingConfig;
}

/**
 * New compose-only Landing entry. During the redesign migration this
 * file delegates to the legacy Landing while sections are built one
 * by one; task 13 swaps the body for the new section composition.
 */
export function Landing({ config }: LandingProps) {
  return <LegacyLanding config={config} />;
}
