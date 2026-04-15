import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./facebook-webhook";

describe("Facebook Webhook Signature Verification", () => {
  it("should verify a valid webhook signature", () => {
    const appSecret = "test_secret_key";
    const body = JSON.stringify({ object: "page", entry: [] });

    // Generate valid signature
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", appSecret)
      .update(body)
      .digest("hex");
    const validSignature = `sha256=${hash}`;

    const result = verifyWebhookSignature(body, validSignature, appSecret);
    expect(result).toBe(true);
  });

  it("should reject an invalid webhook signature", () => {
    const appSecret = "test_secret_key";
    const body = JSON.stringify({ object: "page", entry: [] });
    const invalidSignature = "sha256=invalid_hash_value";

    const result = verifyWebhookSignature(body, invalidSignature, appSecret);
    expect(result).toBe(false);
  });

  it("should reject a signature with wrong secret", () => {
    const appSecret = "test_secret_key";
    const wrongSecret = "wrong_secret_key";
    const body = JSON.stringify({ object: "page", entry: [] });

    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", wrongSecret)
      .update(body)
      .digest("hex");
    const signature = `sha256=${hash}`;

    const result = verifyWebhookSignature(body, signature, appSecret);
    expect(result).toBe(false);
  });

  it("should handle empty body correctly", () => {
    const appSecret = "test_secret_key";
    const body = "";

    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", appSecret)
      .update(body)
      .digest("hex");
    const validSignature = `sha256=${hash}`;

    const result = verifyWebhookSignature(body, validSignature, appSecret);
    expect(result).toBe(true);
  });
});
