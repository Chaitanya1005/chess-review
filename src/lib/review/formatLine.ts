/** Formats a SAN line with move numbers, starting at the given move number and side. */
export function formatLine(san: string[], moveNumber: number, color: "w" | "b"): string {
  const parts: string[] = [];
  let n = moveNumber;
  let side = color;
  san.forEach((s, i) => {
    if (side === "w") parts.push(`${n}. ${s}`);
    else parts.push(i === 0 ? `${n}... ${s}` : s);
    if (side === "b") n++;
    side = side === "w" ? "b" : "w";
  });
  return parts.join(" ");
}
