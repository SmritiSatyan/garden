/*
 * Copyright (C) 2018-2023 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Log } from "../../../logger/log-entry.js"
import type { KubernetesPluginContext } from "../config.js"
import type { StringMap } from "../../../config/common.js"
import type { PluginToolSpec } from "../../../plugin/tools.js"
import type { Dictionary } from "../../../util/util.js"
import split2 from "split2"
import { pickBy } from "lodash-es"

export const helmVersion = "3.12.2"

export const helm3Spec: PluginToolSpec = {
  name: "helm",
  description: `The Helm CLI (version ${helmVersion}).`,
  version: helmVersion,
  type: "binary",
  _includeInGardenImage: true,
  builds: [
    {
      platform: "darwin",
      architecture: "amd64",
      url: `https://get.helm.sh/helm-v${helmVersion}-darwin-amd64.tar.gz`,
      sha256: "6e8bfc84a640e0dc47cc49cfc2d0a482f011f4249e2dff2a7e23c7ef2df1b64e",
      extract: {
        format: "tar",
        targetPath: "darwin-amd64/helm",
      },
    },
    {
      platform: "darwin",
      architecture: "arm64",
      url: `https://get.helm.sh/helm-v${helmVersion}-darwin-arm64.tar.gz`,
      sha256: "b60ee16847e28879ae298a20ba4672fc84f741410f438e645277205824ddbf55",
      extract: {
        format: "tar",
        targetPath: "darwin-arm64/helm",
      },
    },
    {
      platform: "linux",
      architecture: "amd64",
      url: `https://get.helm.sh/helm-v${helmVersion}-linux-amd64.tar.gz`,
      sha256: "2b6efaa009891d3703869f4be80ab86faa33fa83d9d5ff2f6492a8aebe97b219",
      extract: {
        format: "tar",
        targetPath: "linux-amd64/helm",
      },
    },
    {
      platform: "linux",
      architecture: "arm64",
      url: `https://get.helm.sh/helm-v${helmVersion}-linux-arm64.tar.gz`,
      sha256: "cfafbae85c31afde88c69f0e5053610c8c455826081c1b2d665d9b44c31b3759",
      extract: {
        format: "tar",
        targetPath: "linux-arm64/helm",
      },
    },
    {
      platform: "windows",
      architecture: "amd64",
      url: `https://get.helm.sh/helm-v${helmVersion}-windows-amd64.zip`,
      sha256: "35dc439baad85728dafd2be0edd4721ae5b770c5cf72c3adf9558b1415a9cae6",
      extract: {
        format: "zip",
        targetPath: "windows-amd64/helm.exe",
      },
    },
  ],
}

export async function helm({
  ctx,
  namespace,
  log,
  args,
  env = {},
  cwd,
  emitLogEvents,
}: {
  ctx: KubernetesPluginContext
  namespace?: string
  log: Log
  args: string[]
  env?: { [key: string]: string }
  cwd?: string
  emitLogEvents: boolean
}) {
  const opts = ["--kube-context", ctx.provider.config.context]

  if (ctx.provider.config.kubeconfig) {
    opts.push("--kubeconfig", ctx.provider.config.kubeconfig)
  }

  const cmd = ctx.tools["kubernetes.helm"]

  const processEnv = pickBy(process.env, (v) => v !== undefined) as Dictionary<string>
  const envVars: StringMap = {
    ...processEnv,
    ...env,
  }

  if (namespace) {
    opts.push("--namespace", namespace)
  }

  const logEventContext = {
    origin: "helm",
    level: "verbose" as const,
  }

  const outputStream = split2()
  outputStream.on("error", () => {})
  outputStream.on("data", (line: Buffer) => {
    if (emitLogEvents) {
      ctx.events.emit("log", { timestamp: new Date().toISOString(), msg: line.toString(), ...logEventContext })
    }
  })

  return cmd.stdout({
    log,
    args: [...opts, ...args],
    env: envVars,
    // Helm itself will time out pretty reliably, so we shouldn't time out early on our side.
    timeoutSec: 3600,
    cwd,
    stderr: outputStream,
    stdout: outputStream,
  })
}
