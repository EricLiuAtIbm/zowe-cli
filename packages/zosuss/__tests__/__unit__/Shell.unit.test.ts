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

/* eslint-disable jest/expect-expect */
import { Client } from "ssh2";
import { startCmdFlag, Shell } from "../../src/Shell";
import { SshSession } from "../../src/SshSession";
import { EventEmitter } from "events";
jest.mock("ssh2");

// Mock functions for SSH
const fakeSshSession = new SshSession({
    hostname: "localhost",
    port: 22,
    user: "",
    password: ""
});
const mockClient: any = new EventEmitter();
const mockConnect = jest.fn().mockImplementation(() => {
    mockClient.emit("ready");
});
const mockStreamEnd = jest.fn();
const mockStreamWrite = jest.fn();
const mockStream: any = new EventEmitter();
mockStream.end = mockStreamEnd;
mockStream.write = mockStreamWrite;

const mockShell = jest.fn().mockImplementation((callback) => {
    callback(null, mockStream);
    mockStream.emit("data", `\n${startCmdFlag}stdout data\n\rerror$ `);
    mockStream.emit("exit", 0);
});

(Client as any).mockImplementation(() => {
    mockClient.connect = mockConnect;
    mockClient.shell = mockShell;
    return mockClient;
});

const stdoutHandler = jest.fn();

function checkMockFunctionsWithCommand(command: string) {
    expect(mockConnect).toBeCalled();
    expect(mockShell).toBeCalled();

    // Check the stream.end() fucntion is called with an argument containing the SSH command
    expect(mockStreamWrite.mock.calls[0][0]).toMatch(command);
    expect(mockStreamEnd).toHaveBeenCalled();
    expect(stdoutHandler).toHaveBeenCalledWith("stdout data\n");
    expect(stdoutHandler).toHaveBeenCalledWith("\rerror");
}

describe("Shell", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("Should execute ssh command", async () => {
        const command = "commandtest";
        Shell.executeSsh(fakeSshSession, command, stdoutHandler);

        checkMockFunctionsWithCommand(command);
    });

    it("Should execute ssh command with cwd option", async () => {
        const cwd = "/";
        const command = "commandtest";
        Shell.executeSshCwd(fakeSshSession, command, cwd, stdoutHandler);

        checkMockFunctionsWithCommand(command);
    });
});
