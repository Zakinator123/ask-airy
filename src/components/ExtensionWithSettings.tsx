import {Box, Heading, Icon, loadCSSFromString, Loader, Text, useBase, useGlobalConfig} from '@airtable/blocks/ui';
import React, {Suspense, useEffect, useState} from 'react';
import {Settings} from "./Settings";
import {ExtensionConfiguration,} from "../types/ConfigurationTypes";
// @ts-ignore
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import SearchWrapper from "./SearchWrapper";
import {About} from "./About";
import {Premium} from "./Premium";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {IconName} from "@airtable/blocks/dist/types/src/ui/icon_config";
import {GumroadLicenseVerificationService} from "../services/LicenseVerificationService";
import {toast} from "react-toastify";
import {Toast} from "./Toast";
import {PremiumStatus} from "../types/OtherTypes";
import {SearchIcon} from "./SearchIcon";
import {GlobalConfigSettingsService} from "../services/GlobalConfigSettingsService";

loadCSSFromString(`
.container {
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: white;
    gap: 0.75rem;
    height: 100%;
    overflow: hidden;
}

.react-tabs {
    -webkit-tap-highlight-color: transparent;
    width: 90%;
    max-width: 1000px;
}

.react-tabs__tab-list {
    border-bottom: 1px solid #aaa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 0;
    padding: 0 0 1rem 0;
}

.react-tabs__tab {
    display: inline-block;
    border: 1px solid transparent;
    bottom: -1px;
    position: relative;
    list-style: none;
    padding: 6px 12px;
    cursor: pointer;
}

.react-tabs__tab--selected {
    background: #fff;
    border-color: #aaa;
    color: black;
    border-radius: 5px 5px 5px 5px;
}

.react-tabs__tab--disabled {
    color: GrayText;
    cursor: default;
}

.react-tabs__tab:focus {
    outline: none;
}

.react-tabs__tab-panel {
    display: none;
}

.react-tabs__tab-panel--selected {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-color: black;
    margin-bottom: 3rem;
}

ol, ul {
    padding-inline-start: 1.5rem;
}

@media (min-width: 515px) {
    .react-tabs__tab-list {
        flex-direction: row;
        padding: 0;
    }

    .react-tabs__tab {
        border-bottom: none;
    }

    .react-tabs__tab--selected {
        border-radius: 5px 5px 0 0;
    }
    
    ol, ul {
        padding-inline-start: 2.5rem;
    }
    
    .react-tabs__tab-panel--selected {
        border-left: 1px solid #aaa;
        border-right: 1px solid #aaa;
        border-bottom: 1px solid #aaa;
    }
}

.tab-loading-state {
        display: flex;
        align-content: center;
        align-items: center;
        flex-direction: column;
        justify-content: center;
        padding: 5rem;
}
`);

export function ExtensionWithSettings({
                                          airtableMutationService,
                                          licenseVerificationService
                                      }: { airtableMutationService: AirtableMutationService, licenseVerificationService: GumroadLicenseVerificationService }) {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    const globalConfigSettingsService = new GlobalConfigSettingsService(globalConfig);

    const [premiumUpdatePending, setPremiumUpdatePending] = useState(false);
    const [configurationUpdatePending, setConfigurationUpdatePending] = useState(false);
    const [transactionIsProcessing, setTransactionIsProcessing] = useState<boolean>(false);

    const extensionConfig = globalConfig.get('extensionConfiguration') as ExtensionConfiguration | undefined;
    const premiumLicense: string | undefined = (globalConfig.get('premiumLicense') as string | undefined);
    const premiumLicenseDefined: boolean = premiumLicense !== undefined;
    const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>(premiumLicenseDefined ? 'premium' : 'free');

    const [tabIndex, setTabIndex] = useState(extensionConfig === undefined ? 1 : 1);

    const updatePending = configurationUpdatePending || transactionIsProcessing || premiumUpdatePending;

    useEffect(() => {
        if (premiumLicense !== undefined) {
            licenseVerificationService.verifyLicense(premiumLicense, false)
                .then((result) => {
                    setPremiumStatus(result.premiumStatus);
                    if (result.premiumStatus !== 'premium') {
                        toast.error(result.message, {
                            containerId: 'topLevelToast',
                            autoClose: 10000
                        });
                    }
                })
        }
    }, [premiumLicense, licenseVerificationService]);

    const TabText = ({text}: { text: string }) =>
        <Text display='inline-block'
              textColor={updatePending ? 'lightgray' : 'black'}>
            &nbsp;{text}&nbsp;
        </Text>

    const TabIcon = ({iconName}: { iconName: IconName }) =>
        <Icon position='relative' top='1px' fillColor={updatePending ? 'lightgray' : 'black'} name={iconName} size={12}/>


    return <Box className='container'>
        <Toast containerId='topLevelToast'/>
        <Heading size='xlarge'><SearchIcon/>  &nbsp; IntelliSearch</Heading>
        <Tabs selectedIndex={tabIndex} onSelect={(index: number) => {
            if (!updatePending) setTabIndex(index);
        }}>
            <TabList>
                <Tab>🔎 <TabText text='Search'/></Tab>
                <Tab>
                    <TabIcon iconName="cog"/>
                    <TabText text='Settings'/>
                </Tab>
                <Tab>
                    <TabIcon iconName="premium"/>
                    <TabText text='Premium'/>
                    <TabIcon iconName="premium"/>
                </Tab>
                <Tab>
                    <TabIcon iconName="help"/>
                    <TabText text='About'/>
                </Tab>
            </TabList>
            <Box>
                <TabPanel>
                    <Suspense fallback={
                        <Box className='tab-loading-state'>
                            <Loader scale={0.5} fillColor='#888'/>
                        </Box>}>
                        <SearchWrapper
                            airtableMutationService={airtableMutationService}
                            extensionConfiguration={extensionConfig}
                            isPremiumUser={premiumStatus === 'premium'}
                            transactionIsProcessing={transactionIsProcessing}
                            setTransactionIsProcessing={setTransactionIsProcessing}/>
                    </Suspense>
                </TabPanel>
            </Box>
            <TabPanel>
                <Settings
                    base={base}
                    globalConfigSettingsService={globalConfigSettingsService}
                    configurationUpdatePending={configurationUpdatePending}
                    setConfigurationUpdatePending={setConfigurationUpdatePending}/>
            </TabPanel>
            <TabPanel>
                <Premium
                    licenseVerificationService={licenseVerificationService}
                    premiumStatus={premiumStatus}
                    setPremiumStatus={setPremiumStatus}
                    premiumUpdatePending={premiumUpdatePending}
                    setPremiumUpdatePending={setPremiumUpdatePending}
                    globalConfig={globalConfig}
                    currentPremiumLicense={premiumLicense}/>
            </TabPanel>
            <TabPanel><About/></TabPanel>
        </Tabs>
    </Box>
}