import { useState, useRef, useCallback, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 256;

export function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const handlersRef = useRef<{
    move: ((e: MouseEvent) => void) | null;
    up: (() => void) | null;
  }>({ move: null, up: null });

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (e: MouseEvent) => {
        const newWidth = Math.min(
          MAX_SIDEBAR_WIDTH,
          Math.max(MIN_SIDEBAR_WIDTH, startWidth + e.clientX - startX),
        );
        setSidebarWidth(newWidth);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        handlersRef.current = { move: null, up: null };
        setIsResizing(false);
      };

      handlersRef.current = { move: onMove, up: onUp };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      setIsResizing(true);
    },
    [sidebarWidth],
  );

  useEffect(() => {
    return () => {
      if (handlersRef.current.move)
        document.removeEventListener("mousemove", handlersRef.current.move);
      if (handlersRef.current.up)
        document.removeEventListener("mouseup", handlersRef.current.up);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 relative">
        <Sidebar />
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors ${isResizing ? "bg-blue-500" : ""}`}
          onMouseDown={startResize}
        />
      </div>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
