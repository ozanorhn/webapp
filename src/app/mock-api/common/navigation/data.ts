/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

const navigationItems: FuseNavigationItem[] = [
    {
        id   : 'dashboard',
        title: 'Dashboard',
        type : 'basic',
        icon : 'heroicons_outline:home',
        link : '/eom/dashboard/startseite'
    },
    {
        id   : 'analytics',
        title: 'Analytics',
        type : 'basic',
        icon : 'heroicons_outline:chart-bar-square',
        link : '/eom/dashboard/analytics'
    },
    {
        id   : 'sistrix',
        title: 'Sistrix',
        type : 'basic',
        icon : 'heroicons_outline:magnifying-glass',
        link : '/eom/dashboard/sistrix'
    },

     {
        id   : 'GEO AI',
        title: 'GEO AI',
        type : 'basic',
        icon : 'heroicons_outline:globe-alt',
        link : '/eom/dashboard/geo-ai-pack'
    },
   
];

export const defaultNavigation: FuseNavigationItem[] = [...navigationItems];
export const compactNavigation: FuseNavigationItem[] = [...navigationItems];
export const futuristicNavigation: FuseNavigationItem[] = [...navigationItems];
export const horizontalNavigation: FuseNavigationItem[] = [...navigationItems];
