export type StreamType = "video" | "audio";

type ByteRange = { start: number; end: number };

export interface Segment {
  id: string;
  index: number;
  url: string;
  byteRange?: ByteRange;
}

export interface Stream<S extends Segment = Segment> {
  readonly id: string;
  readonly type: StreamType;
  readonly segments: Map<string, S>;
}

// type ReadonlyMap<T extends Map<unknown, unknown>> = Omit<
//   T,
//   "set" | "delete" | "clear"
// >;
//
// type ReadonlyStream<S extends Segment = Segment> = Omit<
//   Stream<S>,
//   "segments"
// > & {
//   segments: ReadonlyMap<Stream["segments"]>;
// };

export class StreamsContainer<
  Sgm extends Segment = Segment,
  Str extends Stream<Sgm> = Stream<Sgm>
> {
  private readonly streams: Map<string, Str> = new Map();

  addPlaylist(playlistId: string, playlist: Str) {
    if (this.streams.has(playlistId)) return;
    this.streams.set(playlistId, playlist);
  }

  getStream(playlistId: string) {
    return this.streams.get(playlistId);
  }

  getSegment(segmentId: string) {
    for (const stream of this.streams.values()) {
      const segment = stream.segments.get(segmentId);
      if (segment) return segment;
    }
  }

  getStreamBySegmentId(segmentId: string) {
    for (const stream of this.streams.values()) {
      if (stream.segments.has(segmentId)) return stream;
    }
  }

  hasSegment(segmentId: string) {
    for (const stream of this.streams.values()) {
      if (stream.segments.has(segmentId)) return true;
    }
    return false;
  }

  clear() {
    this.streams.clear();
  }
}
