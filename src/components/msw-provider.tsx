"use client";

import { useEffect, useState, type ReactNode } from "react";

let workerStartPromise: Promise<unknown> | undefined;

function startMockWorker() {
  workerStartPromise ??= import("@/mocks/browser").then(({ worker }) =>
    worker.start({ onUnhandledRequest: "bypass" }),
  );

  return workerStartPromise;
}

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startMockWorker()
      .catch((error: unknown) => {
        console.error("MSW를 시작하지 못했습니다.", error);
      })
      .finally(() => setReady(true));
  }, []);

  return ready ? children : null;
}
