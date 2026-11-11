export const TEAMS = ["Sales", "Customer Success", "Support", "Finance", "Product", "Marketing", "Operations", "Other"] as const;
export const ALLOWED_DOMAIN = "hostify.com";
export function isHostifyEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}
