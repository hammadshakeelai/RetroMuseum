import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deleteSnapshot, getSnapshot, importSnapshotFromFile, listSnapshots, saveSnapshot } from "./storage";

describe("snapshot persistence", () => {
  it("commits bytes, lists only matching metadata, and deletes durably", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const saved = await saveSnapshot("test-profile", "Test VM", "Checkpoint", bytes);
    const other = await saveSnapshot("other-profile", "Other VM", "Other", bytes);
    expect((await getSnapshot(saved.id))?.data).toEqual(bytes);
    expect(await listSnapshots("test-profile")).toEqual([{
      id: saved.id, profileId: "test-profile", profileName: "Test VM",
      label: "Checkpoint", timestamp: saved.timestamp, sizeBytes: 3,
    }]);
    await deleteSnapshot(saved.id);
    expect(await getSnapshot(saved.id)).toBeNull();
    await deleteSnapshot(other.id);
  });

  it("rejects empty files and unrelated binaries before storing them", async () => {
    await expect(importSnapshotFromFile(new File([], "empty.bin"), "micro", "Micro")).rejects.toThrow("empty");
    await expect(importSnapshotFromFile(new File([new Uint8Array(32)], "wrong.bin"), "micro", "Micro")).rejects.toThrow("not an uncompressed");
  });
});
