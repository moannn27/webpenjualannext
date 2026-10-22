export type OrderCustomerProfile = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type OrderCustomerIdentityInput = {
  shippingAddress?: {
    recipient_name?: unknown;
    phone?: unknown;
    customer_snapshot?: unknown;
  } | null;
  userProfile?: OrderCustomerProfile | OrderCustomerProfile[] | null;
};

export type OrderCustomerIdentity = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function resolveOrderCustomerIdentity({
  shippingAddress,
  userProfile,
}: OrderCustomerIdentityInput): OrderCustomerIdentity {
  const snapshot = asRecord(shippingAddress?.customer_snapshot);
  const profile = Array.isArray(userProfile) ? userProfile[0] : userProfile;

  return {
    name: nonEmptyString(snapshot?.name)
      ?? nonEmptyString(shippingAddress?.recipient_name)
      ?? nonEmptyString(profile?.full_name),
    email: nonEmptyString(snapshot?.email) ?? nonEmptyString(profile?.email),
    phone: nonEmptyString(snapshot?.phone)
      ?? nonEmptyString(shippingAddress?.phone)
      ?? nonEmptyString(profile?.phone),
  };
}
