// restricted to max 16 item types (4 bits to type definition)
export enum SerializedItem {
  Int,
  SimilarIntArray,
}

function abs(num: bigint): bigint {
  return num < 0 ? -num : num;
}

function getRequiredBytesForInt(num: bigint): number {
  const binaryString = num.toString(2);
  const necessaryBits = num < 0 ? binaryString.length : binaryString.length + 1;
  return Math.ceil(necessaryBits / 8);
}

export function intToBytes(num: bigint): Uint8Array {
  const isNegative = num < 0;
  const bytesAmountNumber = getRequiredBytesForInt(num);
  const bytes = new Uint8Array(bytesAmountNumber);
  const bytesAmount = BigInt(bytesAmountNumber);

  num = abs(num);
  for (let i = 0; i < bytesAmountNumber; i++) {
    const shift = 8n * (bytesAmount - 1n - BigInt(i));
    const byte = (num >> shift) & 0xffn;
    bytes[i] = Number(byte);
  }

  if (isNegative) bytes[0] = bytes[0] | 0b10000000;
  return bytes;
}

export function bytesToInt(bytes: Uint8Array): bigint {
  const byteLength = BigInt(bytes.length);
  const getNumberPart = (byte: number, i: number): bigint => {
    const shift = 8n * (byteLength - 1n - BigInt(i));
    return BigInt(byte) << shift;
  };

  // ignore first bit of first byte as it is sign bit
  let number = getNumberPart(bytes[0] & 0b01111111, 0);
  for (let i = 1; i < byteLength; i++) {
    number = getNumberPart(bytes[i], i) | number;
  }
  if ((bytes[0] & 0b10000000) >> 7 !== 0) number = -number;

  return number;
}

export function serializeInt(num: bigint): Uint8Array {
  const numBytes = intToBytes(num);
  const numberMetadata = (SerializedItem.Int << 4) | numBytes.length;
  return new Uint8Array([numberMetadata, ...numBytes]);
}

export function deserializeInt(bytes: Uint8Array) {
  const metadata = bytes[0];
  const code = (metadata >> 4) & 0b00001111;
  if (code !== SerializedItem.Int) {
    throw new Error("error");
  }
  const numberBytesLength = metadata & 0b00001111;
  const start = 1;
  const end = start + numberBytesLength;
  return {
    number: bytesToInt(bytes.slice(start, end)),
    byteLength: numberBytesLength + 1,
  };
}

function joinUint8Arrays(arrays: Uint8Array[], length?: number) {
  const byteLength = length ?? arrays.reduce((sum, arr) => sum + arr.length, 0);
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const array of arrays) {
    bytes.set(array, offset);
    offset += array.length;
  }

  return bytes;
}

export class ResizableUint8Array {
  private bytes: Uint8Array[] = [];
  private _length = 0;

  push(bytes: Uint8Array | number | number[]) {
    let bytesToAdd: Uint8Array;
    if (bytes instanceof Uint8Array) {
      bytesToAdd = bytes;
    } else if (Array.isArray(bytes)) {
      bytesToAdd = new Uint8Array(bytes);
    } else {
      bytesToAdd = new Uint8Array([bytes]);
    }
    this._length += bytesToAdd.length;
    this.bytes.push(bytesToAdd);
  }

  getBytesChunks(): ReadonlyArray<Uint8Array> {
    return this.bytes;
  }

  getBytes(): Uint8Array {
    return joinUint8Arrays(this.bytes, this._length);
  }
}

function serializeSimilarIntArray(numbers: bigint[]) {
  const map = new Map<bigint, ResizableUint8Array>();

  for (const number of numbers) {
    const common = number & ~0xffn;
    const diffByte = number & 0xffn;
    let bytes = map.get(common);
    if (!bytes) {
      bytes = new ResizableUint8Array();
      const commonWithLength = common &
      const commonBytes = intToBytes(common);
      bytes.push(commonBytes);
      map.set(common, bytes);
    }
    bytes.push(Number(diffByte));
  }

  const arrayMetadata = (SerializedItem.SimilarIntArray << 4) | map.size;
  const result = new ResizableUint8Array();
  result.push(arrayMetadata);

  for (const binaryArray of map.values()) {
    result.push(binaryArray.getBytes());
  }

  return result.getBytes();
}

function deserializeSimilarIntArray(bytes: Uint8Array) {
  const metadata = bytes[0];
  const code = (metadata >> 4) & 0b00001111;
  const
  if (code !== SerializedItem.SimilarIntArray) {
    throw new Error("error");
  }
}
