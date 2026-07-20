/** Type-only ZCode Desktop Extensions API v1 contract, pinned to host v0.2.0. */
export type ExtensionDisposable = {dispose: () => unknown | Promise<unknown>};

export type ExtensionLogger = {
  child: (scope: string) => ExtensionLogger;
  debug: (message: string, data?: unknown) => Promise<void>;
  info: (message: string, data?: unknown) => Promise<void>;
  warn: (message: string, data?: unknown) => Promise<void>;
  error: (message: string, data?: unknown) => Promise<void>;
};

export type ExtensionModelRef = {providerId: string; modelId: string; variant?: string};

export type ExtensionTaskSpec = {
  workspacePath: string;
  prompt: string;
  title?: string;
  mode: "plan" | "build" | "edit" | "yolo";
  model?: ExtensionModelRef;
  thoughtLevel?: string;
  toolAllowlist?: string[];
  toolDenylist?: string[];
  timeoutMs?: number;
};

export type ExtensionTaskResultStatus = "succeeded" | "failed" | "cancelled" | "timed_out" | "lost" | "needs_attention";
export type ExtensionTaskResult = {sessionId: string; status: ExtensionTaskResultStatus; error?: string};
export type ExtensionTaskRunHandle = {
  sessionId: string;
  completion: Promise<ExtensionTaskResult>;
  stop: () => Promise<void>;
};

export type ExtensionManifest = {
  apiVersion: 1;
  id: string;
  name: string;
  version: string;
  description?: string;
  entrypoints: {main?: string; renderer?: string};
  engines: {host: string; zcode: string};
  pages: Array<{id: string; title: string}>;
};

export type ExtensionContext = {
  manifest: ExtensionManifest;
  dataDir: string;
  logger: ExtensionLogger;
  ipc: {
    handle: (method: string, handler: (payload: unknown) => unknown | Promise<unknown>) => ExtensionDisposable;
    emit: (event: string, payload?: unknown) => void;
  };
  lifecycle: {onResume: (handler: () => void) => ExtensionDisposable};
  zcode: {
    readWorkspaceState: (workspacePath: string) => Promise<unknown>;
    tasks: {
      run: (spec: ExtensionTaskSpec) => Promise<ExtensionTaskRunHandle>;
      ensureVisible: (spec: {sessionId: string; workspacePath: string; title?: string}) => Promise<void>;
    };
  };
};

export type ExtensionBridge = {
  invoke<T = unknown>(method: string, payload?: unknown): Promise<T>;
  on(listener: (event: string, payload: unknown) => void): () => void;
};

export type RendererExtension = {
  id: string;
  mount(container: HTMLElement, bridge: ExtensionBridge): void | (() => void);
};

declare global {
  interface Window {
    zcodeDesktopPlugins?: ExtensionBridge;
    ZDP_REGISTER_PLUGIN_RENDERER?: (extension: RendererExtension) => void;
  }
}
