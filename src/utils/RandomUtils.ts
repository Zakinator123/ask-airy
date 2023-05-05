import {Id, toast} from "react-toastify";
import {AIProviderName, SearchTableConfig} from "../types/ConfigurationTypes";
import {Record} from "@airtable/blocks/models";
import {SearchTableSchema} from "../types/CoreTypes";

export function mapValues<T extends object, V>(obj: T, valueMapper: (k: keyof T, v: T[keyof T]) => V) {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, valueMapper(k as keyof T, v)])
    ) as { [K in keyof T]: V };
}

export const getRecordCardWidth = (viewportWidth: number) => Math.min(850, (viewportWidth > 600 ? viewportWidth - 280 : Math.min(305, viewportWidth - 205)));

export const generateRandomPositiveInteger = (): number => Math.floor(Math.random() * 1000);

/*
* This function wraps an async Airtable operation so that an alert is shown after 15 seconds if the promise is still pending.
* The original promise from the async operation is forwarded to the caller.
* This is useful when a user's network connection goes offline before executing a write (or read?) operation to airtable (e.g. update a record, set global config).
* The Airtable SDK does not reject the promise if the network connection is offline, and instead continually retries the operation.
* This means that the user is left waiting for the promise to resolve (both in scripts and in extensions if you set a loading state).
* Further, it seems that Airtable uses an exponential backoff strategy for retries,
* so if the network connection is offline for 4 seconds, then the user has to wait 8 seconds for the next retry.
* But if the network is offline for 2 minutes for instance, then the user has to wait 4 minutes until the next retry occurs.
* Thus, it may be helpful in some cases to give the user some feedback that they should fix their internet connection and that they may need
*  to refresh the browser and retry the operation (so that they're not just left hanging for 4 minutes even after network connection is restored).
*/
export const asyncAirtableOperationWrapper = <T>(asyncAirtableOperation: () => Promise<T>, triggerPoorNetworkConnectionToastMessage: () => Id, defaultDelayUntilToastMessageTriggered = 20000): Promise<T> => {
    return new Promise((resolve, reject) => {
        let toastId: Id | undefined = undefined;
        const timeout = setTimeout(() => {
            toastId = triggerPoorNetworkConnectionToastMessage();
        }, defaultDelayUntilToastMessageTriggered);

        return asyncAirtableOperation()
            .then((fulfilledPromise) => resolve(fulfilledPromise))
            .catch((rejectedPromise) => reject(rejectedPromise))
            .finally(() => {
                clearTimeout(timeout);
                if (toastId !== undefined) toast.dismiss(toastId);
            });
    });
}

export const changeLoadingToastToErrorToast = (errorMessage: string, toastId: Id, toastContainerId = {}) => {
    toast.update(toastId, {
        render: errorMessage,
        type: 'error',
        autoClose: 5000,
        isLoading: false,
        ...toastContainerId,
        closeButton: true
    });
}

export const removeDeletedTablesAndFieldsFromSearchTableConfigs = (searchTableConfigs: SearchTableConfig[]):
    { deletionOccurred: boolean, searchTableConfigs: SearchTableConfig[] } => {
    let deletionOccurred = false;
    const newSearchTableConfigs = searchTableConfigs
        .filter(searchTable => {
            if (searchTable.table.isDeleted) {
                deletionOccurred = true;
                return false;
            }
            return true;
        })
        .map(searchTable => {
            const newSearchFields = searchTable.searchFields.filter(searchField => {
                if (searchField.isDeleted) {
                    deletionOccurred = true;
                    return false;
                }
                return true;
            });

            const newIntelliSearchIndexFields: Partial<typeof searchTable.intelliSearchIndexFields> = {};
            for (const [aiProviderName, indexField] of Object.entries(searchTable.intelliSearchIndexFields)) {
                if (indexField !== undefined && indexField.isDeleted) {
                    deletionOccurred = true;
                    newIntelliSearchIndexFields[aiProviderName as AIProviderName] = undefined;
                } else {
                    newIntelliSearchIndexFields[aiProviderName as AIProviderName] = indexField;
                }
            }

            return {
                ...searchTable,
                searchFields: newSearchFields,
                intelliSearchIndexFields: newIntelliSearchIndexFields
            };
        });

    return {deletionOccurred: deletionOccurred, searchTableConfigs: searchTableConfigs};
};

export const serializeRecord = (record: Record, {searchFields, intelliSearchIndexField}: Omit<SearchTableSchema, 'table'>) =>
    searchFields.reduce((serializedRecordData, currentField) => {
        const fieldValue = record.getCellValueAsString(currentField.id);
        if (fieldValue !== '' && currentField.id !== intelliSearchIndexField.id) {
            return serializedRecordData + `${currentField.name} is ${fieldValue}. `;
        }
        return serializedRecordData;
    }, '')

export function cleanTemplateLiteral(str: string) {
    return str
        .split('\n')             // Split the string into an array of lines
        .map(line => line.trim()) // Remove leading and trailing whitespace from each line
        .filter(line => line)     // Remove empty lines
        .join(' ');               // Join the lines back together with a single space
}