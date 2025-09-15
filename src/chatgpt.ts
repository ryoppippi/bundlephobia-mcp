import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { PackageStats, PackageStatsHistory } from "./types";

import { createPackageInfoURL } from "./url";

export function buildSearchOutput(
  history: PackageStatsHistory,
): CallToolResult {
  const cleanHistory = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(history).filter(([_, v]) => Object.keys(v).length > 0),
  ) as {
    [version: string]: PackageStats;
  };

  return createChatGPTSearchOutput(
    Object.values(cleanHistory).map((stat) =>
      pkgStatToChatGPTSearchOutput(stat),
    ),
  );
}

export function buildFetchOutput(
  history: PackageStatsHistory,
  name: string,
  version: string,
): CallToolResult {
  const cleanHistory = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(history).filter(([_, v]) => Object.keys(v).length > 0),
  ) as {
    [version: string]: PackageStats;
  };
  const data = cleanHistory[version];

  if (data && data.name === name) {
    return createChatGPTFetchOutput(pkgStatToChatGPTFetchOutput(data));
  }

  throw new Error(`Package ${name}@${version} not found`);
}

interface ChatGPTBaseOutput {
  /**
   * a unique ID for the document or search result item
   */
  id: string;

  /**
   * human-readable title.
   */
  title: string;

  /**
   * canonical URL for citation.
   */
  url: string;
}

/**
 * @see {@link https://platform.openai.com/docs/mcp#search-tool}
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ChatGPTSearchOutput extends ChatGPTBaseOutput {}

/**
 * @see {@link https://platform.openai.com/docs/mcp#fetch-tool}
 */
interface ChatGPTFetchOutput extends ChatGPTBaseOutput {
  /**
   * An optional key/value pairing of data about the result
   */
  metadata?: Record<string, unknown>;

  /**
   * The full text of the document or item
   */
  text: string;
}

function createChatGPTSearchOutput(
  outputs: ChatGPTSearchOutput[] = [],
): CallToolResult {
  const response = {
    results: outputs,
  };

  return {
    content: [
      {
        text: JSON.stringify(response),
        type: "text",
      },
    ],
  };
}

function createChatGPTFetchOutput(outputs: ChatGPTFetchOutput): CallToolResult {
  return {
    content: [
      {
        text: JSON.stringify(outputs),
        type: "text",
      },
    ],
  };
}

function pkgStatToChatGPTFetchOutput(stat: PackageStats): ChatGPTFetchOutput {
  return {
    id: stat.name + "@" + stat.version,
    text: JSON.stringify(stat, null, 2),
    title: `${stat.name}@${stat.version} - ${stat.size} KB.`,
    url: createPackageInfoURL(stat).toString(),
  };
}

function pkgStatToChatGPTSearchOutput(stat: PackageStats): ChatGPTSearchOutput {
  return {
    id: stat.name + "@" + stat.version,
    title: `${stat.name}@${stat.version} - ${stat.size} KB.`,
    url: createPackageInfoURL(stat).toString(),
  };
}
