import React from "react";
import {Icon, Tooltip, Text} from "@airtable/blocks/ui";

export const FormFieldLabelWithTooltip = ({
                                              fieldLabel,
                                              fieldLabelTooltip,
                                              dangerous = false
                                          }: { fieldLabel: string, fieldLabelTooltip: string, dangerous?: boolean }) =>
    <>
        <Text display='inline-block' textColor='gray'>{fieldLabel}</Text>
        <Tooltip
            fitInWindowMode={Tooltip.fitInWindowModes.NONE}
            content={fieldLabelTooltip}
            placementX={Tooltip.placements.CENTER}
            placementY={Tooltip.placements.TOP}>
            <Icon fillColor={dangerous ? 'red' : 'dark-gray'} name="info" size={12} marginLeft='0.25rem'/>
        </Tooltip>
    </>