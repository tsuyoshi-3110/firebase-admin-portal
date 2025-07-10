import { atom } from "jotai";

export const openFlagAtom = atom(false);
export const themeAtom = atom<"light" | "dark">("light");
