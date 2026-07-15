import { createGoogle } from "@ai-sdk/google";

export function createGoogleProvider(apiKey: string) {
  return createGoogle({
    apiKey,
  });
}
