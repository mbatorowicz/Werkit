"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useDismissOnOutsidePointer(
  refs: Array<RefObject<Node | null>>,
  active: boolean,
  onDismiss: () => void,
): void {
  const refsRef = useRef(refs);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    refsRef.current = refs;
  });

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!active) return;
    const onOutsidePointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (refsRef.current.some((ref) => ref.current?.contains(target))) return;
      onDismissRef.current();
    };
    document.addEventListener("mousedown", onOutsidePointer);
    document.addEventListener("touchstart", onOutsidePointer);
    return () => {
      document.removeEventListener("mousedown", onOutsidePointer);
      document.removeEventListener("touchstart", onOutsidePointer);
    };
  }, [active]);
}
