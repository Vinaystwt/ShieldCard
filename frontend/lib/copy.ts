export function getRoleLabel(isAdmin: boolean, isEmployee: boolean) {
  if (isAdmin) return "Admin";
  if (isEmployee) return "Employee";
  return "Observer";
}
