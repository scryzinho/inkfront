import { mockCloudTasks } from "@/lib/mock-data";
import { readMock, writeMock } from "@/lib/mock-storage";

const CONFIG_KEY = "inkcloud_mock_cloud_config";
const TASKS_KEY = "inkcloud_mock_cloud_tasks";

const DEFAULT_CONFIG = {
  client_id: "",
  client_secret: "",
  token: "",
  log_channel_id: null,
  message_verify: {
    message_style: "embed",
    button: { label: "Verificar", emoji: "", style: "green" },
    embed: { title: "", description: "", image_url: "", thumbnail_url: "", color: "#5865F2" },
    content: { content: "", image_url: "" },
    container: { content: "", image_url: "", thumbnail_url: "", color: "#5865F2" },
  },
  definitions: {},
  monitor_enabled: false,
};

const DEFAULT_TASKS = mockCloudTasks.map((task) => ({
  id: task.id,
  name: task.name,
  type: task.type,
  status: task.status === "completed" ? "finished" : task.status,
  progress: task.progress,
  created_at: task.createdAt,
  completed_at: task.completedAt || null,
}));

export async function fetchCloudConfig(): Promise<{ config: Record<string, any>; tasks: any[] }> {
  const config = readMock<Record<string, any>>(CONFIG_KEY, DEFAULT_CONFIG);
  const tasks = readMock<any[]>(TASKS_KEY, DEFAULT_TASKS);
  return { config, tasks };
}

export async function updateCloudConfig(config: Record<string, any>): Promise<Record<string, any>> {
  return writeMock<Record<string, any>>(CONFIG_KEY, config);
}

export async function updateCloudTasks(tasks: any[]): Promise<any[]> {
  return writeMock<any[]>(TASKS_KEY, tasks || []);
}

export async function sendCloudMessage(_payload: { channel_id: string }): Promise<void> {
  return;
}
