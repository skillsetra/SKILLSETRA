declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options?: Record<string, unknown>) => Promise<any>;
        listModels?: (provider?: string | null) => Promise<any[]>;
        listModelProviders?: () => Promise<string[]>;
      };
      auth?: { isSignedIn?: () => boolean; signIn?: () => Promise<any> };
    };
  }
}
export {};
