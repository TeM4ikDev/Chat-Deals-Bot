"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesConfigMain = void 0;
var UserRoles;
(function (UserRoles) {
    UserRoles["Admin"] = "ADMIN";
    UserRoles["User"] = "USER";
    UserRoles["SuperAdmin"] = "SUPER_ADMIN";
})(UserRoles || (UserRoles = {}));
exports.RoutesConfigMain = [
    {
        key: 'HOME', path: '/', label: 'Главная', showInHeader: false,
        icon: 'HomeIcon'
    },
    {
        key: 'PROFILE', path: '/profile', label: 'Профиль', showInHeader: true,
        icon: 'UserCog2Icon'
    },
    {
        key: 'ADMIN',
        path: '/admin',
        label: 'Админка',
        showInHeader: true,
        icon: 'ShieldCheckIcon',
        accessRoles: [UserRoles.Admin, UserRoles.SuperAdmin],
        subRoutes: {
            USERS: {
                key: 'USERS',
                path: '/users',
                label: 'Пользователи',
                showInHeader: false,
                icon: 'UserIcon',
                subRoutes: {
                    USER_DETAIL: {
                        key: 'ID',
                        path: '/:id',
                        // dynamic: true,
                        label: 'Детали пользователя',
                        showInHeader: false,
                    },
                }
            },
            GARANTS: {
                key: 'GARANTS',
                path: '/garants',
                showInHeader: false,
                label: 'Гаранты',
                icon: 'UserRoundPen'
            },
            ADD_PERSON: {
                key: 'ADD_PERSON',
                path: '/add-person',
                showInHeader: false,
                label: 'Добавить человека',
                icon: 'UserPlus'
            },
            NEW_USERS_MESSAGES: {
                key: 'NEW_USERS_MESSAGES',
                path: '/new-users-messages',
                showInHeader: false,
                label: 'Приветствия',
                icon: 'MessageSquareText'
            },
            CHAT_MESSAGES: {
                key: 'CHAT_MESSAGES',
                path: '/chat-messages',
                showInHeader: false,
                label: 'Сообщения в чате',
                icon: 'MessageCircle'
            },
        }
    },
    {
        key: 'SCAMFORMS',
        path: '/scamforms',
        showInHeader: true,
        label: 'Жалобы',
        icon: 'NotebookPen',
    },
    {
        key: 'SCAMMERS',
        path: '/scammers',
        showInHeader: false,
        label: 'База данных',
        icon: 'DatabaseZap',
    },
    {
        key: 'NO_RIGHTS',
        path: '/no-rights',
        label: 'Нет прав',
        shortLabel: 'Нет прав',
        showInHeader: false,
        disabled: true,
    },
    {
        key: 'NOT_FOUND',
        path: '/404',
        label: 'Страница не найдена',
        shortLabel: '404',
        showInHeader: false,
        disabled: true,
    }
];
var fs = require('fs');
var path = require('path');
function collectKeys(routes, isSub, parentKey) {
    if (isSub === void 0) { isSub = false; }
    if (parentKey === void 0) { parentKey = ''; }
    var rootKeys = [];
    var subKeys = [];
    for (var _i = 0, routes_1 = routes; _i < routes_1.length; _i++) {
        var route = routes_1[_i];
        var currentKey = parentKey ? "".concat(parentKey, "_").concat(route.key) : route.key;
        if (isSub) {
            subKeys.push(currentKey);
        }
        else {
            rootKeys.push(currentKey);
        }
        if (route.subRoutes) {
            var _a = collectKeys(Object.values(route.subRoutes), true, currentKey), childRoot = _a.rootKeys, childSub = _a.subKeys;
            rootKeys = rootKeys.concat(childRoot);
            subKeys = subKeys.concat(childSub);
        }
    }
    return { rootKeys: rootKeys, subKeys: subKeys };
}
var _a = collectKeys(exports.RoutesConfigMain), rootKeys = _a.rootKeys, subKeys = _a.subKeys;
var rootRouteKeysArr = rootKeys;
var subRouteKeysArr = subKeys;
var typeDef = "// \u042D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041D\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E!\n\nexport type RootRouteKey =\n".concat(rootKeys.map(function (k) { return "  | '".concat(k, "'"); }).join('\n'), ";\n\nexport type SubRouteKey =\n").concat(subKeys.length ? subKeys.map(function (k) { return "  | '".concat(k, "'"); }).join('\n') : '  | never', ";\n\nexport type RouteKey = RootRouteKey | SubRouteKey;\n\nexport const rootRouteKeys = ").concat(JSON.stringify(rootRouteKeysArr, null, 2), " as const;\n\nexport const subRouteKeys = ").concat(JSON.stringify(subRouteKeysArr, null, 2), " as const;\n");
var outputPath = path.resolve(__dirname, 'routeKeys.ts');
fs.writeFileSync(outputPath, typeDef, 'utf8');
console.log('RouteKey types (RootRouteKey, SubRouteKey, RouteKey) generated in src/types/routeKeys.ts');
// -------------------- ГЕНЕРАЦИЯ routeKeyPaths.ts --------------------
function collectKeyPaths(routes, prefix, parentPath) {
    if (prefix === void 0) { prefix = ''; }
    if (parentPath === void 0) { parentPath = ''; }
    var result = [];
    for (var _i = 0, routes_2 = routes; _i < routes_2.length; _i++) {
        var route = routes_2[_i];
        var currentKey = prefix ? "".concat(prefix, "_").concat(route.key) : route.key;
        var currentPath = parentPath + route.path;
        var subRoutes = route.subRoutes, rest = __rest(route, ["subRoutes"]);
        result.push(__assign(__assign({}, rest), { key: currentKey, path: currentPath, isSubRoute: !!subRoutes }));
        if (subRoutes) {
            result = result.concat(collectKeyPaths(Object.values(subRoutes), currentKey, currentPath));
        }
    }
    return result;
}
var allKeyPaths = collectKeyPaths(exports.RoutesConfigMain);
var iconSet = new Set();
allKeyPaths.forEach(function (r) { if (r.icon)
    iconSet.add(r.icon); });
