import { resolveDriveLinks, driveFileId, driveFolderId, parseFileTitle, parseFolderListing, isSignInPage, looksLikeVideo, titleFromName, drivePreviewUrl } from "../../api/_lib/drive";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("Drive links", () => {
  it("finds the file id in every common link shape", () => {
    for (const url of [
      `https://drive.google.com/file/d/${ID}/view?usp=sharing`,
      `https://drive.google.com/file/d/${ID}/view?usp=drive_link`,
      `https://drive.google.com/file/d/${ID}`,
      `https://drive.google.com/open?id=${ID}`,
      `https://drive.google.com/uc?export=download&id=${ID}`,
      `https://drive.usercontent.google.com/download?id=${ID}&export=download`,
      `  ${ID}  `,
    ]) expect(driveFileId(url)).toBe(ID);
    expect(driveFileId("https://youtube.com/watch?v=abc")).toBeNull();
    expect(driveFileId("")).toBeNull();
  });
  it("finds folder ids", () => {
    expect(driveFolderId(`https://drive.google.com/drive/folders/${ID}?usp=sharing`)).toBe(ID);
    expect(driveFolderId(`https://drive.google.com/drive/u/0/folders/${ID}`)).toBe(ID);
    expect(driveFolderId(`https://drive.google.com/file/d/${ID}/view`)).toBeNull();
    expect(drivePreviewUrl(ID)).toBe(`https://drive.google.com/file/d/${ID}/preview`);
  });
  it("reads the file name and spots private links", () => {
    expect(parseFileTitle("<html><title>Brand_Film-FINAL.mp4 - Google Drive</title></html>")).toBe("Brand_Film-FINAL.mp4");
    expect(parseFileTitle("<title>Sign in - Google Accounts</title>")).toBeNull();
    expect(isSignInPage("", "https://accounts.google.com/v3/signin/identifier?continue=x")).toBe(true);
    expect(isSignInPage("<title>Night &amp; Day.mov - Google Drive</title>")).toBe(false);
    expect(parseFileTitle("<title>Night &amp; Day.mov - Google Drive</title>")).toBe("Night & Day.mov");
  });
  it("lists a public folder", () => {
    const html = `
      <div class="flip-entry" id="entry-${ID}"><a href="https://drive.google.com/file/d/${ID}/view?usp=drive_web" target="_blank">
        <div class="flip-entry-info"><div class="flip-entry-title">Ad spot.mp4</div></div></a></div>
      <div class="flip-entry"><a href="https://drive.google.com/file/d/2ZzZzZzZzZzZzZzZzZzZzZzZzZzZz/view?usp=drive_web">
        <div class="flip-entry-title">notes.pdf</div></a></div>
      <div class="flip-entry"><a href="https://drive.google.com/drive/folders/3FfFfFfFfFfFfFfFfFfFfFfFfFf?usp=drive_web">
        <div class="flip-entry-title">Reels</div></a></div>`;
    const r = parseFolderListing(html);
    expect(r.files).toEqual([{ id: ID, name: "Ad spot.mp4" }, { id: "2ZzZzZzZzZzZzZzZzZzZzZzZzZzZz", name: "notes.pdf" }]);
    expect(r.folders).toEqual([{ id: "3FfFfFfFfFfFfFfFfFfFfFfFfFf", name: "Reels" }]);
    expect(r.files.filter((f) => looksLikeVideo(f.name))).toHaveLength(1);
  });
  it("makes a clean title", () => {
    expect(titleFromName("My_film-final  v2.mp4")).toBe("My film final v2");
  });
});

describe("resolveDriveLinks", () => {
  const page = (html: string, url = "https://drive.google.com/x", status = 200) => ({ status, url, text: async () => html }) as unknown as Response;
  const fake = (async (u: string) => {
    if (u.includes("embeddedfolderview?id=FOLDERxxxxxxxxxx")) return page(`<title>Portfolio</title>
      <a href="https://drive.google.com/file/d/${ID}/view"><div class="flip-entry-title">Ad.mp4</div></a>
      <a href="https://drive.google.com/file/d/IMGxxxxxxxxxxxxxxxxxxxxxxxxx/view"><div class="flip-entry-title">still.jpg</div></a>
      <a href="https://drive.google.com/drive/folders/SUBxxxxxxxxxxxx"><div class="flip-entry-title">Reels</div></a>`);
    if (u.includes("embeddedfolderview?id=SUBxxxxxxxxxxxx")) return page(`<a href="https://drive.google.com/file/d/REELxxxxxxxxxxxxxxxxxxxxxxxx/view"><div class="flip-entry-title">reel 1.mov</div></a>`);
    if (u.includes("PRIVATExxxxxxxxxxxxxxxxxxxxxx")) return page("<title>Sign in - Google Accounts</title>", "https://accounts.google.com/v3/signin/identifier");
    if (u.includes(`/file/d/SOLOxxxxxxxxxxxxxxxxxxxxxxxxx/view`)) return page("<title>Solo film.mp4 - Google Drive</title>");
    return page("", u, 404);
  }) as typeof fetch;
  it("expands folders (one level of sub-folders), names files and flags private links", async () => {
    const r = await resolveDriveLinks(`https://drive.google.com/drive/folders/FOLDERxxxxxxxxxx
      https://drive.google.com/file/d/SOLOxxxxxxxxxxxxxxxxxxxxxxxxx/view?usp=sharing
      https://drive.google.com/file/d/PRIVATExxxxxxxxxxxxxxxxxxxxxx/view
      not a link`, fake);
    expect(r.items.map((i) => [i.name, i.status, i.folder])).toEqual([
      ["Ad.mp4", "ok", "Portfolio"], ["still.jpg", "not-video", "Portfolio"], ["reel 1.mov", "ok", "Portfolio / Reels"],
      ["Solo film.mp4", "ok", null], ["https://drive.google.com/file/d/PRIVATExxxxxxxxxxxxxxxxxxxxxx/view", "private", null],
    ]);
    expect(r.unknown).toEqual(["not", "a", "link"]);
  });
});
