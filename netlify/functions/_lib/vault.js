import { createDefaultVault } from "../../../src/data.js";

export function normalizeVault(vault) {
  const fallback = createDefaultVault();
  return {
    ...fallback,
    ...vault,
  };
}
