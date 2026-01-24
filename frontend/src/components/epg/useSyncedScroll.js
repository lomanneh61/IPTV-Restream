
import { useEffect, useRef } from "react";

/**
 * Sync vertical scrolling between two containers (bi-directional).
 */
export function useSyncedVerticalScroll() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const syncingRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const sync = (source) => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (source === "left") {
          right.scrollTop = left.scrollTop;
        } else {
          left.scrollTop = right.scrollTop;
        }
        syncingRef.current = false;
      });
    };

    const onLeftScroll = () => sync("left");
    const onRightScroll = () => sync("right");

    left.addEventListener("scroll", onLeftScroll, { passive: true });
    right.addEventListener("scroll", onRightScroll, { passive: true });

    return () => {
      left.removeEventListener("scroll", onLeftScroll);
      right.removeEventListener("scroll", onRightScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { leftRef, rightRef };
}
