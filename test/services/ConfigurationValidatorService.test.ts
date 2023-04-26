import TestDriver from '@airtable/blocks-testing';

import {describe, expect, it} from '@jest/globals';
import {basicTestFixture} from '../basic-test-fixture';
import {getConfigurationValidatorForBase} from "../../src/services/ConfigurationValidatorService";
import {blankConfigurationState, combinedConfigKeys, combinedRequiredConfigKeys} from "../../src/utils/Constants";
import {
    OptionalFieldName,
    RequiredFieldName,
    TablesAndFieldsConfigurationIds,
    TableName
} from "../../src/types/ConfigurationTypes";
import {Field, Table} from "@airtable/blocks/models";

const testDriver = new TestDriver(basicTestFixture);
const validateConfiguration = getConfigurationValidatorForBase(testDriver.base);

describe('ConfigurationValidatorService', () => {

    it('Shows errors when all required fields are empty.', () => {
        const validationResult = validateConfiguration(blankConfigurationState);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedRequiredConfigKeys).forEach(configKey => expect(validationResult.errors[configKey]).toBe('This value is required.'));
            Object.values(OptionalFieldName).forEach(configKey => expect(validationResult.errors[configKey]).toBe(''));
        } else throw new Error('Validation Errors missing');
    });

    it('Shows errors when some required fields are empty.', () => {
        const initialConfiguration: TablesAndFieldsConfigurationIds = {...blankConfigurationState};
        initialConfiguration.recipientTable = 'someNonEmptyValue';
        const validationResult = validateConfiguration(initialConfiguration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedRequiredConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === TableName.recipientTable ? '' : 'This value is required.';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
            Object.values(OptionalFieldName).forEach(configKey => expect(validationResult.errors[configKey]).toBe(''));
        } else throw new Error('Validation Errors missing');
    });

    it('Shows errors when some required fields are empty and duplicate values exist.', () => {
        const initialConfiguration: TablesAndFieldsConfigurationIds = {...blankConfigurationState};
        initialConfiguration.recipientTable = 'duplicateValue';
        initialConfiguration.inventoryTable = 'duplicateValue';
        const validationResult = validateConfiguration(initialConfiguration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedRequiredConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === TableName.recipientTable || configKey === TableName.inventoryTable ? 'Configuration values must be unique.' : 'This value is required.';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
            Object.values(OptionalFieldName).forEach(configKey => expect(validationResult.errors[configKey]).toBe(''));
        } else throw new Error('Validation Errors missing');
    });

    it('Shows errors when config ids are valid but table does not exist.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "",
            checkedInField: "invalidFieldId",
            checkoutsTable: "invalidCheckoutsTable",
            dateCheckedInField: "",
            dateCheckedOutField: "",
            dateDueField: "",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "invalidFieldId2",
            linkedRecipientTableField: "invalidFieldId3",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === TableName.checkoutsTable ? 'Table no longer exists' : '';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
        } else throw new Error('Validation Errors missing');
    })

    it('Shows errors when config ids and tables are valid but required field does not exist.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "fldCartId",
            checkedInField: "fldCheckedIn",
            checkoutsTable: "tblTestCheckouts",
            dateCheckedInField: "fldDateCheckedIn",
            dateCheckedOutField: "",
            dateDueField: "",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "fldCheckedOutItem",
            linkedRecipientTableField: "fldCheckedOutToInvalid",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === RequiredFieldName.linkedRecipientTableField ? 'Field no longer exists' : '';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
        } else throw new Error('Validation Errors missing');
    })

    it('Shows errors when config ids and tables are valid but specified optional field does not exist.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "fldCartId",
            checkedInField: "fldCheckedIn",
            checkoutsTable: "tblTestCheckouts",
            dateCheckedInField: "fldDateCheckedIn",
            dateCheckedOutField: "",
            dateDueField: "invalidFieldId",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "fldCheckedOutItem",
            linkedRecipientTableField: "fldCheckedOutTo",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === OptionalFieldName.dateDueField ? 'Previously enabled optional field no longer exists.' : '';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
        } else throw new Error('Validation Errors missing');
    })

    it('Shows errors when config ids and tables are valid but field types are incorrect.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "fldCartId",
            checkedInField: "fldDateCheckedIn",
            checkoutsTable: "tblTestCheckouts",
            dateCheckedInField: "",
            dateCheckedOutField: "",
            dateDueField: "",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "fldCheckedOutItem",
            linkedRecipientTableField: "fldCheckedOutTo",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedConfigKeys).forEach(configKey => {
                const expectedErrorString = configKey === RequiredFieldName.checkedInField ? 'Field must be of type checkbox' : '';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
        } else throw new Error('Validation Errors missing');
    })

    it('Shows errors when config ids and tables are valid but field links are incorrect.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "fldCartId",
            checkedInField: "fldCheckedIn",
            checkoutsTable: "tblTestCheckouts",
            dateCheckedInField: "",
            dateCheckedOutField: "",
            dateDueField: "",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "fldCheckedOutTo",
            linkedRecipientTableField: "fldCheckedOutItem",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeTruthy();
        if (validationResult.errorsPresent) {
            Object.values(combinedConfigKeys).forEach(configKey => {
                let expectedErrorString: string;
                if (configKey === RequiredFieldName.linkedRecipientTableField) {
                    expectedErrorString = "Field must link to the 'Test Recipients' table";
                } else if (configKey === RequiredFieldName.linkedInventoryTableField) {
                    expectedErrorString = "Field must link to the 'Test Inventory' table";
                } else expectedErrorString = '';
                expect(validationResult.errors[configKey]).toBe(expectedErrorString);
            });
        } else throw new Error('Validation Errors missing');
    })

    it('Returns validated configuration with optional fields undefined when validation passes.', () => {
        const configuration: TablesAndFieldsConfigurationIds = {
            cartGroupField: "fldCartId",
            checkedInField: "fldCheckedIn",
            checkoutsTable: "tblTestCheckouts",
            dateCheckedInField: "",
            dateCheckedOutField: "",
            dateDueField: "",
            inventoryTable: "tblTestInventory",
            linkedInventoryTableField: "fldCheckedOutItem",
            linkedRecipientTableField: "fldCheckedOutTo",
            recipientTable: "tblTestRecipients"
        }

        const validationResult = validateConfiguration(configuration);
        expect(validationResult.errorsPresent).toBeFalsy();
        if (!validationResult.errorsPresent) {
            const config = validationResult.configuration;
            expect(config.inventoryTable).toBeInstanceOf(Table);
            expect(config.recipientTable).toBeInstanceOf(Table);
            expect(config.checkoutsTable).toBeInstanceOf(Table);
            expect(config.cartGroupField).toBeInstanceOf(Field);
            expect(config.checkedInField).toBeInstanceOf(Field);
            expect(config.linkedInventoryTableField).toBeInstanceOf(Field);
            expect(config.linkedRecipientTableField).toBeInstanceOf(Field);
            expect(config.dateCheckedInField).toBeUndefined();
            expect(config.dateCheckedOutField).toBeUndefined();
            expect(config.dateDueField).toBeUndefined();
        }
    })

});