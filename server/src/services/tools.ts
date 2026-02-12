import { logger } from '../utils/logger.js';

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    name: 'check_calendar',
    description: 'Check availability for meetings on a given date. Use when the user wants to schedule a demo or meeting.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in ISO format (e.g. 2025-02-15)',
        },
      },
      required: ['date'],
    },
  },
  {
    type: 'function' as const,
    name: 'get_biami_info',
    description: 'Retrieve technical details and information about Biami.io (business automation, features, integrations, pricing, etc.)',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to look up (e.g. pricing, integrations, features, automation)',
        },
      },
      required: ['topic'],
    },
  },
];

export type ToolResult = { content: string };

// returns mock calendar availability for given date
export async function executeCheckCalendar(date: string): Promise<ToolResult> {
  logger.info({ date }, 'check_calendar called');
  const slots = ['9:00 AM', '10:30 AM', '2:00 PM', '4:00 PM'];
  return {
    content: `On ${date}, available slots: ${slots.join(', ')}. Would you like to book one?`,
  };
}

// returns company information based on topic
export async function executeGetBiamiInfo(topic: string): Promise<ToolResult> {
  logger.info({ topic }, 'get_biami_info called');
  const info: Record<string, string> = {
    pricing: 'Biami.io offers flexible pricing plans. Contact sales for a custom quote and free demo.',
    features: 'Biami.io provides business automation: workflow orchestration, integrations with popular tools, AI assistants, and analytics dashboards.',
    integrations: 'Integrates with Slack, Salesforce, HubSpot, Google Workspace, Microsoft 365, and 100+ connectors.',
    automation: 'Automate repetitive tasks, trigger workflows on events, and build custom automations with a visual builder.',
    demo: 'We offer live demos. Use check_calendar to find an available slot.',
  };
  const lowerTopic = topic.toLowerCase();
  const content =
    info[lowerTopic] ??
    `Biami.io is a business automation platform. For specific topics, ask about: pricing, features, integrations, automation, or demo.`;
  return { content };
}

// routes tool calls to appropriate handler functions
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'check_calendar': {
      const date = String(args?.date ?? '');
      return executeCheckCalendar(date);
    }
    case 'get_biami_info': {
      const topic = String(args?.topic ?? '');
      return executeGetBiamiInfo(topic);
    }
    default:
      return { content: `Unknown tool: ${name}` };
  }
}
