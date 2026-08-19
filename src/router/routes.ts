import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'portal',
        component: () => import('pages/PortalPage.vue'),
      },
      {
        path: 'signup/:eventId',
        name: 'signup',
        component: () => import('pages/SignupFormPage.vue'),
        props: true,
      },
      {
        path: 'result',
        name: 'result',
        component: () => import('pages/SignupResultPage.vue'),
      },
      {
        path: 'lookup',
        name: 'lookup',
        component: () => import('pages/LookupPage.vue'),
      },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
