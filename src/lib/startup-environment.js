const REQUIRED_KEYS = Object.freeze(['ADMIN_PASSWORD', 'TOKEN_SECRET', 'ASTRO_DB_REMOTE_URL', 'BOOKING_INTENT_SECRET', 'CONTACT_FINGERPRINT_KEY', 'PATIENT_ENCRYPTION_KEY'])

const FEATURES = Object.freeze([
  Object.freeze({ name: 'Формы «Второе мнение» и «Налоговая справка» (SMTP)', keys: Object.freeze(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'TO_EMAIL']) }),
  Object.freeze({ name: 'Получатели формы «Налоговая справка»', keys: Object.freeze(['TAX_FORM_TO_EMAIL']) }),
  Object.freeze({ name: 'Онлайн-запись Medflex', keys: Object.freeze(['MEDFLEX_CLINIC_TOKEN']) }),
  Object.freeze({ name: 'Телефония MANGO OFFICE', keys: Object.freeze(['MANGO_VPBX_API_KEY', 'MANGO_VPBX_API_SALT', 'MANGO_CALL_ENCRYPTION_KEY', 'MANGO_INBOUND_LINES']) }),
])

function isBlank(env, key) {
  const value = env[key]
  return typeof value !== 'string' || value.trim().length === 0
}

/**
 * Splits the runtime environment into hard failures (the app cannot serve safely)
 * and disabled features (the app starts, but a named capability is switched off).
 */
export function assessEnvironment(env) {
  if (env === null || typeof env !== 'object') throw new TypeError('Environment must be an object of variable names to values')
  const missingRequired = Object.freeze(REQUIRED_KEYS.filter((key) => isBlank(env, key)))
  const disabledFeatures = Object.freeze(FEATURES.filter((feature) => feature.keys.some((key) => isBlank(env, key))).map((feature) => Object.freeze({ name: feature.name, missing: Object.freeze(feature.keys.filter((key) => isBlank(env, key))) })))
  return Object.freeze({ missingRequired, disabledFeatures })
}
