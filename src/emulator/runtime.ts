import type { V86 } from "v86";

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

let runtime: Promise<typeof V86> | undefined;

/** Load the browser build once, only when a VM is powered on. */
export function loadRuntime(): Promise<typeof V86> {
  if (!runtime) {
    runtime = new Promise<typeof V86>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = assetUrl("v86/libv86.js");
      script.onload = () => {
        const constructor = (window as Window & { V86?: typeof V86 }).V86;
        if (constructor) resolve(constructor);
        else reject(new Error("The emulator runtime could not be initialized."));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not download the emulator. Check your connection and retry."));
      };
      document.head.append(script);
    }).catch((error) => {
      runtime = undefined;
      throw error;
    });
  }
  return runtime;
}
