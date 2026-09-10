import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "../jellyfin/jellyfinClient";
import { UserProfile } from "../../types/media";
import { FinoraError } from "../errors";

export class UserRepository {
  private client: JellyfinClient;

  constructor(client: JellyfinClient = jellyfinClient) {
    this.client = client;
  }

  public async getUserProfile(userId: string, customClient?: HttpClient): Promise<UserProfile> {
    if (!userId) {
      throw new FinoraError("User ID is required", "INVALID_PARAMS");
    }

    const http = customClient || this.client.getHttpClient();
    const dto = await http.request<{
      Id: string;
      Name: string;
      ServerId?: string;
      HasPassword?: boolean;
    }>(`/Users/${userId}`);

    return {
      id: dto.Id,
      name: dto.Name || "User",
      serverId: dto.ServerId || "unknown",
      hasPassword: dto.HasPassword
    };
  }
}

export const userRepository = new UserRepository();
