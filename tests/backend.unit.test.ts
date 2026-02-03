import { hashPassword, verifyPassword } from "../backend/src/auth";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("SecretPass123!");
    const valid = await verifyPassword("SecretPass123!", hash);
    expect(valid).toBe(true);
  });
});
