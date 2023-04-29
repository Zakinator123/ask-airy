import {Base, Field, Table} from "@airtable/blocks/models";
import React, {useState} from "react";
import {Box, Button, ConfirmationDialog, FieldIcon, Switch, TablePicker, Text} from "@airtable/blocks/ui";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";
import {SearchTableConfig} from "./Settings";

export const SearchTablePicker = ({setSearchTables, base}: {
    setSearchTables: (searchTables: (prevSearchTables: SearchTableConfig[]) => (SearchTableConfig | { searchFields: Field[]; table: Table | undefined })[]) => void,
    base: Base
}) => {
    const [newSearchTable, setNewSearchTable] = useState<Table | undefined>(undefined);
    const [newSearchTableFields, setNewSearchTableFields] = useState<Field[]>([]);
    const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);

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

    const tablePicker = <Box padding={3}>
        <FormFieldLabelWithTooltip fieldLabel='Table'
                                   fieldLabelTooltip='Select a table you would like to search with IntelliSearch.'/>
        <TablePicker
            marginTop={2}
            marginBottom={3}
            onChange={table => {
                table && setNewSearchTable(table);
            }}
            table={newSearchTable && newSearchTable}
        />
        {
            newSearchTable && <>
                <FormFieldLabelWithTooltip fieldLabel='Fields*'
                                           fieldLabelTooltip="Select fields that you'd like the IntelliSearch AI to know about."/>
                <Box display='flex' flexWrap='wrap' marginTop={2}>
                    {newSearchTable.fields.map(field => {
                        return <Box margin={1}>
                            <Switch
                                label={<><Box display='inline'><FieldIcon position='relative' top='3px' field={field} size={16}/></Box> <Text
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
                        </Box>
                    })}
                </Box>
                <Text marginTop={3} marginLeft={2} size='small' textColor='gray'>* Adding unnecessary fields to the search
                    index will decrease search performance and quality.</Text>
            </>}
    </Box>

    return <>
        {addTableDialogOpen &&
            <ConfirmationDialog
                title="Add Table to IntelliSearch Index"
                body={tablePicker}
                onCancel={() => setAddTableDialogOpen(false)}
                onConfirm={() => {
                    setSearchTables((prevSearchTables: SearchTableConfig[]) => [...prevSearchTables, {
                        table: newSearchTable,
                        searchFields: newSearchTableFields
                    }]);
                    setAddTableDialogOpen(false);
                }}
            />}
        <Button
            onClick={() => setAddTableDialogOpen(true)}
            icon="plus"
        >
            Add Table to IntelliSearch Index
        </Button>

    </>
}