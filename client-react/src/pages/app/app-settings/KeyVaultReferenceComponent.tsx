import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InformationLabel from '../../../components/InformationLabel/InformationLabel';
import { KeyVaultReference } from '../../../models/site/config';
import { ThemeContext } from '../../../ThemeContext';
import { ThemeExtended } from '../../../theme/SemanticColorsExtended';
import { style } from 'typestyle';
import { PortalContext } from '../../../PortalContext';
import { ArmSubcriptionDescriptor } from '../../../utils/resourceDescriptors';
import KeyVaultService from '../../../ApiHelpers/KeyVaultService';
import { bladeLinkStyle } from './AppSettings.styles';
import { getKeyVaultReferenceStatus, isKeyVaultReferenceUnResolved, getKeyVaultReferenceStatusIconProps } from './AppSettingsFormData';
import { KeyVaultReferenceStatus } from './AppSettings.types';
import { SiteStateContext } from '../../../SiteState';
import Url from '../../../utils/url';

export interface KeyVaultReferenceComponentProps {
  appSettingReference: KeyVaultReference;
  resourceId: string;
}

const elementWrapperStyle = (theme: ThemeExtended) =>
  style({
    borderTop: `1px solid ${theme.palette.neutralDark}`,
    marginTop: '40px',
    paddingTop: '20px',
  });

const KeyVaultReferenceComponent: React.FC<KeyVaultReferenceComponentProps> = props => {
  const { t } = useTranslation();
  const [keyVaultResourceId, setKeyVaultResourceId] = useState<string | undefined>(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const { resourceId, appSettingReference } = props;
  const { status, vaultName = '', secretName = '', secretVersion = '', details, identityType = '' } = appSettingReference;

  const theme = useContext(ThemeContext);
  const portalContext = useContext(PortalContext);
  const siteStateContext = useContext(SiteStateContext);

  const isValidValue = (value: string): boolean => {
    return !!value && value.length > 0;
  };

  const getIdentityValue = (): string => {
    return identityType.toLocaleLowerCase() === 'userassigned' ? 'User' : 'System';
  };

  const appReferenceHeaderStyle = style({
    textDecoration: 'none',
  });

  const vaultNameUri = vaultName ? `https://${vaultName}.vault.azure.net/` : '';
  const secretNameUri = secretName ? `${vaultNameUri}secrets/${secretName}/` : '';
  const secretVersionUri = secretVersion ? `${secretNameUri}/${secretVersion}` : '';

  /**
   * TODO: [krmitta] Move this to separate file while making the changes for the WI: Task 5460706
   */
  const fetchKeyVaultData = async () => {
    const armSubcriptionDescriptor = new ArmSubcriptionDescriptor(resourceId);
    if (vaultNameUri) {
      const keyVaultReference = await KeyVaultService.fetchKeyVaultReference(armSubcriptionDescriptor.getSubsriptionId(), vaultNameUri);
      if (keyVaultReference && keyVaultReference[0]) {
        setKeyVaultResourceId(keyVaultReference[0].id);
      }
    }
    setInitialLoading(false);
  };

  const onVaultNameClick = async () => {
    if (keyVaultResourceId) {
      await portalContext.openBlade({
        detailBlade: 'VaultBlade',
        detailBladeInputs: { id: keyVaultResourceId },
        extension: 'Microsoft_Azure_KeyVault',
      });
    }
  };

  const onSecretNameClick = async () => {
    if (keyVaultResourceId) {
      await portalContext.openBlade({
        detailBlade: 'ListSecretVersionsBlade',
        detailBladeInputs: { id: secretNameUri, vaultId: keyVaultResourceId },
        extension: 'Microsoft_Azure_KeyVault',
      });
    }
  };

  const onSecretVersionClick = async () => {
    if (keyVaultResourceId) {
      await portalContext.openBlade({
        detailBlade: 'SecretVersionBlade',
        detailBladeInputs: { id: secretVersionUri, vaultId: keyVaultResourceId },
        extension: 'Microsoft_Azure_KeyVault',
      });
    }
  };

  const getStatusLabel = () => {
    if (getKeyVaultReferenceStatus(appSettingReference) === KeyVaultReferenceStatus.initialized && !!siteStateContext.site) {
      const scmUri = Url.getScmUrl(siteStateContext.site);
      return (
        <InformationLabel
          value={t('keyVaultReferenceInitializedStatus')}
          id="key-status"
          label={t('status')}
          labelProps={getKeyVaultReferenceStatusIconProps(appSettingReference)}
          linkWithLabel={{
            href: scmUri,
            value: t('clickHereToAccessSite'),
          }}
        />
      );
    } else {
      return (
        <InformationLabel
          value={status}
          id="key-status"
          label={t('status')}
          labelProps={getKeyVaultReferenceStatusIconProps(appSettingReference)}
        />
      );
    }
  };

  useEffect(() => {
    fetchKeyVaultData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initialLoading) {
    return <></>;
  }

  return (
    <>
      <div id="app-settings-key-vault" className={elementWrapperStyle(theme)}>
        <h3 className={appReferenceHeaderStyle}>{t('keyVaultReferenceDetails')}</h3>
        <div>
          {isValidValue(vaultName) && (
            <InformationLabel
              value={vaultName}
              id="key-vault-name"
              className={keyVaultResourceId ? bladeLinkStyle(theme) : ''}
              onClick={() => {
                if (keyVaultResourceId) {
                  onVaultNameClick();
                }
              }}
              label={t('keyVaultName')}
            />
          )}
          {isValidValue(secretName) && (
            <InformationLabel
              value={secretName}
              id="key-secret-name"
              className={keyVaultResourceId ? bladeLinkStyle(theme) : ''}
              onClick={() => {
                if (keyVaultResourceId) {
                  onSecretNameClick();
                }
              }}
              label={t('keyVaultSecretName')}
            />
          )}
          {isValidValue(secretVersion) && (
            <InformationLabel
              value={secretVersion}
              id="key-secret-version"
              className={keyVaultResourceId ? bladeLinkStyle(theme) : ''}
              onClick={() => {
                if (keyVaultResourceId) {
                  onSecretVersionClick();
                }
              }}
              label={t('keyVaultSecretVersion')}
            />
          )}
          {isValidValue(identityType) && (
            <InformationLabel value={`${getIdentityValue()} assigned managed identity`} id="key-identity" label={t('identity')} />
          )}
          {getStatusLabel()}
          {isKeyVaultReferenceUnResolved(appSettingReference) && (
            <InformationLabel value={details} id="key-error-details" label={t('errorDetails')} />
          )}
        </div>
      </div>
    </>
  );
};
export default KeyVaultReferenceComponent;
