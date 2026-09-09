export const prerender = false

import { createUserUpdateEndpoint } from '../../../../lib/admin-user-api.js'

export const PATCH = createUserUpdateEndpoint()
