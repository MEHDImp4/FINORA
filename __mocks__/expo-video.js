const React = require("react");
const { View } = require("react-native");

class MockVideoPlayer {
  constructor(source) {
    this._source = source;
    this._playing = false;
    this._currentTime = 0;
    this._duration = 0;
    this._bufferedPosition = 0;
    this._volume = 1.0;
    this._playbackRate = 1.0;
    this._muted = false;
    this._status = "idle";
    this._listeners = new Map();
  }

  get playing() {
    return this._playing;
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(time) {
    this._currentTime = time;
    this._emit("timeUpdate", { currentTime: time, bufferedPosition: this._bufferedPosition });
  }

  get duration() {
    return this._duration;
  }

  set duration(val) {
    this._duration = val;
  }

  get bufferedPosition() {
    return this._bufferedPosition;
  }

  set bufferedPosition(val) {
    this._bufferedPosition = val;
  }

  get volume() {
    return this._volume;
  }

  set volume(val) {
    this._volume = val;
    this._emit("volumeChange", { volume: val });
  }

  get playbackRate() {
    return this._playbackRate;
  }

  set playbackRate(val) {
    this._playbackRate = val;
    this._emit("playbackRateChange", { playbackRate: val });
  }

  get status() {
    return this._status;
  }

  set status(val) {
    const oldStatus = this._status;
    this._status = val;
    this._emit("statusChange", { status: val, oldStatus });
  }

  play() {
    this._playing = true;
    this._status = "readyToPlay";
    this._emit("playingChange", { isPlaying: true });
  }

  pause() {
    this._playing = false;
    this._emit("playingChange", { isPlaying: false });
  }

  seekBy(seconds) {
    this.currentTime = Math.max(0, this._currentTime + seconds);
  }

  replay() {
    this.currentTime = 0;
    this.play();
  }

  replace(source) {
    this._source = source;
    this._emit("sourceChange", { source });
  }

  addListener(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);

    return {
      remove: () => {
        this.removeListener(event, listener);
      }
    };
  }

  removeListener(event, listener) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  _emit(event, payload) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((fn) => fn(payload));
    }
  }
}

function useVideoPlayer(source, setupCallback) {
  const playerRef = React.useRef(null);
  if (!playerRef.current) {
    playerRef.current = new MockVideoPlayer(source);
    if (typeof setupCallback === "function") {
      setupCallback(playerRef.current);
    }
  }
  return playerRef.current;
}

function createVideoPlayer(source) {
  return new MockVideoPlayer(source);
}

const VideoView = React.forwardRef(function VideoView(props, ref) {
  React.useImperativeHandle(ref, () => ({
    startPictureInPicture: jest.fn(),
    stopPictureInPicture: jest.fn(),
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn()
  }));
  return React.createElement(View, {
    testID: "expo-video-view",
    ...props
  });
});

module.exports = {
  VideoPlayer: MockVideoPlayer,
  useVideoPlayer,
  createVideoPlayer,
  VideoView,
  isPictureInPictureSupported: () => false
};
