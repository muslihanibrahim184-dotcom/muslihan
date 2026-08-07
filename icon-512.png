"use client";
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloaded = false;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.update();
      // Yeni sürüm hazır olunca devral
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            sw.postMessage("skipWaiting");
          }
        });
      });
    }).catch(() => {});

    // Kontrolü yeni SW devraldığında sayfayı bir kez tazele
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);
  return null;
}
