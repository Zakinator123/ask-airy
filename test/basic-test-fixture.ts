import {FieldType, ViewType} from '@airtable/blocks/models';
import {FixtureData} from "@airtable/blocks-testing/dist/types/src/mock_airtable_interface";

export const basicTestFixture: FixtureData = {
    base: {
        workspaceId: 'testWorkspaceId',
        id: 'testBaseId',
        name: 'testBaseName',
        color: 'red',
        tables: [
            {
                id: 'tblTestInventory',
                name: 'Test Inventory',
                description: '',
                fields: [
                    {
                        id: 'fldItemNumber',
                        name: 'Item Number',
                        description: '',
                        type: FieldType.NUMBER,
                        options: {
                            precision: 0,
                        },
                    },
                    {
                        id: 'fldItemDescriptio',
                        name: 'Item Description',
                        description: '',
                        type: FieldType.SINGLE_LINE_TEXT,
                        options: null,
                    },
                    {
                        id: 'fldTestCheckoutsR',
                        name: 'Test Checkouts Reverse Linked Field',
                        description: '',
                        type: FieldType.MULTIPLE_RECORD_LINKS,
                        options: {
                            linkedTableId: 'tblTestCheckouts',
                            isReversed: false,
                            prefersSingleRecordLink: false,
                            inverseLinkFieldId: 'fldCheckedOutItem',
                            viewIdForRecordSelection: undefined,
                        },
                    },
                ],
                views: [
                    {
                        id: 'viwGridView',
                        isLockedView: false,
                        name: 'Grid view',
                        type: ViewType.GRID,
                        fieldOrder: {
                            fieldIds: ['fldItemNumber', 'fldItemDescriptio', 'fldTestCheckoutsR'],
                            visibleFieldCount: 3,
                        },
                        records: [
                            {
                                id: 'rec123',
                                color: null,
                            },
                            {
                                id: 'rec321',
                                color: null,
                            },
                            {
                                id: 'rec456',
                                color: null,
                            },
                        ],
                    },
                ],
                records: [
                    {
                        id: 'rec123',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:28.000Z',
                        cellValuesByFieldId: {
                            fldItemNumber: 123,
                            fldItemDescriptio: 'Test Item 1',
                            fldTestCheckoutsR: [
                                {
                                    id: 'rec1',
                                    name: '1',
                                },
                            ],
                        },
                    },
                    {
                        id: 'rec321',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:28.000Z',
                        cellValuesByFieldId: {
                            fldItemNumber: 321,
                            fldItemDescriptio: 'Test Item 2',
                            fldTestCheckoutsR: [
                                {
                                    id: 'rec2',
                                    name: '2',
                                },
                            ],
                        },
                    },
                    {
                        id: 'rec456',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:28.000Z',
                        cellValuesByFieldId: {
                            fldItemNumber: 456,
                            fldItemDescriptio: 'Test Item 3',
                            fldTestCheckoutsR: [
                                {
                                    id: 'rec3',
                                    name: '3',
                                },
                                {
                                    id: 'rec4',
                                    name: '4',
                                },
                            ],
                        },
                    },
                ],
            },
            {
                id: 'tblTestRecipients',
                name: 'Test Recipients',
                description: '',
                fields: [
                    {
                        id: 'fldName',
                        name: 'Name',
                        description: '',
                        type: FieldType.SINGLE_LINE_TEXT,
                        options: null,
                    },
                    {
                        id: 'fldEmail',
                        name: 'Email',
                        description: '',
                        type: FieldType.EMAIL,
                        options: null,
                    },
                    {
                        id: 'fldTestChecko2',
                        name: 'Test Checkouts Reverse Linked Field',
                        description: '',
                        type: FieldType.MULTIPLE_RECORD_LINKS,
                        options: {
                            linkedTableId: 'tblTestCheckouts',
                            isReversed: false,
                            prefersSingleRecordLink: false,
                            inverseLinkFieldId: 'fldCheckedOutTo',
                            viewIdForRecordSelection: undefined,
                        },
                    },
                ],
                views: [
                    {
                        id: 'viwGridView2',
                        isLockedView: false,
                        name: 'Grid view',
                        type: ViewType.GRID,
                        fieldOrder: {
                            fieldIds: ['fldName', 'fldEmail', 'fldTestChecko2'],
                            visibleFieldCount: 3,
                        },
                        records: [
                            {
                                id: 'recJohnDoe',
                                color: null,
                            },
                            {
                                id: 'recSallyMae',
                                color: null,
                            },
                            {
                                id: 'recBobJones',
                                color: null,
                            },
                        ],
                    },
                ],
                records: [
                    {
                        id: 'recJohnDoe',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:42.000Z',
                        cellValuesByFieldId: {
                            fldName: 'John Doe',
                            fldEmail: 'john.doe@testexample.com',
                            fldTestChecko2: [
                                {
                                    id: 'rec1',
                                    name: '1',
                                },
                                {
                                    id: 'rec3',
                                    name: '3',
                                },
                                {
                                    id: 'rec4',
                                    name: '4',
                                },
                            ],
                        },
                    },
                    {
                        id: 'recSallyMae',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:42.000Z',
                        cellValuesByFieldId: {
                            fldName: 'Sally Mae',
                            fldEmail: 'sally.mae@testexample.com',
                            fldTestChecko2: [
                                {
                                    id: 'rec2',
                                    name: '2',
                                },
                            ],
                        },
                    },
                    {
                        id: 'recBobJones',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:42.000Z',
                        cellValuesByFieldId: {
                            fldName: 'Bob Jones',
                            fldEmail: 'bob.jones@testexample.com',
                            fldTestChecko2: null,
                        },
                    },
                ],
            },
            {
                id: 'tblTestCheckouts',
                name: 'Test Checkouts',
                description: '',
                fields: [
                    {
                        id: 'fldCheckoutId',
                        name: 'Checkout Id',
                        description: '',
                        type: FieldType.AUTO_NUMBER,
                        options: null,
                    },
                    {
                        id: 'fldCheckedOutItem',
                        name: 'Checked Out Item',
                        description: '',
                        type: FieldType.MULTIPLE_RECORD_LINKS,
                        options: {
                            linkedTableId: 'tblTestInventory',
                            isReversed: false,
                            prefersSingleRecordLink: true,
                            inverseLinkFieldId: 'fldTestCheckoutsR',
                            viewIdForRecordSelection: undefined,
                        },
                    },
                    {
                        id: 'fldCheckedOutTo',
                        name: 'Checked Out To',
                        description: '',
                        type: FieldType.MULTIPLE_RECORD_LINKS,
                        options: {
                            linkedTableId: 'tblTestRecipients',
                            isReversed: false,
                            prefersSingleRecordLink: true,
                            inverseLinkFieldId: 'fldTestChecko2',
                            viewIdForRecordSelection: undefined,
                        },
                    },
                    {
                        id: 'fldCheckedIn',
                        name: 'Checked In',
                        description: '',
                        type: FieldType.CHECKBOX,
                        options: {
                            icon: 'check',
                            color: 'greenBright',
                        },
                    },
                    {
                        id: 'fldDateCheckedOut',
                        name: 'Date Checked Out',
                        description: '',
                        type: FieldType.DATE,
                        options: {
                            dateFormat: {
                                name: 'local',
                                format: 'l',
                            },
                        },
                    },
                    {
                        id: 'fldDateDue',
                        name: 'Date Due',
                        description: '',
                        type: FieldType.DATE,
                        options: {
                            dateFormat: {
                                name: 'local',
                                format: 'l',
                            },
                        },
                    },
                    {
                        id: 'fldDateCheckedIn',
                        name: 'Date Checked In',
                        description: '',
                        type: FieldType.DATE,
                        options: {
                            dateFormat: {
                                name: 'local',
                                format: 'l',
                            },
                        },
                    },
                    {
                        id: 'fldCartId',
                        name: 'Cart Id',
                        description: '',
                        type: FieldType.NUMBER,
                        options: {
                            precision: 0,
                        },
                    },
                ],
                views: [
                    {
                        id: 'viwGridView3',
                        isLockedView: false,
                        name: 'Grid view',
                        type: ViewType.GRID,
                        fieldOrder: {
                            fieldIds: [
                                'fldCheckoutId',
                                'fldCheckedOutItem',
                                'fldCheckedOutTo',
                                'fldDateCheckedOut',
                                'fldDateDue',
                                'fldCheckedIn',
                                'fldDateCheckedIn',
                                'fldCartId',
                            ],
                            visibleFieldCount: 8,
                        },
                        records: [
                            {
                                id: 'rec1',
                                color: null,
                            },
                            {
                                id: 'rec2',
                                color: null,
                            },
                            {
                                id: 'rec3',
                                color: null,
                            },
                            {
                                id: 'rec4',
                                color: null,
                            },
                            {
                                id: 'rec5',
                                color: null,
                            },
                        ],
                    },
                ],
                records: [
                    {
                        id: 'rec1',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:57.000Z',
                        cellValuesByFieldId: {
                            fldCheckoutId: 1,
                            fldCheckedOutItem: [
                                {
                                    id: 'rec123',
                                    name: '123',
                                },
                            ],
                            fldCheckedOutTo: [
                                {
                                    id: 'recJohnDoe',
                                    name: 'John Doe',
                                },
                            ],
                            fldCheckedIn: null,
                            fldDateCheckedOut: '2023-03-22',
                            fldDateDue: '2023-03-25',
                            fldDateCheckedIn: null,
                            fldCartId: null,
                        },
                    },
                    {
                        id: 'rec2',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:57.000Z',
                        cellValuesByFieldId: {
                            fldCheckoutId: 2,
                            fldCheckedOutItem: [
                                {
                                    id: 'rec321',
                                    name: '321',
                                },
                            ],
                            fldCheckedOutTo: [
                                {
                                    id: 'recSallyMae',
                                    name: 'Sally Mae',
                                },
                            ],
                            fldCheckedIn: null,
                            fldDateCheckedOut: '2023-03-14',
                            fldDateDue: '2023-03-30',
                            fldDateCheckedIn: null,
                            fldCartId: null,
                        },
                    },
                    {
                        id: 'rec3',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:17:57.000Z',
                        cellValuesByFieldId: {
                            fldCheckoutId: 3,
                            fldCheckedOutItem: [
                                {
                                    id: 'rec456',
                                    name: '456',
                                },
                            ],
                            fldCheckedOutTo: [
                                {
                                    id: 'recJohnDoe',
                                    name: 'John Doe',
                                },
                            ],
                            fldCheckedIn: null,
                            fldDateCheckedOut: '2023-03-02',
                            fldDateDue: '2023-04-28',
                            fldDateCheckedIn: null,
                            fldCartId: null,
                        },
                    },
                    {
                        id: 'rec4',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:32:26.000Z',
                        cellValuesByFieldId: {
                            fldCheckoutId: 4,
                            fldCheckedOutItem: [
                                {
                                    id: 'rec456',
                                    name: '456',
                                },
                            ],
                            fldCheckedOutTo: [
                                {
                                    id: 'recJohnDoe',
                                    name: 'John Doe',
                                },
                            ],
                            fldCheckedIn: true,
                            fldDateCheckedOut: '2023-02-01',
                            fldDateDue: '2023-03-01',
                            fldDateCheckedIn: '2023-03-01',
                            fldCartId: null,
                        },
                    },
                    {
                        id: 'rec5',
                        commentCount: 0,
                        createdTime: '2023-03-23T19:32:28.000Z',
                        cellValuesByFieldId: {
                            fldCheckoutId: 5,
                            fldCheckedOutItem: null,
                            fldCheckedOutTo: null,
                            fldCheckedIn: null,
                            fldDateCheckedOut: null,
                            fldDateDue: null,
                            fldDateCheckedIn: null,
                            fldCartId: null,
                        },
                    },
                ],
            },
        ],
        collaborators: [
            {
                id: 'usrKristyEmmerich',
                name: 'Kristy Emmerich',
                email: 'kristy.emmerich@airtable.test',
                profilePicUrl: 'https://dl.airtable.test/.profilePics/usrKristyEmmerich',
                isActive: true,
            },
            {
                id: 'usrAntoniaAnkundi',
                name: 'Antonia Ankunding',
                email: 'antonia.ankunding@airtable.test',
                profilePicUrl: 'https://dl.airtable.test/.profilePics/usrAntoniaAnkundi',
                isActive: false,
            },
        ],
    },
};
