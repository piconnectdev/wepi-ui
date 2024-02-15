import { CommunityModeratorView } from "lemmy-js-client";

export default function isMod(
  creatorId: string,
  mods?: CommunityModeratorView[]
): boolean {
  return mods?.map(m => m.moderator.id).includes(creatorId) ?? false;
}
