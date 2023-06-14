/*
 * Copyright (C) 2018-2023 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Schema, z } from "zod"
import { identifierRegex, joiIdentifierDescription, userIdentifierRegex } from "./constants"

// Add metadata support to schemas. See https://github.com/colinhacks/zod/issues/273#issuecomment-1434077058
declare module "zod" {
  interface ZodType {
    getMetadata(): Record<string, any>
    setMetadata(meta: Record<string, any>): this
    getExample(): any
    example(value: any): this
  }
}
Schema.prototype.getMetadata = function () {
  return this._def.meta
}
Schema.prototype.setMetadata = function (meta: Record<string, any>) {
  const This = (this as any).constructor
  return new This({
    ...this._def,
    meta,
  })
}
Schema.prototype.getExample = function () {
  return this._def.example
}
Schema.prototype.example = function (example: any) {
  const This = (this as any).constructor
  return new This({
    ...this._def,
    example,
  })
}

// Add custom methods
// TODO: get to full parity with custom joi methods+types (just doing it gradually as needed for now)

export interface PosixPathOpts {
  absoluteOnly?: boolean
  allowGlobs?: boolean
  filenameOnly?: boolean
  relativeOnly?: boolean
  subPathOnly?: boolean
}

type GardenSchema = typeof z & {
  posixPath: (opts: PosixPathOpts) => z.ZodEffects<z.ZodString, string, string>
  identifier: () => z.ZodString
  userIdentifier: () => z.ZodString
  sparseArray: <T extends z.ZodTypeAny>(
    schema: T,
    params?: z.RawCreateParams
  ) => z.ZodEffects<z.ZodArray<T, "many">, T["_output"][], T["_input"][]>
}

// This should be imported instead of z because we augment zod with custom methods
export const s = z as GardenSchema

s.posixPath = (opts: PosixPathOpts = {}) => {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (opts.absoluteOnly && !value.startsWith("/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Path must be absolute (i.e. start with /).`,
        })
      }
      if (!opts.allowGlobs && (value.includes("*") || value.includes("?"))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Path cannot include globs or wildcards.",
        })
      }
      if (opts.filenameOnly && value.includes("/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a filename (may not contain slashes).",
        })
      }
      if (opts.relativeOnly && value.startsWith("/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a relative path (may not start with a slash).",
        })
      }
      if (opts.subPathOnly && value.includes("..")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a sub-path (may not include '..').",
        })
      }
    })
    .setMetadata({
      // Picked up when converting to joi schemas
      posixPath: opts,
    })
}

s.identifier = () => {
  return z
    .string({
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === "regex") {
          return { message: "Expected a valid identifier. Should be a " + joiIdentifierDescription }
        }
        return { message: ctx.defaultError }
      },
    })
    .regex(identifierRegex)
}

s.userIdentifier = () => {
  return z
    .string({
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === "regex") {
          return {
            message:
              "Expected a valid identifier (that also cannot start with 'garden'). Should be a " +
              joiIdentifierDescription,
          }
        }
        return { message: ctx.defaultError }
      },
    })
    .regex(userIdentifierRegex)
}

s.sparseArray = <T extends z.ZodTypeAny>(schema: T, params?: z.RawCreateParams) => {
  return s.array(schema, params).transform((value) => value.filter((v: any) => v !== undefined && v !== null))
}
