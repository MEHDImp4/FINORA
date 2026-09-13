import { parseSubtitleContent, getActiveCue } from "../subtitleParser";

describe("subtitleParser", () => {
  describe("parseSubtitleContent", () => {
    it("parses valid WebVTT subtitle text into SubtitleCue objects", () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
Hello, welcome to FINORA!

2
00:00:04.200 --> 00:00:06.800
Enjoy your <i>cinematic</i> stream.
`;

      const cues = parseSubtitleContent(vtt);
      expect(cues).toHaveLength(2);
      expect(cues[0]).toEqual({
        id: "1",
        start: 1.0,
        end: 3.5,
        text: "Hello, welcome to FINORA!"
      });
      expect(cues[1]).toEqual({
        id: "2",
        start: 4.2,
        end: 6.8,
        text: "Enjoy your cinematic stream."
      });
    });

    it("parses SRT format with comma millisecond separators and strips tags", () => {
      const srt = `1
00:01:15,500 --> 00:01:18,250
<font color="#ffff00">Look out!</font>

2
00:01:20,000 --> 00:01:23,000
<b><i>Behind you!</i></b> &amp; don't move.
`;

      const cues = parseSubtitleContent(srt);
      expect(cues).toHaveLength(2);
      expect(cues[0].start).toBeCloseTo(75.5);
      expect(cues[0].end).toBeCloseTo(78.25);
      expect(cues[0].text).toBe("Look out!");

      expect(cues[1].start).toBeCloseTo(80.0);
      expect(cues[1].end).toBeCloseTo(83.0);
      expect(cues[1].text).toBe("Behind you! & don't move.");
    });

    it("handles mm:ss.mmm short timestamp format", () => {
      const vtt = `WEBVTT

01:20.500 --> 01:25.000
Short timestamp cue.
`;

      const cues = parseSubtitleContent(vtt);
      expect(cues).toHaveLength(1);
      expect(cues[0].start).toBeCloseTo(80.5);
      expect(cues[0].end).toBeCloseTo(85.0);
      expect(cues[0].text).toBe("Short timestamp cue.");
    });

    it("handles empty or malformed input gracefully", () => {
      expect(parseSubtitleContent("")).toEqual([]);
      expect(parseSubtitleContent("random invalid text with no cues")).toEqual([]);
      expect(parseSubtitleContent(null as any)).toEqual([]);
    });

    it("sorts cues chronologically if out of order", () => {
      const vtt = `WEBVTT

00:00:10.000 --> 00:00:12.000
Second cue

00:00:02.000 --> 00:00:05.000
First cue
`;

      const cues = parseSubtitleContent(vtt);
      expect(cues).toHaveLength(2);
      expect(cues[0].start).toBe(2);
      expect(cues[1].start).toBe(10);
    });
  });

  describe("getActiveCue", () => {
    const sampleCues = [
      { id: "1", start: 2.0, end: 5.0, text: "First line" },
      { id: "2", start: 6.0, end: 9.5, text: "Second line" },
      { id: "3", start: 12.0, end: 15.0, text: "Third line" }
    ];

    it("returns active cue when time falls strictly inside bounds", () => {
      const cue = getActiveCue(sampleCues, 3.5);
      expect(cue).toBeDefined();
      expect(cue?.text).toBe("First line");
    });

    it("returns active cue on exact boundary edges", () => {
      const startEdge = getActiveCue(sampleCues, 2.0);
      expect(startEdge?.text).toBe("First line");

      const endEdge = getActiveCue(sampleCues, 5.0);
      expect(endEdge?.text).toBe("First line");
    });

    it("returns null when time falls in gaps between cues", () => {
      expect(getActiveCue(sampleCues, 0.5)).toBeNull();
      expect(getActiveCue(sampleCues, 5.5)).toBeNull();
      expect(getActiveCue(sampleCues, 10.0)).toBeNull();
      expect(getActiveCue(sampleCues, 20.0)).toBeNull();
    });

    it("returns null for empty cue array", () => {
      expect(getActiveCue([], 5)).toBeNull();
    });
  });
});
