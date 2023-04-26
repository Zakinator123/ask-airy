import {Box, FormField, Select, Text} from "@airtable/blocks/ui";
import {Table} from "@airtable/blocks/models";
import React from "react";
import {FieldConfiguration} from "../types/ConfigurationTypes";
import {ExpectedAppConfigFieldTypeMapping, fieldTypeLinks} from "../utils/Constants";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import {getValidFieldOptionsForFieldSelector} from "../utils/SettingsFormUtils";

export const FieldSelectorGroup = ({
                                       configurationUpdatePending,
                                       required,
                                       table,
                                       fields,
                                       formState,
                                       formErrorState,
                                       selectorChangeHandler
                                   }: {
    configurationUpdatePending: boolean,
    required: boolean,
    table: Table,
    fields: ReadonlyArray<FieldConfiguration>,
    formState: any,
    formErrorState: any,
    selectorChangeHandler: any
}) =>
    <Box display='flex' flexDirection='column'>
        <Text textDecoration='underline' as='strong' fontWeight='600'
              paddingLeft='1rem'>{required ? 'Required' : 'Optional'} Fields</Text>
        <Box padding='1rem 1rem 1rem 0'>
            {fields.map(({fieldName, fieldPickerLabel, fieldPickerTooltip}) =>
                (<FormField
                    htmlFor={fieldName}
                    key={fieldName} paddingLeft='1rem'
                    label={<FormFieldLabelWithTooltip fieldLabel={fieldPickerLabel}
                                                      fieldLabelTooltip={fieldPickerTooltip}/>}>
                    <Box>
                        <Box border='default' borderColor={formErrorState[fieldName] !== '' ? 'red' : ''}>
                            <Select
                                id={fieldName}
                                disabled={configurationUpdatePending}
                                options={getValidFieldOptionsForFieldSelector(table, ExpectedAppConfigFieldTypeMapping[fieldName], fieldTypeLinks[fieldName], formState, required)}
                                onChange={selectedOption => selectorChangeHandler(fieldName, selectedOption)}
                                value={formState[fieldName]}
                            />
                        </Box>
                        <Text textColor='red'>{formErrorState[fieldName]}</Text>
                    </Box>
                    <br/>
                </FormField>))
            }
        </Box>
    </Box>