/*
 * Copyright (C) 2018-2023 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import sinon from "sinon"
import * as td from "testdouble"
import timekeeper from "timekeeper"
import { getDefaultProfiler } from "../src/util/profiling.js"
import { gardenEnv } from "../src/constants.js"
import { testFlags } from "../src/util/util.js"
import { initTestLogger, testProjectTempDirs } from "./helpers.js"

import sourceMapSupport from "source-map-support"
sourceMapSupport.install()

initTestLogger()

// Global hooks
export const mochaHooks = {
  async beforeAll() {
    getDefaultProfiler().setEnabled(true)
    gardenEnv.GARDEN_DISABLE_ANALYTICS = true
    testFlags.expandErrors = true
    testFlags.disableShutdown = true
  },

  async afterAll() {
    // eslint-disable-next-line no-console
    console.log(getDefaultProfiler().report())
    await Promise.all(Object.values(testProjectTempDirs).map((d) => d.cleanup()))
  },

  beforeEach() {},

  afterEach() {
    sinon.restore()
    td.reset()
    timekeeper.reset()
  },
}
