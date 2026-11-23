/** Display version of a title: drops export timestamps like "202607101846" and file-name leftovers. */
export function displayTitle(title = "") {
  return title.replace(/[_]+/g, " ").replace(/\s*\d{8,}\s*$/, "").replace(/[…]+$/, "").replace(/\s{2,}/g, " ").trim() || title;
}
