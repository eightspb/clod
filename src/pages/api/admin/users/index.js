export const prerender = false

import { createUserCreateEndpoint, createUserIndexEndpoint } from '../../../../lib/admin-user-api.js'

export const GET = createUserIndexEndpoint()
export const POST = createUserCreateEndpoint()
