export const FAMILIES = [
  { id: "dos", label: "DOS" },
  { id: "windows", label: "Windows" },
  { id: "unix-bsd-linux", label: "Unix, BSD & Linux" },
  { id: "independent", label: "Independent" },
  { id: "boot-sector", label: "Boot-sector" },
] as const;

export type FamilyId = (typeof FAMILIES)[number]["id"];

export const FAMILY_IDS = ["dos", "windows", "unix-bsd-linux", "independent", "boot-sector"] as const;

export function familyLabel(id: FamilyId): string {
  return FAMILIES.find((family) => family.id === id)?.label ?? id;
}

export function familiesPresent(ids: readonly FamilyId[]): FamilyId[] {
  return FAMILY_IDS.filter((id) => ids.includes(id));
}
