import { useEffect, useState } from "react";

export type WindowSize = {
  width: number;
  height: number;
};

/**
 * Subscribes to `window.resize` and returns the current viewport size.
 * Initial value comes from `window.innerWidth/Height` so the first
 * render is already correct.
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
