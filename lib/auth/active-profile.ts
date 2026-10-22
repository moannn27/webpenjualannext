// Supabase's thenable PostgREST builder has a deeply recursive generic type;
// use a narrow runtime shape here to keep this small guard from widening it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProfileLookupClient = { from: (table: string) => any }

/**
 * A valid Supabase JWT can outlive an account deletion. Requiring its public
 * profile on protected requests makes deletion effective before JWT expiry.
 */
export async function getActiveUserProfileStatus(client: ProfileLookupClient, userId: string) {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) return 'unavailable' as const
  return data?.id === userId ? 'active' as const : 'missing' as const
}
