export class StreamCollector {
  private chunks: Buffer[] = [];

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
  }

  getContent(): string {
    return Buffer.concat(this.chunks).toString("utf-8");
  }

  getSize(): number {
    return this.chunks.reduce((sum, c) => sum + c.length, 0);
  }
}
