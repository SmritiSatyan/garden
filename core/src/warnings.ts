/*
 * Copyright (C) 2018-2022 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import chalk from "chalk"
import { Log } from "./logger/log-entry"

interface LoggerContext {
  readonly history: Set<string>
}

const loggerContext: LoggerContext = {
  history: new Set<string>(),
}

export function emitNonRepeatableWarning(log: Log, message: string) {
  if (loggerContext.history.has(message)) {
    return
  }

  log.warn({
    symbol: "warning",
    msg: chalk.yellow(message),
  })
  loggerContext.history.add(message)
}
