import React from "react";
import {Icon, Tooltip} from "@airtable/blocks/ui";

export const FormFieldLabelWithTooltip = ({
                                              fieldLabel,
                                              fieldLabelTooltip,
                                              dangerous = false
                                          }: { fieldLabel: string, fieldLabelTooltip: string, dangerous?: boolean }) =>
    <>
        {fieldLabel}
        <Tooltip
            fitInWindowMode={Tooltip.fitInWindowModes.NONE}
            content={fieldLabelTooltip}
            placementX={Tooltip.placements.CENTER}
            placementY={Tooltip.placements.TOP}>
            <Icon fillColor={dangerous ? 'red' : 'black'} name="info" size={12} marginLeft='0.5rem'/>
        </Tooltip>
    </>