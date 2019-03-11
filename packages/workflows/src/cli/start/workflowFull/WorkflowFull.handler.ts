/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import { IHandlerParameters, ImperativeError } from "@brightside/imperative";
import { ZosmfBaseHandler } from "../../../../../zosmf/src/ZosmfBaseHandler";
import { isNullOrUndefined } from "util";
import { PropertiesWorkflow, StartWorkflow } from "../../../..";
import { IWorkflowInfo } from "../../../api/doc/IWorkflowInfo";


/**
 * Common handler to start a workflow instance in z/OSMF.
 * This is not something that is intended to be used outside of this npm package.
 */
export default class WorkflowFullHandler extends ZosmfBaseHandler {
    /**
     * Command line arguments passed
     * @private
     * @type {*}
     * @memberof WorkflowFullHandler
     */
    private arguments: any;

    /**
     * Command handler process - invoked by the command processor to handle the "zos-workflows start full-workflow
     * @param {IHandlerParameters} params - Command handler parameters
     * @returns {Promise<void>} - Fulfilled when the command completes successfully OR rejected with imperative error
     * @memberof WorkflowFullHandler
     */
    public async processCmd(params: IHandlerParameters): Promise<void> {
        let error;
        this.arguments = params.arguments;
        // TODO after list is done: if workflow name is passed, get key
        try{
            await StartWorkflow.startWorkflow(this.mSession, this.arguments.workflowKey, this.arguments.resolveConflict);
        } catch (err){
            error = "Start workflow: " + err;
            throw error;
        }
        if (this.arguments.wait){
            let response: IWorkflowInfo;
            let flag = false;
            while(!flag) {
                response = await PropertiesWorkflow.getWorkflowProperties(this.mSession, this.arguments.workflowKey);
                if (response.automationStatus && response.statusName !== "automation-in-progress") {
                    flag = true;
                    if (response.statusName === "complete") {
                        params.response.data.setObj("Complete.");
                        params.response.console.log("Workflow completed successfully.");
                    }
                    else {
                        throw new ImperativeError({
                            msg: `Workflow failed or was cancelled or there is manual step.`,
                            additionalDetails: JSON.stringify(response)
                        });
                    }
                }
            }
        } else {
            params.response.data.setObj("Started.");
            params.response.console.log("Workflow started.");
        }
    }
}
