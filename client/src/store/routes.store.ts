import { makeAutoObservable } from 'mobx';
import { routeKeyPaths } from '../types/routes/routeKeyPaths';
import { rootRouteKeys, subRouteKeys, type RootRouteKey, type RouteKey, type SubRouteKey } from '../types/routes/routeKeys';

function fillPathParams(path: string, params: Record<string, string | number>) {
    let isValid = true;
    const result = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
        if (params[key] === undefined) {
            isValid = false;
            return '';
        }
        return String(params[key]);
    });
    return isValid ? result : '';
}

class RoutesStore {
    constructor() {
        makeAutoObservable(this);
    }

    getByKey = (key: RouteKey) => {
        return routeKeyPaths.find(route => route.key === key);
    };

    getPathByKey = (key: RouteKey) => {
        const res = routeKeyPaths.find(route => route.key === key);
        if (!res) throw Error('no route');
        return res.path;
    };

    getStaticPathByKey = (key: RootRouteKey) => {
        const route = this.getByKey(key);
        if (!route) return '';
        if (route.path.includes(':')) return '';
        return route.path;
    };

    getDynamicPathByKey = (key: SubRouteKey, params: Record<string, string | number>): string => {
        const route = this.getByKey(key);
        if (!route) return '';
        if (!route.path.includes(':')) return '';
        return fillPathParams(route.path, params);
    };

    getLabelByKey = (key: RouteKey): string => {
        const route = this.getByKey(key);
        return route ? route.label : '';
    };

    getStaticSubRoutes = (parentKey: RouteKey) => {
        const prefix = parentKey + '_';
        return routeKeyPaths.filter(
            route =>
                route.key.startsWith(prefix) &&
                !route.path.includes(':')
        );
    };

    getAll = () => {
        return routeKeyPaths;
    };

    getRootRoutes = () => {
        return routeKeyPaths.filter(route => rootRouteKeys.includes(route.key as RootRouteKey));
    };

    getSubRoutes = () => {
        return routeKeyPaths.filter(route => subRouteKeys.includes(route.key as SubRouteKey));
    };
}

export const routesStore = new RoutesStore();