import { Context, createContext } from 'preact';
import { Event } from '@shared/DbTypes';

type Features = {
  showRankingsScreen?: boolean;
  showStaleDataBanner?: boolean;
  useSupabaseData?: boolean;
};

export type AppContextType = {
  features?: Features
};

const AppContext: Context<AppContextType> = createContext({});

export default AppContext;
