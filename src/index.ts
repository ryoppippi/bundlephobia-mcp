import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { structuredErrorOfPackageHistoryAPI } from "./api/package-history";
import { fetchPackageHistory } from "./api/package-history";
import { isPackageHistoryAPIErrorResponse } from "./api/package-history";
import {
  fetchPackageStats,
  isSizeAPIErrorResponse,
  structuredErrorOfSizeAPI,
} from "./api/size";
import { buildFetchOutput, buildSearchOutput } from "./chatgpt";
import { PKG_NAME, PKG_VERSION } from "./constants";
import {
  structuredPackageStatsHistoryOutput,
  structuredPackageStatsOutput,
} from "./structured-output";
import { isNonEmptyString } from "./utils/string";

/**
 * Create a new instance of Bundlephobia MCP server.
 */
export const createServer = (): McpServer => {
  const server = new McpServer({
    description:
      "Fetch information about the bundle size and dependencies of npm packages. Or retrieve those information over the past versions.",
    name: PKG_NAME,
    version: PKG_VERSION,
  });

  server.registerTool(
    "get_npm_package_info",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
        title: "Get information about an npm package",
      },
      description: [
        "Get information about an npm package with bundlephobia.",
        "",
        "For example, you can retrieve information about:",
        "- Bundle size",
        "- Tree-shakeability",
        "- Dependencies",
        "- Peer dependencies",
        "- Assets",
        "## Usage",
        "```",
        "get_npm_package_info(name: '$PACKAGE_NAME')",
        "```",
      ].join("\n"),
      inputSchema: {
        name: z
          .string()
          .describe("The name of the npm package to get information about."),
      },
      outputSchema: structuredPackageStatsOutput.schema,
    },
    async ({ name }) => {
      try {
        if (!isNonEmptyString(name)) {
          return structuredPackageStatsOutput.error({
            code: "InvalidInputError",
            messages: ["Package name must be a non-empty string"],
          });
        }

        const packageInfo = await fetchPackageStats(name);

        if (isSizeAPIErrorResponse(packageInfo)) {
          return structuredPackageStatsOutput.error(
            structuredErrorOfSizeAPI(packageInfo),
          );
        }

        return structuredPackageStatsOutput.success(packageInfo);
      } catch (error) {
        console.error(error);
        return structuredPackageStatsOutput.error({
          code: "FetchError",
          messages: [
            "An error occurred while fetching the package information from bundlephobia.",
            error instanceof Error ? error.message : String(error),
          ],
        });
      }
    },
  );

  server.registerTool(
    "get_npm_package_info_history",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
        title: "Get a version history of npm packages",
      },
      description: [
        "Get all the past information about an npm package stored in bundlephobia.",
        "",
        "For example, you can retrieve information about:",
        "- Bundle size",
        "- Tree-shakeability",
        "- Dependencies",
        "- Peer dependencies",
        "- Assets",
        "## Usage",
        "```",
        "get_npm_package_info_history(name: '$PACKAGE_NAME')",
        "```",
      ].join("\n"),
      inputSchema: {
        name: z
          .string()
          .describe("The name of the npm package to get information about."),
      },
      outputSchema: structuredPackageStatsHistoryOutput.schema,
    },
    async ({ name: rawName }) => {
      const name = rawName.trim();

      try {
        if (!isNonEmptyString(name)) {
          return structuredPackageStatsHistoryOutput.error({
            code: "InvalidInputError",
            messages: ["Package name must be a non-empty string"],
          });
        }
        const packageInfo = await fetchPackageHistory(name);

        if (isPackageHistoryAPIErrorResponse(packageInfo)) {
          return structuredPackageStatsHistoryOutput.error(
            structuredErrorOfPackageHistoryAPI(packageInfo),
          );
        }

        return structuredPackageStatsHistoryOutput.success(packageInfo);
      } catch (error) {
        console.error(error);
        return structuredPackageStatsHistoryOutput.error({
          code: "FetchError",
          messages: [
            "An error occurred while fetching the package history from bundlephobia.",
            error instanceof Error ? error.message : String(error),
          ],
        });
      }
    },
  );

  // for ChatGPT
  // https://platform.openai.com/docs/mcp#create-an-mcp-server
  server.registerTool(
    "search",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
        title: "Get information about an npm package",
      },
      description: [
        "Get all the past information about an npm package stored in bundlephobia.",
        "",
        "For example, you can retrieve information about:",
        "- Bundle size",
        "- Tree-shakeability",
        "- Dependencies",
        "- Peer dependencies",
        "- Assets",
        "## Usage",
        "```",
        "search(query: '$PACKAGE_NAME')",
        "```",
      ].join("\n"),
      inputSchema: {
        query: z
          .string()
          .describe("The name of the npm package to get information about."),
      },
    },
    async ({ query }) => {
      const name = query.trim();

      if (!isNonEmptyString(name)) {
        return structuredPackageStatsHistoryOutput.error({
          code: "InvalidInputError",
          messages: ["Package name must be a non-empty string"],
        });
      }
      const packageInfo = await fetchPackageHistory(name);

      if (isPackageHistoryAPIErrorResponse(packageInfo)) {
        return structuredPackageStatsHistoryOutput.error(
          structuredErrorOfPackageHistoryAPI(packageInfo),
        );
      }

      return buildSearchOutput(packageInfo);
    },
  );

  // for ChatGPT
  // https://platform.openai.com/docs/mcp#create-an-mcp-server
  server.registerTool(
    "fetch",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
        title: "Get a version history of npm packages",
      },
      description: [
        "Get information about an npm package with bundlephobia.",
        "",
        "For example, you can retrieve information about:",
        "- Bundle size",
        "- Tree-shakeability",
        "- Dependencies",
        "- Peer dependencies",
        "- Assets",
        "## Usage",
        "```",
        "fetch(id: '$PACKAGE_NAME@$VERSION')",
        "```",
      ].join("\n"),
      inputSchema: {
        id: z
          .string()
          .describe(
            "The name and version of the npm package to fetch. e.g. hono@4.8.7",
          ),
      },
    },
    async ({ id }) => {
      const [name, version] = id.split("@").map((s) => s.trim());
      if (!isNonEmptyString(name) || !isNonEmptyString(version)) {
        return structuredPackageStatsOutput.error({
          code: "InvalidInputError",
          messages: ["Package name and version must be non-empty strings"],
        });
      }

      const packageInfo = await fetchPackageHistory(name);
      if (isPackageHistoryAPIErrorResponse(packageInfo)) {
        return structuredPackageStatsHistoryOutput.error(
          structuredErrorOfPackageHistoryAPI(packageInfo),
        );
      }

      return buildFetchOutput(packageInfo, name, version);
    },
  );

  return server;
};
