import {Base, Field, Table} from "@airtable/blocks/models";
import React, {useEffect, useState} from "react";
import {Box, Button, ConfirmationDialog, FieldIcon, FormField, Select, Switch, Text} from "@airtable/blocks/ui";
import {Toast} from "./Toast";
import {toast} from "react-toastify";
import {AiryTableConfig} from "../types/ConfigurationTypes";
import {aiProviderData} from "../types/Constants";

export const AiryTableConfigDialog = ({setAiryTableConfigs, airyTableConfigs, base}: {
    setAiryTableConfigs: (airyTableConfigs: (prevAiryTables: AiryTableConfig[]) => AiryTableConfig[]) => void,
    airyTableConfigs: AiryTableConfig[],
    base: Base
}) => {
    const [newAiryTable, setNewAiryTable] = useState<Table | undefined>(undefined);
    const [newAiryTableFields, setNewAiryTableFields] = useState<Field[]>([]);
    const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
    useEffect(() => () => toast.dismiss(), []);

    if (newAiryTable && newAiryTable.isDeleted) {
        setNewAiryTable(undefined);
        setNewAiryTableFields([]);
        return <></>;
    }

    newAiryTableFields.forEach(field => {
        if (field.isDeleted) {
            setNewAiryTableFields(prevNewAiryTableFields => prevNewAiryTableFields.filter(currField => currField !== field));
        }
    });

    const getTablePickerOptions = () =>
        base.tables.filter(table => !airyTableConfigs.map(airyTable => airyTable.table).includes(table)).map(table => {
            return {value: table.id, label: table.name};
        })

    const tablePicker = getTablePickerOptions().length === 0
        ? <Box padding={3}>
            <Text size='large'>All tables have already been made accessible to Airy! Press 'Cancel' to exit this
                dialog.</Text>
        </Box>
        : <Box padding={3}>
            <FormField label='Pick a table to use with Ask Airy:'>
                <Select
                    marginBottom={2}
                    onChange={(tableId) => {
                        tableId && setNewAiryTable(base.getTableByIdIfExists(tableId as string) ?? undefined);
                    }}

                    options={getTablePickerOptions()}
                    value={newAiryTable && newAiryTable.id}
                />
            </FormField>
            {
                newAiryTable && <>
                    <FormField label='Fields Airy Should Know About*'>
                        <Box display='flex' flexWrap='wrap' >
                            {/*TODO: Warn users that any data longer than X tokens will be truncated in Airy's data index. */}
                            {newAiryTable.fields.map((field, index) => {

                                for (const [, aiProviderOptions] of Object.entries(aiProviderData)) {
                                    if (field.name === aiProviderOptions.indexFieldName) {
                                        return <></>;
                                    }
                                }

                                return <Box key={index} margin={1}>
                                    <Switch
                                        label={<><Box display='inline'><FieldIcon position='relative' top='3px'
                                                                                  field={field}
                                                                                  size={16}/></Box> <Text
                                            display='inline-block'>{field.name}</Text></>}
                                        value={newAiryTableFields.includes(field)}
                                        onChange={switchBoolean => {
                                            if (switchBoolean) {
                                                setNewAiryTableFields((prevNewAiryTableFields) => [...prevNewAiryTableFields, field]);
                                            } else {
                                                setNewAiryTableFields(prevNewAiryTableFields => prevNewAiryTableFields.filter(currField => currField !== field));
                                            }
                                        }}
                                    />
                                </Box>;
                            })}
                        </Box>
                    </FormField>
                    <Text marginTop={3} marginLeft={2} size='small' textColor='gray'>
                        * Enabling unnecessary fields will decrease Airy's performance and response quality.</Text>
                </>}
            <Toast containerId='airyTablePickerToast' styles={{marginTop: '1rem'}}/>
        </Box>

    return <>
        {addTableDialogOpen &&
            <ConfirmationDialog
                width='550px'
                title="Add Table to Ask Airy"
                body={tablePicker}
                confirmButtonText="Add Table"
                onCancel={() => setAddTableDialogOpen(false)}
                onConfirm={() => {
                    if (newAiryTable === undefined) {
                        toast.error('Please select a table.', {containerId: 'airyTablePickerToast'});
                    } else if (newAiryTableFields.length === 0) {
                        toast.error('Please enable at least one field for Airy to know about.', {containerId: 'airyTablePickerToast'});
                    } else {
                        setAiryTableConfigs((prevAiryTableConfigs: AiryTableConfig[]) => [...prevAiryTableConfigs, {
                            table: newAiryTable,
                            fields: newAiryTableFields,
                            airyDataIndexFields: {
                                openai: undefined,
                            }
                        }]);
                        setNewAiryTable(undefined);
                        setNewAiryTableFields([]);
                        setAddTableDialogOpen(false);
                    }
                }}
            />}
        <Button
            margin={3}
            maxWidth='300px'
            onClick={() => setAddTableDialogOpen(true)}
            icon="plus"
        >
            Add Table
        </Button>

    </>
}