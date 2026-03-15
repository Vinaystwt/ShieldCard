"use client";

import { useMemo } from "react";

import { getRoleLabel } from "@/lib/copy";
import { useShieldCard } from "./useShieldCard";

export function useRoleRouting() {
  const { roleQuery } = useShieldCard();

  return useMemo(() => {
    const role = getRoleLabel(
      roleQuery.data?.isAdmin ?? false,
      roleQuery.data?.isEmployee ?? false,
    );

    return {
      role,
      isAdmin: roleQuery.data?.isAdmin ?? false,
      isEmployee: roleQuery.data?.isEmployee ?? false,
      isLoading: roleQuery.isLoading,
    };
  }, [roleQuery.data, roleQuery.isLoading]);
}
