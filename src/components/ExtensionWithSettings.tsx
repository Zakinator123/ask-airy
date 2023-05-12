import {Box, Heading, Icon, loadCSSFromString, Loader, Text, useBase, useGlobalConfig} from '@airtable/blocks/ui';
import React, {Suspense, useEffect, useState} from 'react';
import {Settings} from "./Settings";
import {ExtensionConfiguration,} from "../types/ConfigurationTypes";
// @ts-ignore
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import AskAiryWrapper from "./AskAiryWrapper";
import {About} from "./About";
import {License} from "./License";
import {AirtableMutationService} from "../services/AirtableMutationService";
import {IconName} from "@airtable/blocks/dist/types/src/ui/icon_config";
import {GumroadLicenseVerificationService} from "../services/LicenseVerificationService";
import {toast} from "react-toastify";
import {Toast} from "./Toast";
import {LicenseStatus} from "../types/OtherTypes";
import {AskAiryIcon} from "./AskAiryIcon";
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

/*
    TODO: Future improvements:
        - Add voice-to-text for Ask Airy
        - Add support for gpt 4
        - Allow for tuning context data size vs. response size
        - Add proxy support so that users don't need to bring their own key if they don't want to
        - Add feature to disable search index updates so that people without edit access can search?
        - Add feature to enable users to eject out of data indexing and search anyways
        - Store vectors in vector DB uniquely identified by the user's license or base id instead of in Airtable


        Features needed to ship:
            - Add link to Airtable privacy policy
            - Set temp to 0?
            - Fix issue of "record name" showing up awkwardly in response
            - Make sure Ic.createContext error isn't happening in production
            - Update about page
            - improve "views" ui to be less awkward
 */
export function ExtensionWithSettings({
                                          airtableMutationService,
                                          licenseVerificationService
                                      }: { airtableMutationService: AirtableMutationService, licenseVerificationService: GumroadLicenseVerificationService }) {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    const globalConfigSettingsService = new GlobalConfigSettingsService(globalConfig, base);

    const extensionConfig: ExtensionConfiguration | undefined = globalConfigSettingsService.getExtensionConfigurationFromGlobalConfig();
    const [premiumUpdatePending, setPremiumUpdatePending] = useState(false);
    const [configurationUpdatePending, setConfigurationUpdatePending] = useState(false);
    const [transactionIsProcessing, setTransactionIsProcessing] = useState<boolean>(false);

    const license: string | undefined = (globalConfig.get('license') as string | undefined);
    const licenseDefined: boolean = license !== undefined;
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>(licenseDefined ? 'license-active' : 'no-license');

    const [tabIndex, setTabIndex] = useState(extensionConfig === undefined ? 1 : 0);

    const updatePending = configurationUpdatePending || transactionIsProcessing || premiumUpdatePending;

    useEffect(() => {
        if (license !== undefined) {
            licenseVerificationService.verifyLicense(license, false)
                .then((result) => {
                    setLicenseStatus(result.licenseStatus);
                    if (result.licenseStatus !== 'license-active') {
                        toast.error(result.message, {
                            containerId: 'topLevelToast',
                            autoClose: 10000
                        });
                    }
                })
        }
    }, [license, licenseVerificationService]);

    const TabText = ({text}: { text: string }) =>
        <Text display='inline-block'
              textColor={updatePending ? 'lightgray' : 'black'}>
            &nbsp;{text}
        </Text>

    const TabIcon = ({iconName}: { iconName: IconName }) =>
        <Icon position='relative' top='1px' fillColor={updatePending ? 'lightgray' : 'black'} name={iconName} size={12}/>


    return <Box className='container'>
        <Toast containerId='topLevelToast'/>
        <Heading size='xlarge'><AskAiryIcon/>  &nbsp; Ask Airy</Heading>
        <Tabs selectedIndex={tabIndex} onSelect={(index: number) => {
            if (!updatePending) setTabIndex(index);
        }}>
            <TabList>
                <Tab>
                    <TabIcon iconName='bolt'/>
                    <TabText text='Ask Airy'/>
                </Tab>
                <Tab>
                    <TabIcon iconName="cog"/>
                    <TabText text='Settings'/>
                </Tab>
                <Tab>
                    <TabIcon iconName="dollar"/>
                    <TabText text='License'/>
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
                        <AskAiryWrapper
                            airtableMutationService={airtableMutationService}
                            extensionConfiguration={extensionConfig}
                            isLicensedUser={licenseStatus === 'license-active'}
                            askAiryIsPending={transactionIsProcessing}
                            setAskAiryIsPending={setTransactionIsProcessing}
                            base={base}
                        />
                    </Suspense>
                </TabPanel>
            </Box>
            <TabPanel>
                <Settings
                    base={base}
                    extensionConfiguration={extensionConfig}
                    globalConfigSettingsService={globalConfigSettingsService}
                    configurationUpdatePending={configurationUpdatePending}
                    setConfigurationUpdatePending={setConfigurationUpdatePending}/>
            </TabPanel>
            <TabPanel>
                <License
                    licenseVerificationService={licenseVerificationService}
                    licenseStatus={licenseStatus}
                    setLicenseStatus={setLicenseStatus}
                    licenseUpdatePending={premiumUpdatePending}
                    setLicenseUpdatePending={setPremiumUpdatePending}
                    globalConfig={globalConfig}
                    currentLicense={license}/>
            </TabPanel>
            <TabPanel><About/></TabPanel>
        </Tabs>
    </Box>
}