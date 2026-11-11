export const CATEGORY_ORDER = [
  "Getting Started", "Platform Basics", "Product & Features", "Channels & Integrations", "Reservations & Calendar",
  "Messaging & Automation", "Payments & Finance", "Properties", "Booking Website", "Guest Guide (MrGG)", "Hostify AI",
  "Task App", "Sales & Demos", "Customer Success", "Competition", "FAQ", "Product Updates", "Videos",
];
export function sortCategories(cats: string[]) {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
}
