import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadSiteData, type LoadResult } from "./sources";
import { defaultData } from "./defaults";

const initial: LoadResult = {
  data: defaultData, origin: "defaults", mode: "auto", fallback: false, maintenance: { enabled: false, message: null },
};

type Ctx = LoadResult & { isLoading: boolean };
const DataCtx = createContext<Ctx>({ ...initial, isLoading: true });

export function DataProvider({ children }: { children: ReactNode }) {
  const q = useQuery({ queryKey: ["site-data"], queryFn: () => loadSiteData(), staleTime: 60_000, retry: false, refetchOnWindowFocus: false });
  const value: Ctx = { ...(q.data ?? initial), isLoading: q.isLoading };
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export const useSite = () => useContext(DataCtx);
export const useSiteData = () => useContext(DataCtx).data;
