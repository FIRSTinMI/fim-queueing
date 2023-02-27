import { Context, createContext } from 'preact';
import { Event } from './types';

type Features = {
  showRankingsScreen?: boolean;
};

export type AppContextType = {
  event?: Event;
  season?: number;
  token?: string;
  features?: Features
};

const AppContext: Context<AppContextType> = createContext({});

export default AppContext;
