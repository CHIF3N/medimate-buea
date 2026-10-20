import { createContext, useContext } from 'react';

export interface AppUI {
  openEmergency: () => void;
  openSettings: () => void;
  openUssd: () => void;
}

export const AppCtx = createContext<AppUI>({ openEmergency() {}, openSettings() {}, openUssd() {} });
export const useApp = () => useContext(AppCtx);
