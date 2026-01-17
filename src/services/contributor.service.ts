import { AppError } from "@/lib/errors";
import { contributorDao } from "@/dao/contributor.dao";
import { contributorLinkDao } from "@/dao/contributor_link.dao";
import { contextDao } from "@/dao/context.dao";

export const contributorService = {
  async getPublicProfile(username: string) {
    const profile = await contributorDao.findByUsername(username);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor not found", 404);
    if (profile.status !== "ACTIVE") throw new AppError("NOT_FOUND", "Contributor not found", 404);

    const links = await contributorLinkDao.listByContributor(profile.id);
    const contexts = await contextDao.listByContributor(profile.id, false);

    return { profile, links, contexts };
  },

  async getMyProfile(actorUserId: string) {
    const profile = await contributorDao.findByUserId(actorUserId);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);
    return profile;
  },

  async updateMyProfile(actorUserId: string, patch: { displayName?: string; bio?: string; category?: string }) {
    const profile = await contributorDao.findByUserId(actorUserId);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const updated = await contributorDao.updateById(profile.id, {
      ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      updatedBy: actorUserId,
    });

    return updated!;
  },

  async addLink(actorUserId: string, input: { label?: string; url: string; sortOrder?: any }) {
    const profile = await contributorDao.findByUserId(actorUserId);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const link = await contributorLinkDao.create({
      contributorId: profile.id,
      label: input.label ?? "",
      url: input.url,
      sortOrder: input.sortOrder ?? "0",
      isActive: true,
      createdBy: actorUserId,
    });

    return link;
  },

  async updateLink(actorUserId: string, linkId: string, patch: { label?: string; url?: string; sortOrder?: any; isActive?: boolean }) {
    const profile = await contributorDao.findByUserId(actorUserId);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const updated = await contributorLinkDao.updateById(linkId, { ...patch, updatedBy: actorUserId });
    if (!updated) throw new AppError("NOT_FOUND", "Link not found", 404);

    return updated;
  },

  async deleteLink(actorUserId: string, linkId: string) {
    const profile = await contributorDao.findByUserId(actorUserId);
    if (!profile) throw new AppError("NOT_FOUND", "Contributor profile not found", 404);

    const deleted = await contributorLinkDao.deleteById(linkId);
    if (!deleted) throw new AppError("NOT_FOUND", "Link not found", 404);

    return deleted;
  },
};
