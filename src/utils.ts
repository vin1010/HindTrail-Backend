export function queryStr(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0];
  return undefined;
}

export function paramStr(val: unknown): string {
  if (typeof val === "string") return val;
  return "";
}
