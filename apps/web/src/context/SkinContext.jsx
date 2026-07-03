import { createContext, useContext } from "react";

export const SkinContext = createContext("matter");

export function useSkin() {
  return useContext(SkinContext);
}
