import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "../jellyfin/jellyfinClient";
import { FinoraError } from "../errors";

export class UserDataRepository {
  private client: JellyfinClient;

  constructor(client: JellyfinClient = jellyfinClient) {
    this.client = client;
  }

  private getHttp(customClient?: HttpClient): HttpClient {
    return customClient || this.client.getHttpClient();
  }

  public async setFavorite(
    userId: string,
    itemId: string,
    isFavorite: boolean,
    customClient?: HttpClient
  ): Promise<void> {
    if (!userId || !itemId) {
      throw new FinoraError("Both userId and itemId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const endpoint = `/Users/${userId}/FavoriteItems/${itemId}`;

    if (isFavorite) {
      await http.request(endpoint, { method: "POST" });
    } else {
      await http.request(endpoint, { method: "DELETE" });
    }
  }

  public async markPlayed(
    userId: string,
    itemId: string,
    customClient?: HttpClient
  ): Promise<void> {
    if (!userId || !itemId) {
      throw new FinoraError("Both userId and itemId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    await http.request(`/Users/${userId}/PlayedItems/${itemId}`, { method: "POST" });
  }

  public async markUnplayed(
    userId: string,
    itemId: string,
    customClient?: HttpClient
  ): Promise<void> {
    if (!userId || !itemId) {
      throw new FinoraError("Both userId and itemId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    await http.request(`/Users/${userId}/PlayedItems/${itemId}`, { method: "DELETE" });
  }

  public async updatePlaybackPosition(
    itemId: string,
    positionTicks: number,
    customClient?: HttpClient
  ): Promise<void> {
    if (!itemId) {
      throw new FinoraError("itemId is required to report playback position", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    await http.request(`/Sessions/Playing/Progress`, {
      method: "POST",
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: positionTicks
      })
    });
  }
}

export const userDataRepository = new UserDataRepository();
