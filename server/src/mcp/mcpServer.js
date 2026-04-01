import dotenv from "dotenv";
dotenv.config();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { executeAgentTool } from "../services/agentTools.js";

const server = new McpServer({
  name: "marketpulse-ai",
  version: "1.0.0",
});

server.tool(
  "analyze_symbol",
  {
    symbol: z.string().describe("US ticker, e.g. AAPL"),
  },
  async ({ symbol }) => {
    const out = await executeAgentTool("analyze_symbol", { symbol }, {});
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

server.tool(
  "quick_quote",
  { symbol: z.string() },
  async ({ symbol }) => {
    const out = await executeAgentTool("quick_quote", { symbol }, {});
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

server.tool(
  "technical_forecast_only",
  { symbol: z.string() },
  async ({ symbol }) => {
    const out = await executeAgentTool("technical_forecast_only", { symbol }, {});
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

server.tool(
  "latest_news_headlines",
  {
    symbol: z.string(),
    companyName: z.string().optional(),
    maxItems: z.number().optional(),
  },
  async (args) => {
    const out = await executeAgentTool("latest_news_headlines", args, {});
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
