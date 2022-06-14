import { IDropdownOption, ILink, Link, Stack } from '@fluentui/react';
import { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import RadioButtonNoFormik from '../../../components/form-controls/RadioButtonNoFormik';
import ReactiveFormControl from '../../../components/form-controls/ReactiveFormControl';
import { ArmObj, ArmSku } from '../../../models/arm-obj';
import { ResourceGroup } from '../../../models/resource-group';
import { ServerFarm } from '../../../models/serverFarm/serverfarm';
import { PortalContext } from '../../../PortalContext';
import { CommonConstants } from '../../../utils/CommonConstants';
import { ArmPlanDescriptor } from '../../../utils/resourceDescriptors';
import Url from '../../../utils/url';
import { SpecPickerOutput } from '../spec-picker/specs/PriceSpec';
import { headerStyle, labelSectionStyle, planTypeStyle } from './ChangeAppPlan.styles';
import { ChangeAppPlanTierTypes, DestinationPlanDetailsProps } from './ChangeAppPlan.types';
import { CreateOrSelectPlan, CreateOrSelectPlanFormValues, NEW_PLAN, addNewPlanToOptions } from './CreateOrSelectPlan';
import { addNewRgOption } from './CreateOrSelectResourceGroup';

export const DestinationPlanDetails: React.FC<DestinationPlanDetailsProps> = ({
  formProps,
  currentServerFarm,
  hostingEnvironment,
  resourceGroups,
  serverFarms,
}) => {
  const changeSkuLinkElement = useRef<ILink | null>(null);

  const { t } = useTranslation();
  const portalCommunicator = useContext(PortalContext);

  const subscriptionId = new ArmPlanDescriptor(currentServerFarm.id).subscription;
  const isNewChangeAspEnabled = Url.getFeatureValue(CommonConstants.FeatureFlags.enableFunctionsDynamicToPremium) === 'true';

  const getSelectedResourceGroupString = () => {
    const { isNewPlan, newPlanInfo, existingPlan } = formProps.values.serverFarmInfo;

    if (isNewPlan) {
      if (newPlanInfo.isNewResourceGroup) {
        return t('newFormat').format(newPlanInfo.newResourceGroupName);
      }
      return `${(newPlanInfo.existingResourceGroup as ArmObj<ResourceGroup>).name}`;
    }

    const planDescriptor = new ArmPlanDescriptor((existingPlan as ArmObj<ServerFarm>).id);
    return planDescriptor.resourceGroup;
  };

  const getPricingTierValue = (currentServerFarmId: string, linkElement: React.MutableRefObject<ILink | null>) => {
    const skuString = getSelectedSkuString();

    if (formProps.values.serverFarmInfo.isNewPlan) {
      return (
        <Link
          aria-label={`${t('pricingTier')} ${skuString}`}
          onClick={() => openSpecPicker(currentServerFarmId, linkElement)}
          componentRef={ref => (linkElement.current = ref)}>
          {skuString}
        </Link>
      );
    }

    return (
      <span tabIndex={0} aria-label={`${t('pricingTier')} ${skuString}`}>
        {getSelectedSkuString()}
      </span>
    );
  };

  const getSelectedSkuString = () => {
    const { isNewPlan, newPlanInfo, existingPlan } = formProps.values.serverFarmInfo;
    let tier: string;
    let skuCode: string;
    if (isNewPlan) {
      skuCode = newPlanInfo.skuCode;
      tier = newPlanInfo.tier;
    } else {
      const sku: ArmSku = (existingPlan as ArmObj<ServerFarm>).sku as ArmSku;
      skuCode = sku.name;
      tier = sku.tier;
    }

    return `${tier} (${skuCode}) `;
  };

  const openSpecPicker = async (currentServerFarmId: string, linkElement: React.MutableRefObject<ILink | null>) => {
    const result = await portalCommunicator.openBlade<SpecPickerOutput>({
      detailBlade: 'SpecPickerFrameBlade',
      detailBladeInputs: {
        id: currentServerFarmId,
        data: {
          selectedSkuCode: 'F1',
          returnObjectResult: true,
        },
      },
      openAsContextBlade: true,
    });

    (linkElement.current as ILink).focus();

    if (result.reason === 'childClosedSelf') {
      const newServerFarmInfo = {
        ...formProps.values.serverFarmInfo,
        newPlanInfo: {
          ...formProps.values.serverFarmInfo.newPlanInfo,
          skuCode: result.data.value.skuCode,
          tier: result.data.value.tier,
        },
      };

      formProps.setFieldValue('serverFarmInfo', newServerFarmInfo);
    }
  };

  const onPlanChange = (planInfo: CreateOrSelectPlanFormValues) => {
    formProps.setFieldValue('serverFarmInfo', planInfo);
  };

  const onPlanTierChange = (planTier: ChangeAppPlanTierTypes) => {
    //TODO: (stpelleg): reload plans
  };

  const serverFarmOptions = useMemo(() => {
    const options = getDropdownOptions(serverFarms);
    addNewPlanToOptions(formProps.values.serverFarmInfo.newPlanInfo.name, options, t);
    if (options.length === 0) {
      options.unshift({
        key: formProps.values.serverFarmInfo.newPlanInfo.name,
        text: t('newFormat').format(formProps.values.serverFarmInfo.newPlanInfo.name),
        data: NEW_PLAN,
        selected: true,
      });
    }

    return options;
  }, [formProps.values.serverFarmInfo.newPlanInfo.name, serverFarms, t]);

  const rgOptions = useMemo(() => {
    const options = getDropdownOptions(resourceGroups);
    addNewRgOption(formProps.values.serverFarmInfo.newPlanInfo.newResourceGroupName, options, t);
    if (options.length === 0) {
      const newResourceGroupName = formProps.values.serverFarmInfo.newPlanInfo.newResourceGroupName;
      options.unshift({
        key: newResourceGroupName,
        text: newResourceGroupName,
        data: newResourceGroupName,
        selected: true,
      });
    }
    return options;
  }, [formProps.values.serverFarmInfo.newPlanInfo.newResourceGroupName, resourceGroups, t]);

  return (
    <>
      <Stack className={headerStyle}>
        <h4 className={labelSectionStyle}>{t('changePlanDestPlanDetails')}</h4>
      </Stack>

      {isNewChangeAspEnabled && (
        <div className={planTypeStyle}>
          <ReactiveFormControl id="planType" label={t('planType')}>
            <RadioButtonNoFormik
              id="planType"
              aria-label={t('planType')}
              defaultSelectedKey={formProps.values.serverFarmInfo.newPlanInfo.tier}
              options={[
                { key: ChangeAppPlanTierTypes.Dynamic, text: t('consumptionPlan') },
                { key: ChangeAppPlanTierTypes.ElasticPremium, text: t('functionPremiumPlan') },
              ]}
              onChange={(o, e) => e && onPlanTierChange(e.key as ChangeAppPlanTierTypes)}
            />
          </ReactiveFormControl>
        </div>
      )}

      <ReactiveFormControl id="destinationAppServicePlan" label={t('appServicePlan')} required={true}>
        <CreateOrSelectPlan
          subscriptionId={subscriptionId}
          isNewPlan={formProps.values.serverFarmInfo.isNewPlan}
          newPlanInfo={formProps.values.serverFarmInfo.newPlanInfo}
          existingPlan={formProps.values.serverFarmInfo.existingPlan}
          options={serverFarmOptions}
          resourceGroupOptions={rgOptions}
          onPlanChange={onPlanChange}
          serverFarmsInWebspace={serverFarms}
          hostingEnvironment={hostingEnvironment}
        />
      </ReactiveFormControl>

      <ReactiveFormControl id="currentResourceGroup" label={t('resourceGroup')}>
        <div tabIndex={0} aria-label={`${t('resourceGroup')} ${getSelectedResourceGroupString()}`}>
          {getSelectedResourceGroupString()}
        </div>
      </ReactiveFormControl>

      <ReactiveFormControl id="currentRegion" label={t('region')} mouseOverToolTip={t('changePlanLocationTooltip')}>
        <span tabIndex={0} aria-label={`${t('region')} ${formProps.values.site.location}`}>
          {formProps.values.site.location}
        </span>
      </ReactiveFormControl>

      <ReactiveFormControl id="currentPricingTier" label={t('pricingTier')}>
        {getPricingTierValue(currentServerFarm.id, changeSkuLinkElement)}
      </ReactiveFormControl>
    </>
  );
};

const getDropdownOptions = (objs: ArmObj<any>[]) => {
  let options: IDropdownOption[] = [];
  if (objs) {
    for (let i = 0; i < objs.length; i = i + 1) {
      options = [
        ...options,
        {
          key: objs[i].id.toLowerCase(),
          text: objs[i].name,
          data: objs[i],
          selected: i === 0,
        },
      ];
    }
  }
  return options;
};