import { Context, createContext } from 'preact';
import { Event } from './types';

export type AppContextType = {
  event?: Event;
  season?: number;
  token?: string;
};

const AppContext: Context<AppContextType> = createContext({});

export default AppContext;
