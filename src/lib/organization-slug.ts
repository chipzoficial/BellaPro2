import { db } from "@/lib/db";

type Options = {
  excludeOrganizationId?: string;
};

export async function getAvailableOrganizationSlug(baseSlug: string, options?: Options) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.organization.findFirst({
      where: {
        slug: candidate,
        id: options?.excludeOrganizationId ? { not: options.excludeOrganizationId } : undefined,
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
