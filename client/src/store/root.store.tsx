import React, { createContext, useContext } from 'react';
import userStore from './user.store';
import { routesStore } from './routes.store';

const store = {
    userStore,
    routesStore,
};

const StoreContext = createContext(store);

export const useStore = () => {
    return useContext(StoreContext);
};

interface IStoreProviderProps {
    children: React.ReactNode;
}

export const StoreProvider: React.FC<IStoreProviderProps> = ({ children }) => {
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}; 