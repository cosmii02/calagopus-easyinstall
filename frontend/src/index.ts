import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { Extension, ExtensionContext } from 'shared';
import AdminSettingsPage from './pages/AdminSettingsPage.tsx';
import EasyInstallPage from './pages/EasyInstallPage.tsx';
import { getExtTranslations } from './translations.ts';

class EasyInstallExtension extends Extension {
  public cardConfigurationPage: React.FC | null = AdminSettingsPage;
  public cardComponent: React.FC | null = null;

  public initialize(ctx: ExtensionContext): void {
    ctx.extensionRegistry.enterRoutes((routes) =>
      routes.addServerRoute({
        name: () => getExtTranslations().t('pages.server.easyInstall.title', {}),
        icon: faWandMagicSparkles,
        path: '/easyinstall',
        element: EasyInstallPage,
        permission: 'settings.install',
      }),
    );
  }
}

export default new EasyInstallExtension();
