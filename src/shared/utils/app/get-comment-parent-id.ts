import { Comment } from "lemmy-js-client";

export default function getCommentParentId(
  comment?: Comment
): string | undefined {
  const split = comment?.path.split(".");
  // remove the 0
  split?.shift();

  return split && split.length > 1 ? split.at(split.length - 2) : undefined;
}
