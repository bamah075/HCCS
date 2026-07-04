import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import SvgColor from 'src/components/svg-color';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const icon = (name) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
  // OR
  // <Iconify icon="fluent:mail-24-filled" />
  // https://icon-sets.iconify.design/solar/
  // https://www.streamlinehq.com/icons
);

const ICONS = {
  job: icon('ic_job'),
  blog: icon('ic_blog'),
  chat: icon('ic_chat'),
  mail: icon('ic_mail'),
  user: icon('ic_user'),
  file: icon('ic_file'),
  lock: icon('ic_lock'),
  tour: icon('ic_tour'),
  order: icon('ic_order'),
  label: icon('ic_label'),
  blank: icon('ic_blank'),
  kanban: icon('ic_kanban'),
  folder: icon('ic_folder'),
  banking: icon('ic_banking'),
  booking: icon('ic_booking'),
  invoice: icon('ic_invoice'),
  product: icon('ic_product'),
  calendar: icon('ic_calendar'),
  disabled: icon('ic_disabled'),
  external: icon('ic_external'),
  menuItem: icon('ic_menu_item'),
  ecommerce: icon('ic_ecommerce'),
  analytics: icon('ic_analytics'),
  dashboard: icon('ic_dashboard'),
};

// ----------------------------------------------------------------------

export function useNavData() {
  const data = useMemo(
    () => [
      // OVERVIEW


      // MANAGEMENT
      // ----------------------------------------------------------------------
      {
        subheader: 'management',
        items: [
          // {
          //   title: 'performance',
          //   path: paths.dashboard.root,
          //   icon: <Iconify icon="mdi-light:chart-line" />,

          // },
     

          {
            title: 'user',
            path: paths.users.root,
            icon: ICONS.user,

          },







   
          // {
          //   title: 'Settings',
          //   path: paths.settings.root,
          //   icon: <Iconify icon="ion:settings-outline" />,
          //   children: [
          //     {
          //       title: 'Background',
          //       path: paths.settings.backgrounds,
          //       icon: ICONS.product,

          //     },
          //   ]
          // },

          {
            title: 'News',
            path: paths.news.root,
            icon: <Iconify icon="mdi:newspaper-variant-outline" />,
            children: [
              {
                title: 'Articles',
                path: paths.news.root,
              },
              {
                title: 'Categories',
                path: paths.news_category.root,
              },
            ],
          },

          {
            title: 'Media',
            path: paths.media.root,
            icon: <Iconify icon="material-symbols:perm-media-outline" />,
          },

          {
            title: 'User Tier',
            path: paths.user_tier.root,
            icon: <Iconify icon="mdi:account-star-outline" />,
          },

          {
            title: 'Consultation',
            path: paths.consultation.root,
            icon: <Iconify icon="mdi:handshake-outline" />,
          },

          {
            title: 'Subscription Plans',
            path: paths.subscription_plan.root,
            icon: <Iconify icon="mdi:package-variant-closed" />,
          },
            {
            title: 'Compliance Scan',
            path: paths.compliance_scan.root,
            icon: <Iconify icon="mdi:clipboard-check-outline" />,
          },

          {
            title: 'Orders',
            path: paths.orders.root,
            icon: ICONS.order,
          },

          {
            title: 'Translations',
            path: paths.translations.root,
            icon: <Iconify icon="mdi:translate" />,
          },

          {
            title: 'AIHR Custom Instructions',
            path: paths.aihr_prompt.root,
            icon: <Iconify icon="mdi:robot-outline" />,
          },

          {
            title: 'Manual Payments',
            path: paths.manual_payments.root,
            icon: <Iconify icon="mdi:bank-transfer" />,
          },

          {
            title: 'Subscriptions',
            path: paths.subscriptions.root,
            icon: <Iconify icon="mdi:autorenew" />,
          },
        ],
      },
      {
        subheader: 'FMAS event',
        items: [
          {
            title: 'Compliance Scan FMAS',
            path: paths.compliance_scan_fmas.root,
            icon: <Iconify icon="mdi:clipboard-check-outline" />,
          },
          {
            title: 'Quiz FMAS',
            path: paths.quiz.root,
            icon: <Iconify icon="mdi:clipboard-text-outline" />,
          },
        ],
      },
    ],
    []
  );

  return data;
}
