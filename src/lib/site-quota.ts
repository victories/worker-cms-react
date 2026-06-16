// Pure quota math shared by the unit-decrement and reactivate flows.

/** How many active sites must be paused for the user to fit under the
 *  resulting max-sites quota. Never negative. */
export function sitesToPauseRequired(activeSites: number, resultingMaxSites: number): number {
  return Math.max(0, activeSites - resultingMaxSites);
}

/** Whether a paused site may be reactivated: only if the user has
 *  headroom (active sites strictly below their max). */
export function canReactivate(activeSites: number, maxSites: number): boolean {
  return activeSites < maxSites;
}
