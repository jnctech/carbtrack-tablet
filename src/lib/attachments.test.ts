import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  describeUploadRejection,
} from "./attachments";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("describeUploadRejection", () => {
  it("accepts each allowed MIME type", () => {
    for (const mime of ALLOWED_MIME.keys()) {
      const file = makeFile(`x.${ALLOWED_MIME.get(mime)}`, mime, 1024);
      expect(describeUploadRejection(file)).toBeNull();
    }
  });

  it("rejects unsupported MIME types", () => {
    const file = makeFile("x.txt", "text/plain", 1024);
    expect(describeUploadRejection(file)).toMatch(/Unsupported file type/i);
  });

  it("rejects files larger than the cap", () => {
    const file = makeFile("big.jpg", "image/jpeg", MAX_UPLOAD_BYTES + 1);
    expect(describeUploadRejection(file)).toMatch(/too large/i);
  });

  it("rejects empty files", () => {
    const file = makeFile("empty.jpg", "image/jpeg", 0);
    expect(describeUploadRejection(file)).toMatch(/empty/i);
  });

  it("includes the offending MIME in the message when present", () => {
    const file = makeFile("x.txt", "text/plain", 1024);
    expect(describeUploadRejection(file)).toContain("text/plain");
  });

  it("handles a missing MIME type gracefully", () => {
    const file = makeFile("x", "", 1024);
    const rejection = describeUploadRejection(file);
    expect(rejection).toMatch(/Unsupported file type/i);
    expect(rejection).not.toContain(":");
  });
});