var iconImports = Array.from(iconSet).length > 0 ? "import { ".concat(Array.from(iconSet).join(", "), " } from 'lucide-react';\n") : '';
function iconStringToComponent(obj) {
    if (Array.isArray(obj))
        return obj.map(iconStringToComponent);
    if (obj && typeof obj === 'object') {
        var newObj = {};
        for (var key in obj) {
            if (key === 'icon' && typeof obj[key] === 'string') {
                newObj[key] = obj[key]; // временно строка, заменим ниже
            }
            else {
                newObj[key] = iconStringToComponent(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}
var keyPathsObj = iconStringToComponent(allKeyPaths);
var keyPathsStr = JSON.stringify(keyPathsObj, null, 2)
    .replace(new RegExp("\"(".concat(Array.from(iconSet).join('|'), ")\""), 'g'), '$1');
var keyPathsDef = "\n    // \u042D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041D\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E!\n\n    import type { LucideIcon } from 'lucide-react';\n    import { RouteKey } from './routeKeys';\n\n    export type Route = {\n        key: RouteKey;\n        path: string;\n        label: string;\n        shortLabel?: string;\n        showInHeader?: boolean;\n        icon?: LucideIcon;\n        disabled?: boolean;\n        accessRoles?: string[];\n        isSubRoute?: boolean;\n    };\n\n    ".concat(iconImports, "\n\n   \n\n    export const routeKeyPaths: Route[] = ").concat(keyPathsStr, " as const;\n\n");
var keyPathsOutputPath = path.resolve(__dirname, 'routeKeyPaths.ts');
fs.writeFileSync(keyPathsOutputPath, keyPathsDef, 'utf8');
console.log('RouteKeyPaths generated in src/types/routeKeyPaths.ts');
