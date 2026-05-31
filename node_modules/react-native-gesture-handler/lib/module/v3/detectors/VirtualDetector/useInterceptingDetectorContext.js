"use strict";

import { createContext, use } from 'react';
export let InterceptingDetectorMode = /*#__PURE__*/function (InterceptingDetectorMode) {
  InterceptingDetectorMode[InterceptingDetectorMode["DEFAULT"] = 0] = "DEFAULT";
  InterceptingDetectorMode[InterceptingDetectorMode["ANIMATED"] = 1] = "ANIMATED";
  InterceptingDetectorMode[InterceptingDetectorMode["REANIMATED"] = 2] = "REANIMATED";
  return InterceptingDetectorMode;
}({});
export const InterceptingDetectorContext = /*#__PURE__*/createContext(null);
export function useInterceptingDetectorContext() {
  return use(InterceptingDetectorContext);
}
//# sourceMappingURL=useInterceptingDetectorContext.js.map