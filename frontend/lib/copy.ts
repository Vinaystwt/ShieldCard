import {
  STATUS_APPROVED,
  STATUS_DENIED,
  STATUS_PENDING,
} from "./constants";

export function getStatusLabel(status: number) {
  switch (status) {
    case STATUS_APPROVED:
      return "Approved";
    case STATUS_DENIED:
      return "Denied";
    case STATUS_PENDING:
    default:
      return "Pending";
  }
}

export function getRoleLabel(isAdmin: boolean, isEmployee: boolean) {
  if (isAdmin) return "Admin";
  if (isEmployee) return "Employee";
  return "Observer";
}
