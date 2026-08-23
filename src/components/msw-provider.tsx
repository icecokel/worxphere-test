"use client";

import { useEffect, useState, type ReactNode } from "react";

let workerStartPromise: Promise<unknown> | undefined;

function startMockWorker() {
  workerStartPromise ??= import("@/mocks/browser").then(
    function startBrowserWorker({ worker }) {
      return worker.start({ onUnhandledRequest: "bypass" });
    },
  );

  return workerStartPromise;
}

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(function initializeMockWorker() {
    startMockWorker()
      .catch(function reportMockWorkerError(error: unknown) {
        console.error("MSW를 시작하지 못했습니다.", error);
      })
      .finally(function showApplication() {
        setReady(true);
      });
  }, []);

  return ready ? children : null;
}
