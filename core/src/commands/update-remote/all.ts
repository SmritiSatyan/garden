/*
 * Copyright (C) 2018-2023 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import dedent from "dedent"

import { Command, CommandResult, CommandParams } from "../base"
import { updateRemoteSources } from "./sources"
import { updateRemoteModules } from "./modules"
import { SourceConfig, projectSourceSchema, moduleSourceSchema, actionSourceSchema } from "../../config/project"
import { printHeader } from "../../logger/util"
import { joi, joiArray } from "../../config/common"
import { updateRemoteSharedOptions } from "./helpers"
import { updateRemoteActions } from "./actions"

export interface UpdateRemoteAllResult {
  projectSources: SourceConfig[]
  actionSources: SourceConfig[]
  moduleSources: SourceConfig[]
}

const updateRemoteAllOptions = {
  ...updateRemoteSharedOptions,
}

type Opts = typeof updateRemoteAllOptions

export class UpdateRemoteAllCommand extends Command<{}, Opts> {
  name = "all"
  help = "Update all remote sources, actions and modules."

  options = updateRemoteAllOptions

  outputsSchema = () =>
    joi.object().keys({
      projectSources: joiArray(projectSourceSchema()).description("A list of all configured external project sources."),
      actionSources: joiArray(actionSourceSchema()).description(
        "A list of all external action sources in the project."
      ),
      moduleSources: joiArray(moduleSourceSchema()).description(
        "A list of all external module sources in the project."
      ),
    })

  description = dedent`
    Examples:

        garden update-remote all             # update all remote sources, actions and modules in the project
        garden update-remote all --parallel  # update all remote sources in the project in parallel mode
  `

  printHeader({ headerLog }) {
    printHeader(headerLog, "Update remote sources and modules", "🛠️")
  }

  async action({ garden, log, opts }: CommandParams<{}, Opts>): Promise<CommandResult<UpdateRemoteAllResult>> {
    const { result: projectSources } = await updateRemoteSources({
      garden,
      log,
      args: { sources: undefined },
      opts: { parallel: opts.parallel },
    })
    const { result: actionSources } = await updateRemoteActions({
      garden,
      log,
      args: { actions: undefined },
      opts: { parallel: opts.parallel },
    })
    const { result: moduleSources } = await updateRemoteModules({
      garden,
      log,
      args: { modules: undefined },
      opts: { parallel: opts.parallel },
    })

    return {
      result: {
        projectSources: projectSources!.sources,
        actionSources: actionSources!.sources,
        moduleSources: moduleSources!.sources,
      },
    }
  }
}
