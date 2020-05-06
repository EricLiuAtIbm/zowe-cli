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

import { IHandlerParameters, CliUtils, Imperative, Session, ImperativeError } from "@zowe/imperative";
import { ZosmfBaseHandler } from "../../ZosmfBaseHandler";
import { Login } from "../../api/Login";
import { isNullOrUndefined } from "util";
import { ZosmfSession } from "../../..";

/**
 * Handler to login to z/OSMF
 * @export
 * @class Handler
 * @implements {ICommandHandler}
 */
export default class LoginHandler extends ZosmfBaseHandler {

    /**
     * Handler for the "zosmf login" command.
     * @param {IHandlerParameters} params - see interface for details
     * @returns {Promise<void>} - promise to fulfill or reject when the command is complete
     */
    public async processCmd(params: IHandlerParameters): Promise<void> {
        // if no user name was supplied, we must ask for user name
        let answer: string;
        if (isNullOrUndefined(params.arguments.user)) {
            answer = await CliUtils.promptWithTimeout("Enter user name: ");
            if (answer === null) {
                throw new ImperativeError({msg: "We timed-out waiting for user name."});
            }
            params.arguments.user = answer;
        }

        // if no password was supplied, we must ask for password
        if (isNullOrUndefined(params.arguments.password)) {
            answer = await CliUtils.promptWithTimeout("Enter password: ", true);
            if (answer === null) {
                throw new ImperativeError({msg: "We timed-out waiting for password."});
            }
            params.arguments.password = answer;
        }

        this.mSession = ZosmfSession.createBasicZosmfSessionFromArguments(params.arguments);

        // removing tokenValue, will ensure that user & password are used for authentication
        delete this.mSession.ISession.tokenValue;

        // we want to receive a token in our response
        this.mSession.ISession.type = "token";

        // set the type of token we expect to receive
        if (params.arguments.tokenType) {
            // use the token type requested by the user
            this.mSession.ISession.tokenType = params.arguments.tokenType;
        } else {
            // use our default token
            this.mSession.ISession.tokenType = "LtpaToken2";
        }

        // login to obtain a token
        const tokenValue = await Login.login(this.mSession);

        // update the profile given
        await Imperative.api.profileManager(`zosmf`).update({
            name: this.mZosmfLoadedProfile.name,
            args: {
                "token-type": this.mSession.ISession.tokenType,
                "token-value": tokenValue
            },
            merge: true
        });

        params.response.console.log(
            "Login successful.\nReceived a token of type = " +this.mSession.ISession.tokenType +
            ".\nThe following token was stored in your profile:\n" + tokenValue
        );
    }
}