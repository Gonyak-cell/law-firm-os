declare module "react" {
  export type ReactNode = unknown;
  export type Dispatch<T> = (value: T | ((previous: T) => T)) => void;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useState<T>(initialState: T | (() => T)): [T, Dispatch<T>];
  const React: {
    createElement: (...args: unknown[]) => unknown;
  };
  export default React;
}

declare module "react/jsx-runtime" {
  export function jsx(...args: unknown[]): unknown;
  export function jsxs(...args: unknown[]): unknown;
  export const Fragment: unknown;
}

declare module "*.jsx" {
  export const DataTable: (...args: unknown[]) => unknown;
  export const Panel: (...args: unknown[]) => unknown;
  export const Property: (...args: unknown[]) => unknown;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}
