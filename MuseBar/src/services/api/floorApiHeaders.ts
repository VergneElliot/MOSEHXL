/** Floor mutations are PIN-gated: every write carries the actor token. */
export function pinHeaders(pinActorToken: string): Record<string, string> {
  return { 'x-pin-actor-token': pinActorToken };
}
