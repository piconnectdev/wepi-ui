export default function getIdFromString(id?: string): string | undefined {
  return id;
  //return id && id !== "0" && !Number.isNaN(Number(id)) ? Number(id) : undefined;
}
