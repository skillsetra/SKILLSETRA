// Demo mode is ON unless NEXT_PUBLIC_DEMO_MODE is explicitly set to "false".
// (Previously a missing .env.local silently disabled the demo and the "Try demo" button did nothing.)
export const DEMO_ENABLED=process.env.NEXT_PUBLIC_DEMO_MODE!=="false";
