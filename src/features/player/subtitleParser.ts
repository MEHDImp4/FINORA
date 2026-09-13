export interface SubtitleCue {
  id?: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/**
 * Parses time string (HH:MM:SS.mmm or MM:SS.mmm) into seconds.
 * Compatible with both dot (VTT) and comma (SRT) millisecond separators.
 */
export function parseTimestamp(timeStr: string): number {
  const clean = timeStr.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(clean) || 0;
}

/**
 * Strips HTML formatting tags, ASS style tags, and unescapes basic HTML entities.
 */
export function cleanSubtitleText(text: string): string {
  return text
    .replace(/\\N/gi, "\n") // ASS/SSA hard line breaks
    .replace(/\\n/gi, "\n")
    .replace(/\{[^}]*\}/g, "") // Strip ASS/SSA style override tags like {\pos(100,200)} or {\b1}
    .replace(/<[^>]*>/g, "") // Strip HTML / VTT tags like <c.white>, <i>, <font>, etc.
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Parses WebVTT, SRT, or ASS/SSA formatted string into an array of SubtitleCue.
 */
export function parseSubtitleContent(rawContent: string): SubtitleCue[] {
  if (!rawContent || typeof rawContent !== "string") return [];

  const lines = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cues: SubtitleCue[] = [];

  // Check if content is in ASS / SSA format (commonly used for anime and series)
  const isAss = lines.some((l) => l.trim().toLowerCase().startsWith("dialogue:"));

  if (isAss) {
    let startIndex = 1;
    let endIndex = 2;
    let textIndex = 9;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();

      if (lower.startsWith("format:")) {
        const parts = line.substring(7).split(",").map((p) => p.trim().toLowerCase());
        const s = parts.indexOf("start");
        const e = parts.indexOf("end");
        const t = parts.indexOf("text");
        if (s !== -1) startIndex = s;
        if (e !== -1) endIndex = e;
        if (t !== -1) textIndex = t;
      } else if (lower.startsWith("dialogue:")) {
        const colonIdx = line.indexOf(":");
        const rest = line.substring(colonIdx + 1).trim();

        // Split up to textIndex commas, preserving all commas inside the dialogue text itself
        const fields: string[] = [];
        let cursor = 0;
        for (let f = 0; f < textIndex; f++) {
          const nextComma = rest.indexOf(",", cursor);
          if (nextComma === -1) break;
          fields.push(rest.substring(cursor, nextComma).trim());
          cursor = nextComma + 1;
        }
        const text = rest.substring(cursor);

        if (fields.length >= Math.max(startIndex, endIndex)) {
          const start = parseTimestamp(fields[startIndex] || "");
          const end = parseTimestamp(fields[endIndex] || "");
          const cleanedText = cleanSubtitleText(text);

          if (cleanedText && end > start) {
            cues.push({
              start,
              end,
              text: cleanedText
            });
          }
        }
      }
    }

    return cues.sort((a, b) => a.start - b.start);
  }

  // WebVTT / SRT Parsing
  let i = 0;
  // Skip WEBVTT header and metadata
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("WEBVTT") || line.startsWith("NOTE") || line.startsWith("STYLE")) {
      // Skip until empty line
      while (i < lines.length && lines[i].trim() !== "") {
        i++;
      }
    } else {
      break;
    }
  }

  let currentId: string | undefined;
  let currentStart = 0;
  let currentEnd = 0;
  let currentTextLines: string[] = [];
  let inCue = false;

  for (; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line contains a timestamp arrow "-->"
    if (line.includes("-->")) {
      // If we were already in a cue, flush it
      if (inCue && currentTextLines.length > 0 && currentEnd > currentStart) {
        cues.push({
          id: currentId,
          start: currentStart,
          end: currentEnd,
          text: cleanSubtitleText(currentTextLines.join("\n"))
        });
      }

      // Check if previous non-empty line was an ID
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      if (prevLine && !prevLine.includes("-->")) {
        currentId = prevLine;
      } else {
        currentId = undefined;
      }

      const arrowIndex = line.indexOf("-->");
      const startStr = line.substring(0, arrowIndex).trim();
      // The end time might have settings attached (e.g. "00:01:23.000 position:50% line:90%")
      const endRest = line.substring(arrowIndex + 3).trim();
      const endStr = endRest.split(/\s+/)[0];

      currentStart = parseTimestamp(startStr);
      currentEnd = parseTimestamp(endStr);
      currentTextLines = [];
      inCue = true;
    } else if (inCue) {
      if (line === "") {
        // End of cue block
        if (currentTextLines.length > 0 && currentEnd > currentStart) {
          cues.push({
            id: currentId,
            start: currentStart,
            end: currentEnd,
            text: cleanSubtitleText(currentTextLines.join("\n"))
          });
        }
        currentTextLines = [];
        inCue = false;
        currentId = undefined;
      } else {
        currentTextLines.push(line);
      }
    }
  }

  // Flush any trailing cue at EOF
  if (inCue && currentTextLines.length > 0 && currentEnd > currentStart) {
    cues.push({
      id: currentId,
      start: currentStart,
      end: currentEnd,
      text: cleanSubtitleText(currentTextLines.join("\n"))
    });
  }

  // Sort cues by start time
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Finds the active cue at a specific playback position (in seconds).
 * Returns null if no cue is active.
 */
export function getActiveCue(cues: SubtitleCue[], currentTimeSeconds: number): SubtitleCue | null {
  if (!cues || cues.length === 0 || currentTimeSeconds < 0) return null;

  // Binary search for efficiency with large subtitle tracks (1000+ lines)
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const cue = cues[mid];

    if (currentTimeSeconds >= cue.start && currentTimeSeconds <= cue.end) {
      return cue;
    }

    if (currentTimeSeconds < cue.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Linear check in neighborhood for overlapping cues if any
  const startIdx = Math.max(0, high - 1);
  const endIdx = Math.min(cues.length - 1, low + 1);
  for (let j = startIdx; j <= endIdx; j++) {
    if (currentTimeSeconds >= cues[j].start && currentTimeSeconds <= cues[j].end) {
      return cues[j];
    }
  }

  return null;
}
