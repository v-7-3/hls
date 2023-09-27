import { Segment, Settings, Stream, StreamWithSegments } from "./index";
import {
  QueueStatuses,
  Playback,
  LoadBufferRanges,
  QueueItem,
  NumberRange,
} from "./internal-types";

export function getStreamExternalId(
  manifestResponseUrl: string,
  stream: Readonly<Stream>
): string {
  const { type, index } = stream;
  return `${manifestResponseUrl}-${type}-${index}`;
}

export function getSegmentFullExternalId(
  externalStreamId: string,
  externalSegmentId: string
) {
  return `${externalStreamId}|${externalSegmentId}`;
}

export function getSegmentFromStreamsMap(
  streams: Map<string, StreamWithSegments>,
  segmentId: string
): { segment: Segment; stream: StreamWithSegments } | undefined {
  for (const stream of streams.values()) {
    const segment = stream.segments.get(segmentId);
    if (segment) return { segment, stream };
  }
}

export function generateQueue({
  segment,
  stream,
  playback,
  settings,
  isSegmentLoaded,
}: {
  stream: Readonly<StreamWithSegments>;
  segment: Readonly<Segment>;
  playback: Readonly<Playback>;
  isSegmentLoaded: (segment: Segment) => boolean;
  settings: Pick<
    Settings,
    "highDemandTimeWindow" | "httpDownloadTimeWindow" | "p2pDownloadTimeWindow"
  >;
}): { queue: QueueItem[]; queueSegmentIds: Set<string> } {
  const bufferRanges = getLoadBufferRanges(playback, settings);
  const { localId: requestedSegmentId } = segment;

  const queue: QueueItem[] = [];
  const queueSegmentIds = new Set<string>();

  const nextSegment = stream.segments.getNextTo(segment.localId)?.[1];
  const isNextSegmentHighDemand = !!(
    nextSegment &&
    getSegmentLoadStatuses(nextSegment, bufferRanges).isHighDemand
  );

  let i = 0;
  for (const segment of stream.segments.values(requestedSegmentId)) {
    const statuses = getSegmentLoadStatuses(segment, bufferRanges);
    if (!statuses && !(i === 0 && isNextSegmentHighDemand)) break;
    if (isSegmentLoaded(segment)) continue;

    queueSegmentIds.add(segment.localId);
    statuses.isHighDemand = true;
    queue.push({ segment, statuses });
    i++;
  }

  return { queue, queueSegmentIds };
}

export function getLoadBufferRanges(
  playback: Readonly<Playback>,
  settings: Pick<
    Settings,
    "highDemandTimeWindow" | "httpDownloadTimeWindow" | "p2pDownloadTimeWindow"
  >
): LoadBufferRanges {
  const { position, rate } = playback;
  const {
    highDemandTimeWindow,
    httpDownloadTimeWindow,
    p2pDownloadTimeWindow,
  } = settings;

  const getRange = (position: number, rate: number, bufferLength: number) => {
    return {
      from: position,
      to: position + rate * bufferLength,
    };
  };
  return {
    highDemand: getRange(position, rate, highDemandTimeWindow),
    http: getRange(position, rate, httpDownloadTimeWindow),
    p2p: getRange(position, rate, p2pDownloadTimeWindow),
  };
}

export function getSegmentLoadStatuses(
  segment: Readonly<Segment>,
  loadBufferRanges: LoadBufferRanges
): QueueStatuses {
  const { highDemand, http, p2p } = loadBufferRanges;
  const { startTime, endTime } = segment;

  const isValueInRange = (value: number, range: NumberRange) =>
    value >= range.from && value < range.to;

  return {
    isHighDemand:
      isValueInRange(startTime, highDemand) ||
      isValueInRange(endTime, highDemand),
    isHttpDownloadable:
      isValueInRange(startTime, http) || isValueInRange(endTime, http),
    isP2PDownloadable:
      isValueInRange(startTime, p2p) || isValueInRange(endTime, p2p),
  };
}

export function isSegmentActual(
  segment: Readonly<Segment>,
  bufferRanges: LoadBufferRanges
) {
  const { startTime, endTime } = segment;
  const { highDemand, p2p, http } = bufferRanges;

  const isInRange = (value: number) => {
    return (
      value > highDemand.from &&
      (value < highDemand.to || value < http.to || value < p2p.to)
    );
  };

  return isInRange(startTime) || isInRange(endTime);
}

export function getControlledPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    resolve: resolve!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    reject: reject!,
  };
}
