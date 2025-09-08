
enum UserRoles {
    Admin = 'ADMIN',
    User = 'USER',
    SuperAdmin = 'SUPER_ADMIN',
}

type Route = {
    key: string
    path: string;
    label: string;
    shortLabel?: string;
    showInHeader?: boolean;
    icon?: string;
    disabled?: boolean;
    subRoutes?: { [key: string]: Route };
    accessRoles?: UserRoles[];
}


export let RoutesConfigMain: Route[] = [
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
            GARANTS:{
                key: 'GARANTS',
                path: '/garants',
                showInHeader:false,
                label: 'Гаранты',
                icon: 'UserRoundPen' 

            },

            ADD_PERSON:{
                key: 'ADD_PERSON',
                path: '/add-person',
                showInHeader:false,
                label: 'Добавить человека',
                icon: 'UserPlus' 

            },
            NEW_USERS_MESSAGES:{
                key: 'NEW_USERS_MESSAGES',
                path: '/new-users-messages',
                showInHeader: false,
                label: 'Приветствия',
                icon: 'MessageSquareText' 
            },
            CHAT_MESSAGES:{
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



const fs = require('fs');
const path = require('path');

function collectKeys(routes: any, isSub = false, parentKey = ''): { rootKeys: string[], subKeys: string[] } {
    let rootKeys: string[] = [];
    let subKeys: string[] = [];
    for (const route of routes) {
        const currentKey = parentKey ? `${parentKey}_${route.key}` : route.key;
        if (isSub) {
            subKeys.push(currentKey);
        } else {
            rootKeys.push(currentKey);
        }
        if (route.subRoutes) {
            const { rootKeys: childRoot, subKeys: childSub } = collectKeys(Object.values(route.subRoutes), true, currentKey);
            rootKeys = rootKeys.concat(childRoot);
            subKeys = subKeys.concat(childSub);
        }
    }
    return { rootKeys, subKeys };
}

const { rootKeys, subKeys } = collectKeys(RoutesConfigMain);

const rootRouteKeysArr = rootKeys;
const subRouteKeysArr = subKeys;

const typeDef = `// Этот файл сгенерирован автоматически. Не редактируйте вручную!

export type RootRouteKey =
${rootKeys.map((k: any) => `  | '${k}'`).join('\n')};

export type SubRouteKey =
${subKeys.length ? subKeys.map((k: any) => `  | '${k}'`).join('\n') : '  | never'};

export type RouteKey = RootRouteKey | SubRouteKey;

export const rootRouteKeys = ${JSON.stringify(rootRouteKeysArr, null, 2)} as const;

export const subRouteKeys = ${JSON.stringify(subRouteKeysArr, null, 2)} as const;
`;

const outputPath = path.resolve(__dirname, 'routeKeys.ts');
fs.writeFileSync(outputPath, typeDef, 'utf8');

console.log('RouteKey types (RootRouteKey, SubRouteKey, RouteKey) generated in src/types/routeKeys.ts');



// -------------------- ГЕНЕРАЦИЯ routeKeyPaths.ts --------------------
function collectKeyPaths(routes: any, prefix = '', parentPath = ''): any[] {
    let result: any[] = [];
    for (const route of routes) {
        const currentKey = prefix ? `${prefix}_${route.key}` : route.key;
        const currentPath = parentPath + route.path;
        const { subRoutes, ...rest } = route;
        result.push({ ...rest, key: currentKey, path: currentPath, isSubRoute: !!subRoutes });
        if (subRoutes) {
            result = result.concat(collectKeyPaths(Object.values(subRoutes), currentKey, currentPath));
        }
    }
    return result;
}

const allKeyPaths = collectKeyPaths(RoutesConfigMain);

const iconSet = new Set<string>();
allKeyPaths.forEach(r => { if (r.icon) iconSet.add(r.icon); });
const iconImports = Array.from(iconSet).length > 0 ? `import { ${Array.from(iconSet).join(", ")} } from 'lucide-react';\n` : '';


function iconStringToComponent(obj: any): any {
    if (Array.isArray(obj)) return obj.map(iconStringToComponent);
    if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            if (key === 'icon' && typeof obj[key] === 'string') {
                newObj[key] = obj[key]; // временно строка, заменим ниже
            } else {
                newObj[key] = iconStringToComponent(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}
let keyPathsObj = iconStringToComponent(allKeyPaths);
let keyPathsStr = JSON.stringify(keyPathsObj, null, 2)
    .replace(new RegExp(`"(${Array.from(iconSet).join('|')})"`, 'g'), '$1');

const keyPathsDef = `
    // Этот файл сгенерирован автоматически. Не редактируйте вручную!

    import type { LucideIcon } from 'lucide-react';
    import { RouteKey } from './routeKeys';

    export type Route = {
        key: RouteKey;
        path: string;
        label: string;
        shortLabel?: string;
        showInHeader?: boolean;
        icon?: LucideIcon;
        disabled?: boolean;
        accessRoles?: string[];
        isSubRoute?: boolean;
    };

    ${iconImports}

   

    export const routeKeyPaths: Route[] = ${keyPathsStr} as const;

`;

const keyPathsOutputPath = path.resolve(__dirname, 'routeKeyPaths.ts');
fs.writeFileSync(keyPathsOutputPath, keyPathsDef, 'utf8');

console.log('RouteKeyPaths generated in src/types/routeKeyPaths.ts'); 