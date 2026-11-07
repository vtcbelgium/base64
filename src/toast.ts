// Zero-dependency Toast Notifier
export function showToast(message: string, durationMs = 2800): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, durationMs);
}
