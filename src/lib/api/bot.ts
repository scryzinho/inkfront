import { MOCK_AVATAR } from "@/lib/mock-shared";

export type BotIdentityResponse = {
  name: string | null;
  avatar: string | null;
};

export async function fetchBotIdentity(_guildId?: string | null): Promise<BotIdentityResponse> {
  return {
    name: "inkCloud Bot",
    avatar: MOCK_AVATAR,
  };
}
