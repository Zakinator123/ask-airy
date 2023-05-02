import React, {useState} from "react";
import {Box, RecordCardList, Select} from "@airtable/blocks/ui";
import {Base, Record, Table} from "@airtable/blocks/models";
import {SearchService} from "../types/CoreTypes";
import {SearchBar} from "./SearchBar";
import {SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";


export const Search = ({
                           semanticSearchService,
                           searchTableConfigs,
                           base
                       }: {
    semanticSearchService: SearchService,
    searchTableConfigs: SearchTableConfigWithDefinedSearchIndexField[],
    base: Base
}) => {
    const [tableToSearch, setTableToSearch] = useState<Table | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);

    return (
        <Box style={{padding: '3rem', gap: '2rem', display: 'flex', flexDirection: 'column', width: '350px'}}>
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

            {tableToSearch &&
                <SearchBar
                    semanticSearchService={semanticSearchService}
                    searchTableConfig={(searchTableConfigs
                        // TODO: Make sure there are no edge cases here.
                        .find(searchTableConfig => searchTableConfig.table.id === tableToSearch.id) as SearchTableConfigWithDefinedSearchIndexField)}
                    setSearchResults={setSearchResults}
                />}

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