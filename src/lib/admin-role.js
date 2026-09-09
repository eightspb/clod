/**
 * Role of the signed-in admin user as stamped on `<body data-admin-role>` by AdminLayout.
 * Only an explicit `staff` hides restricted controls: the server enforces the rule itself,
 * so an absent attribute (tests, legacy sessions) keeps the full interface.
 */
export function isStaffViewer(documentRef = typeof document === 'undefined' ? undefined : document) {
  return documentRef?.body?.dataset?.adminRole === 'staff'
}
