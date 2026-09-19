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

    // Jellyfin's dedicated favorite endpoints (POST/DELETE /Users/{userId}/FavoriteItems/{itemId})
    // read then save the *entire* UserItemData record server-side. If the server's in-memory copy
    // is stale or absent, that rewrite can zero PlaybackPositionTicks (and flip Played), which
    // silently drops an in-progress item from Continue Watching.
    //
    // POST /UserItems/{itemId}/UserData accepts a partial UpdateUserItemDataDto and applies only the
    // fields that are present, so sending IsFavorite alone can never touch playback progress.
    // Endpoint + query parameter verified against @jellyfin/sdk `ItemsApi.updateItemUserData`
    // (userId is a query parameter, body is UpdateUserItemDataDto).
    await http.request(`/UserItems/${itemId}/UserData`, {
      method: "POST",
      params: { userId },
      body: JSON.stringify({ IsFavorite: isFavorite })
    });
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

  public async removeFromResume(
    userId: string,
    itemId: string,
    customClient?: HttpClient
  ): Promise<void> {
    if (!userId || !itemId) {
      throw new FinoraError("Both userId and itemId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    try {
      await http.request(`/PlayingItems/${itemId}`, { method: "DELETE" });
    } catch {
      // Best effort cleanup
    }
    try {
      await http.request(`/Users/${userId}/PlayedItems/${itemId}`, { method: "DELETE" });
    } catch {
      // Best effort cleanup
    }
  }
}

export const userDataRepository = new UserDataRepository();
