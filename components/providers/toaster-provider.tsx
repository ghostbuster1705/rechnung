"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          border: "1px solid #334155",
          padding: "12px",
          color: "#e2e8f0",
          background: "#0f172a",
        },
      }}
    />
  );
}
