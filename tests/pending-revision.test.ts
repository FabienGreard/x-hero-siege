import { describe, expect, test } from "bun:test";
import { pendingRevisionAfterDispatch } from "../src/client/pending-revision";

describe("revision-pending mutation dispatch", () => {
  test("keeps pending only when the socket write was sent", () => {
    expect(pendingRevisionAfterDispatch(7, true)).toBe(7);
    expect(pendingRevisionAfterDispatch(7, false)).toBeNull();
  });
});
