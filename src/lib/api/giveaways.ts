import { mockGiveaways } from "@/lib/mock-data";
import { readMock, writeMock, updateMock } from "@/lib/mock-storage";

const STORAGE_KEY = "inkcloud_mock_giveaways";

function buildInitialGiveaways() {
  const now = Math.floor(Date.now() / 1000);
  const data: Record<string, any> = {};
  mockGiveaways.forEach((giveaway, index) => {
    data[giveaway.id] = {
      name: giveaway.title,
      mode: "real",
      author_id: null,
      created_at: giveaway.createdAt ? Math.floor(new Date(giveaway.createdAt).getTime() / 1000) : now,
      log_channel_id: giveaway.channelId || null,
      monitor_enabled: false,
      tasks: [
        {
          id: `task_${index + 1}`,
          name: "Divulgação",
          status: giveaway.status === "active" ? "running" : "pending",
          channel_id: giveaway.channelId || null,
          start_time: null,
          end_time: giveaway.endsAt ? Math.floor(new Date(giveaway.endsAt).getTime() / 1000) : null,
          min_participants: 0,
          max_participants: 0,
          max_winners: giveaway.winners || 1,
          participants: [],
          message_id: giveaway.status === "active" ? `msg_${index + 1}` : null,
        },
      ],
      prize: {
        type: "text",
        dm_notify: true,
        content: giveaway.prize,
      },
      requirements: {},
    };
  });
  return data;
}

const DEFAULT_GIVEAWAYS = buildInitialGiveaways();

export async function fetchGiveawaysData(): Promise<Record<string, any>> {
  return readMock<Record<string, any>>(STORAGE_KEY, DEFAULT_GIVEAWAYS);
}

export async function updateGiveawaysData(dataPayload: Record<string, any>): Promise<Record<string, any>> {
  return writeMock<Record<string, any>>(STORAGE_KEY, dataPayload || {});
}

export async function createGiveaway(name: string, mode: "real" | "falso"): Promise<any> {
  const id = `giveaway_${Date.now().toString(36)}`;
  const all = updateMock<Record<string, any>>(STORAGE_KEY, DEFAULT_GIVEAWAYS, (current) => ({
    ...current,
    [id]: {
      name,
      mode,
      author_id: null,
      created_at: Math.floor(Date.now() / 1000),
      tasks: [],
      prize: {
        type: "none",
        dm_notify: true,
        content: "",
      },
      requirements: {},
    },
  }));
  return { id, all };
}

export async function deleteGiveaway(id: string): Promise<any> {
  const data = updateMock<Record<string, any>>(STORAGE_KEY, DEFAULT_GIVEAWAYS, (current) => {
    const next = { ...current };
    delete next[id];
    return next;
  });
  return { data };
}

export async function sendGiveawayMessage(payload: {
  giveaway_id: string;
  task_id: string;
  resend?: boolean;
}): Promise<{ status: string; message_id: string; data: Record<string, any> }> {
  const messageId = `msg_${Date.now().toString(36)}`;
  const data = updateMock<Record<string, any>>(STORAGE_KEY, DEFAULT_GIVEAWAYS, (current) => {
    const giveaway = current[payload.giveaway_id];
    if (!giveaway) return current;
    const tasks = Array.isArray(giveaway.tasks) ? giveaway.tasks : [];
    const nextTasks = tasks.map((task: any) =>
      task.id === payload.task_id ? { ...task, message_id: messageId } : task
    );
    return {
      ...current,
      [payload.giveaway_id]: {
        ...giveaway,
        tasks: nextTasks,
      },
    };
  });
  return { status: "ok", message_id: messageId, data };
}
