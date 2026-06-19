import { useRef, useState, type MutableRefObject } from "react";

export function useReactiveRef<T>(initial: T): [T, (val: T) => void, MutableRefObject<T>] {
  const [state, _set] = useState<T>(initial);
  const ref = useRef<T>(state);
  const set = (val: T) => {
    ref.current = val;
    _set(val);
  };
  return [state, set, ref];
}
