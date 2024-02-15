import { PersonView } from "lemmy-js-client";

export default function isAdmin(
  creatorId: string,
  admins?: PersonView[]
): boolean {
  return admins?.map(a => a.person.id).includes(creatorId) ?? false;
}
