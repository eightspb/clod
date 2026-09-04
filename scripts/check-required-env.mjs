#!/usr/bin/env node
import { assessEnvironment } from '../src/lib/startup-environment.js'

const report = assessEnvironment(process.env)

for (const feature of report.disabledFeatures) {
  console.error(`[env] WARNING: ${feature.name} disabled: missing ${feature.missing.join(', ')}`)
}

if (report.missingRequired.length > 0) {
  console.error(`[env] FATAL: required variables are missing: ${report.missingRequired.join(', ')}`)
  process.exit(1)
}

console.log(`[env] required variables present; ${report.disabledFeatures.length} feature(s) disabled`)
