declare module 'd3-force-3d' {
  export function forceRadial(
    radius: number | ((node: { circle: number; id: string }) => number),
    x?: number,
    y?: number,
    z?: number,
  ): {
    (alpha: number): void
    initialize?: (nodes: readonly unknown[]) => void
  }
}
