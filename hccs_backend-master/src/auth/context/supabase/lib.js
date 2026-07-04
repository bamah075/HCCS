// Use @supabase/ssr's createBrowserClient so cookies are written in the format
// that the server-side createServerClient (used by requireAdmin/Staff) can read.
// Using the older auth-helpers-nextjs `createPagesBrowserClient` here caused
// every API route guard to return 401 because the cookie names didn't match.
import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_API } from 'src/config-global';

// ----------------------------------------------------------------------

export const supabase = createBrowserClient(`${SUPABASE_API.url}`, `${SUPABASE_API.key}`);
