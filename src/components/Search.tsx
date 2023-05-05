import React, {useState} from "react";
import {Box, RecordCardList, Select, Text} from "@airtable/blocks/ui";
import {Base, Record, Table} from "@airtable/blocks/models";
import {SearchService} from "../types/CoreTypes";
import {SearchBar} from "./SearchBar";
import {SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";
import {FormFieldLabelWithTooltip} from "./FormFieldLabelWithTooltip";


export const Search = ({
                           searchIsPending,
                           setSearchIsPending,
                           semanticSearchService,
                           searchTableConfigs,
                           base
                       }: {
    searchIsPending: boolean,
    setSearchIsPending: (pending: boolean) => void,
    semanticSearchService: SearchService,
    searchTableConfigs: SearchTableConfigWithDefinedSearchIndexField[],
    base: Base
}) => {
    const [tableToSearch, setTableToSearch] = useState<Table | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);
    const [searchAnswer, setSearchAnswer] = useState<string | undefined>(undefined);

    return (
        <Box style={{padding: '3rem', gap: '2rem', display: 'flex', flexDirection: 'column', width: '550px'}}>
            <Box>

                <FormFieldLabelWithTooltip fieldLabel={'Pick a table'}
                                           fieldLabelTooltip='Pick a table to ask the AI about.'/>
                <Select
                    options={searchTableConfigs.map(searchTableConfig => ({
                        value: searchTableConfig.table.id,
                        label: searchTableConfig.table.name
                    }))}
                    value={tableToSearch && tableToSearch.id}
                    onChange={(tableId) => {
                        tableId && setTableToSearch(base.getTableByIdIfExists(tableId as string) ?? undefined);
                    }}
                />
            </Box>

            {tableToSearch &&
                <SearchBar
                    setSearchAnswer={setSearchAnswer}
                    searchIsPending={searchIsPending}
                    setSearchIsPending={setSearchIsPending}
                    semanticSearchService={semanticSearchService}
                    searchTableConfig={(searchTableConfigs
                        // TODO: Make sure there are no edge cases here.
                        .find(searchTableConfig => searchTableConfig.table.id === tableToSearch.id) as SearchTableConfigWithDefinedSearchIndexField)}
                    setSearchResults={setSearchResults}
                />}

            {searchAnswer &&
                <Box>
                    <h3>Answer</h3>
                    {
                        searchAnswer.split('\n').map((line, index) => (
                            <Text key={index}>{line}</Text>
                        ))
                    }
                </Box>
            }

            {searchResults &&
                <Box height='500px'>
                    <RecordCardList
                        height='500px'
                        style={{height: '500px'}}
                        records={searchResults}
                    />
                </Box>
            }
        </Box>
    )
}