import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === ref.current) onClose(); }}
    className="fixed inset-0 m-0 max-w-none max-h-none w-full h-full bg-black/70 text-slate-200 backdrop-blur-sm border-0 outline-none open:flex items-center justify-center p-4 z-50">
    {children}
  </dialog>;
}
