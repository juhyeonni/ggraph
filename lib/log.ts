export const log = {
  error(message: string, error?: unknown): void {
    // biome-ignore lint/suspicious/noConsole: sanctioned [ggraph] error-level logger
    console.error("[ggraph]", message, error ?? "");
  },
};
