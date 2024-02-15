export default function getUpdatedSearchId(
  id?: string | null,
  urlId?: string | null
) {
  return id === null ? undefined : id;
  // return id === null
  //   ? undefined
  //   : ((id ?? urlId) === 0 ? undefined : id ?? urlId)?.toString();
}
