import React, {useState} from "react";
import {Box, RecordCardList, TablePicker} from "@airtable/blocks/ui";
import {Record, Table} from "@airtable/blocks/models";
import {SearchService} from "../types/CoreTypes";
import {SearchBar} from "./SearchBar";


export const Search = ({semanticSearchService}: { semanticSearchService: SearchService }) => {
    const [tableToSearch, setTableToSearch] = useState<Table | undefined>(undefined);
    const [searchResults, setSearchResults] = useState<Record[] | undefined>(undefined);

    return (
        <Box style={{gap: '2rem', display: 'flex', flexDirection: 'column', width: '350px'}}>
            <TablePicker
                table={tableToSearch}
                placeholder='Select a table to search'
                onChange={newTable => setTableToSearch(newTable ?? undefined)}
            />

            {tableToSearch &&
                <SearchBar
                    semanticSearchService={semanticSearchService}
                    tableToSearch={tableToSearch}
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