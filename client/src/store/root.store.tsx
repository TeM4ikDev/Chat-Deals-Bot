import React, { createContext, useContext } from 'react';
import { routesStore } from './routes.store';
import scamformsStore from './scamforms.store';
import userStore from './user.store';

const store = {
    userStore,
    routesStore,
    scamformsStore,
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