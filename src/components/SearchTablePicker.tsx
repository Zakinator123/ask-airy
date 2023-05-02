import {Base, Field, Table} from "@airtable/blocks/models";
import React, {useEffect, useState} from "react";
import {Box, Button, ConfirmationDialog, FieldIcon, Select, Switch, Text} from "@airtable/blocks/ui";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import {Toast} from "./Toast";
import {toast} from "react-toastify";
import {AIProviderOptions, SearchTableConfig} from "../types/ConfigurationTypes";
import {aiProviderData} from "../types/Constants";

export const SearchTablePicker = ({setSearchTables, searchTables, base}: {
    setSearchTables: (searchTables: (prevSearchTables: SearchTableConfig[]) => SearchTableConfig[]) => void,
    searchTables: SearchTableConfig[],
    base: Base
}) => {
    const [newSearchTable, setNewSearchTable] = useState<Table | undefined>(undefined);
    const [newSearchTableFields, setNewSearchTableFields] = useState<Field[]>([]);
    const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
    useEffect(() => () => toast.dismiss(), []);

    if (newSearchTable && newSearchTable.isDeleted) {
        setNewSearchTable(undefined);
        setNewSearchTableFields([]);
        return <></>;
    }

    newSearchTableFields.forEach(field => {
        if (field.isDeleted) {
            setNewSearchTableFields(prevNewSearchTableFields => prevNewSearchTableFields.filter(currField => currField !== field));
        }
    });

    const getTablePickerOptions = () =>
        base.tables.filter(table => !searchTables.map(searchTable => searchTable.table).includes(table)).map(table => {
            return {value: table.id, label: table.name};
        })

    const tablePicker = getTablePickerOptions().length === 0
        ? <Box padding={3}>
            <Text size='large'>All tables are already added to the search index! Press 'Cancel' to exit this
                dialog.</Text>
        </Box>
        : <Box padding={3}>
            <FormFieldLabelWithTooltip fieldLabel='Table'
                                       fieldLabelTooltip='Select a table you would like to search with IntelliSearch.'/>

            <Select
                marginTop={2}
                marginBottom={2}
                onChange={(tableId) => {
                    tableId && setNewSearchTable(base.getTableByIdIfExists(tableId as string) ?? undefined);
                }}

                options={getTablePickerOptions()}
                value={newSearchTable && newSearchTable.id}
            />
            {
                newSearchTable && <>
                    <FormFieldLabelWithTooltip fieldLabel='Searchable Fields*'
                                               fieldLabelTooltip="Select fields that you'd like the IntelliSearch AI to know about."/>
                    <Box display='flex' flexWrap='wrap' marginTop={2}>
                        {newSearchTable.fields.map((field, index) => {

                            for (const [,aiProviderOptions] of Object.entries(aiProviderData)) {
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
                                    value={newSearchTableFields.includes(field)}
                                    onChange={switchBoolean => {
                                        if (switchBoolean) {
                                            setNewSearchTableFields((prevNewSearchTableFields) => [...prevNewSearchTableFields, field]);
                                        } else {
                                            setNewSearchTableFields(prevNewSearchTableFields => prevNewSearchTableFields.filter(currField => currField !== field));
                                        }
                                    }}
                                />
                            </Box>;
                        })}
                    </Box>
                    <Text marginTop={3} marginLeft={2} size='small' textColor='gray'>* Adding unnecessary fields to the
                        search
                        index will decrease search performance and quality.</Text>
                </>}
            <Toast containerId='searchTablePickerToast' styles={{marginTop: '1rem'}}/>
        </Box>

    return <>
        {addTableDialogOpen &&
            <ConfirmationDialog
                title="Add Table to IntelliSearch Index"
                body={tablePicker}
                confirmButtonText="Add Table"
                onCancel={() => setAddTableDialogOpen(false)}
                onConfirm={() => {
                    if (newSearchTable === undefined) {
                        toast.error('Please select a table to add to the search index.', {containerId: 'searchTablePickerToast'});
                    } else if (newSearchTableFields.length === 0) {
                        toast.error('Please enable at least one searchable field.', {containerId: 'searchTablePickerToast'});
                    } else {
                        setSearchTables((prevSearchTables: SearchTableConfig[]) => [...prevSearchTables, {
                            table: newSearchTable,
                            searchFields: newSearchTableFields,
                            intelliSearchIndexFields: {
                                openai: undefined,
                                cohere: undefined,
                            }
                        }]);
                        setNewSearchTable(undefined);
                        setNewSearchTableFields([]);
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
            Add Table to IntelliSearch Index
        </Button>

    </>
}