import { createAccessControl } from 'better-auth/plugins/access'
import {
  defaultStatements,
  adminAc,
  memberAc,
} from 'better-auth/plugins/organization/access'

/**
 * Custom permissions statement for the dental app
 * Extends default organization permissions with app-specific resources
 */
const statement = {
  ...defaultStatements,
  // Add custom resources for dental app
  appointment: ['create', 'read', 'update', 'delete', 'manage'],
  patient: ['create', 'read', 'update', 'delete'],
  treatment: ['create', 'read', 'update', 'delete'],
  billing: ['create', 'read', 'update', 'delete'],
} as const

export const ac = createAccessControl(statement)

/**
 * Admin role - full access to manage the organization
 * Can manage appointments, patients, treatments, billing
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  appointment: ['create', 'read', 'update', 'delete', 'manage'],
  patient: ['create', 'read', 'update', 'delete'],
  treatment: ['create', 'read', 'update', 'delete'],
  billing: ['create', 'read', 'update', 'delete'],
})

/**
 * Customer role - limited access for patients
 * Can view and manage their own appointments
 */
export const customer = ac.newRole({
  ...memberAc.statements,
  appointment: ['create', 'read'],
  patient: ['read'], // Can only read their own info
  treatment: ['read'],
  billing: ['read'],
})

/**
 * Owner role - inherits admin with full organization control
 */
export const owner = ac.newRole({
  ...adminAc.statements,
  organization: ['update', 'delete'],
  appointment: ['create', 'read', 'update', 'delete', 'manage'],
  patient: ['create', 'read', 'update', 'delete'],
  treatment: ['create', 'read', 'update', 'delete'],
  billing: ['create', 'read', 'update', 'delete'],
})
