import { Context, createContext } from 'preact';
import { Event } from '@shared/DbTypes';

type Features = {
  showRankingsScreen?: boolean;
  showStaleDataBanner?: boolean;
};

export type AppContextType = {
  event?: Event;
  season?: number;
  token?: string;
  features?: Features
};

const AppContext: Context<AppContextType> = createContext({});

export default AppContext;
