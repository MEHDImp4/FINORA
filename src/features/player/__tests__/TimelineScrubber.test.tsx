import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  TimelineScrubber,
  formatTime,
  formatRemainingTime
} from "../components/TimelineScrubber";

describe("TimelineScrubber", () => {
  describe("formatTime & formatRemainingTime", () => {
    it("formats seconds correctly for short durations", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(45)).toBe("0:45");
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(720)).toBe("12:00");
    });

    it("formats hours and leading zeros for long durations", () => {
      expect(formatTime(3600)).toBe("1:00:00");
      expect(formatTime(3665)).toBe("1:01:05");
      expect(formatTime(7325)).toBe("2:02:05");
    });

    it("formats remaining time with leading negative sign", () => {
      expect(formatRemainingTime(10, 100)).toBe("-1:30");
      expect(formatRemainingTime(0, 3600)).toBe("-1:00:00");
      expect(formatRemainingTime(100, 100)).toBe("-0:00");
    });
  });

  describe("Component Rendering & Pan Handling", () => {
    it("renders labels and progress tracks", () => {
      let root: any;
      act(() => {
        root = renderer.create(
          <TimelineScrubber
            currentTimeSeconds={120}
            durationSeconds={600}
            bufferedSeconds={240}
            onSeek={jest.fn()}
          />
        );
      });

      const currentLabel = root.root.findByProps({ testID: "current-time-label" });
      expect(currentLabel.props.children).toBe("2:00");

      const remainingLabel = root.root.findByProps({ testID: "remaining-time-label" });
      expect(remainingLabel.props.children).toBe("-8:00");

      const progressTrack = root.root.findByProps({ testID: "scrubber-progress" });
      // 120 / 600 = 20%
      expect(progressTrack.props.style[1].width).toBe("20%");

      const bufferTrack = root.root.findByProps({ testID: "scrubber-buffer" });
      // 240 / 600 = 40%
      expect(bufferTrack.props.style[1].width).toBe("40%");

      act(() => {
        root.unmount();
      });
    });
  });
});
