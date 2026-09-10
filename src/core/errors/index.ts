export class FinoraError extends Error {
  public readonly code: string;
  public readonly timestamp: number;

  constructor(message: string, code = "FINORA_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends FinoraError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly isTimeout: boolean;

  constructor(message: string, options: { statusCode?: number; endpoint?: string; isTimeout?: boolean } = {}) {
    super(message, options.isTimeout ? "NETWORK_TIMEOUT" : "NETWORK_ERROR");
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
    this.isTimeout = Boolean(options.isTimeout);
  }
}

export class AuthenticationError extends FinoraError {
  constructor(message = "Authentication failed or session expired") {
    super(message, "AUTH_ERROR");
  }
}

export class ServerUnavailableError extends FinoraError {
  public readonly serverUrl?: string;

  constructor(message = "Server is unreachable or offline", serverUrl?: string) {
    super(message, "SERVER_UNAVAILABLE");
    this.serverUrl = serverUrl;
  }
}

export class StorageError extends FinoraError {
  public readonly storageType: "secure" | "async" | "sqlite";

  constructor(message: string, storageType: "secure" | "async" | "sqlite" = "secure") {
    super(message, `STORAGE_${storageType.toUpperCase()}_ERROR`);
    this.storageType = storageType;
  }
}

export class PlaybackError extends FinoraError {
  public readonly streamUrl?: string;
  public readonly codec?: string;

  constructor(message: string, options: { streamUrl?: string; codec?: string } = {}) {
    super(message, "PLAYBACK_ERROR");
    this.streamUrl = options.streamUrl;
    this.codec = options.codec;
  }
}
