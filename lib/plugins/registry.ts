import { prisma } from '@/lib/prisma'
import type { PluginManifest } from './manifest'
import { parseManifest } from './manifest'
import { logPluginAction } from './audit'
import { PluginReviewStatus } from '@prisma/client'

/**
 * Registers a brand-new plugin together with its first version (DRAFT).
 * @param input - Plugin creation parameters
 * @param input.slug - Unique URL-safe identifier for the plugin
 * @param input.name - Human-readable plugin name
 * @param input.description - Plugin description
 * @param input.authorId - User ID of the plugin author
 * @param input.manifest - Parsed plugin manifest
 * @param input.bundleStorageKey - Storage key pointing to the uploaded bundle
 * @returns Object containing the created plugin and its first version
 * @example
 * const { plugin, version } = await createPlugin({ slug: 'my-plugin', name: 'My Plugin', ... })
 */
export async function createPlugin(input: {
  slug: string
  name: string
  description: string
  authorId: string
  manifest: PluginManifest
  bundleStorageKey: string
}) {
  const existing = await prisma.plugin.findUnique({ where: { slug: input.slug } })
  if (existing) {
    throw new Error(`Plugin slug "${input.slug}" is already taken`)
  }

  const manifestResult = parseManifest(input.manifest)
  if (!manifestResult.success) {
    throw new Error(`Invalid manifest: ${manifestResult.error.message}`)
  }
  const validatedManifest = manifestResult.data

  const plugin = await prisma.plugin.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      authorId: input.authorId,
    },
  })
  const version = await prisma.pluginVersion.create({
    data: {
      pluginId: plugin.id,
      version: validatedManifest.version,
      status: 'DRAFT',
      manifest: validatedManifest,
      bundleStorageKey: input.bundleStorageKey,
    },
  })

  await logPluginAction(plugin.id, input.authorId, 'plugin.created', { slug: input.slug, version: validatedManifest.version })

  return { plugin, version }
}

/**
 * Moves a plugin version from DRAFT to PENDING_REVIEW, triggering the review workflow.
 * @param versionId - ID of the plugin version to submit
 * @returns Updated plugin version record
 */
export async function submitVersionForReview(versionId: string) {
  const version = await prisma.pluginVersion.findUnique({ where: { id: versionId } })
  if (!version) throw new Error(`Plugin version "${versionId}" not found`)
  if (version.status !== PluginReviewStatus.DRAFT) {
    throw new Error(`Plugin version "${versionId}" is not in DRAFT status`)
  }
  const pluginVersion = await prisma.pluginVersion.update({ where: { id: versionId }, data: { status: 'PENDING_REVIEW' } })
  await logPluginAction(pluginVersion.pluginId, null, 'version.submitted', { versionId })
  return pluginVersion
}

/**
 * Approves a pending plugin version, recording the reviewing admin and timestamp.
 * @param versionId - ID of the plugin version to approve
 * @param reviewerId - User ID of the admin approving the version
 * @returns Updated plugin version record
 * @remarks Caller must verify the reviewer has UserRole.ADMIN before calling this function.
 */
export async function approveVersion(versionId: string, reviewerId: string) {
  const pluginVersion = await prisma.pluginVersion.update({
    where: { id: versionId },
    data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: null },
  })
  await logPluginAction(pluginVersion.pluginId, reviewerId, 'version.approved', { versionId })
  return pluginVersion
}

/**
 * Rejects a pending plugin version with a human-readable reason.
 * @param versionId - ID of the plugin version to reject
 * @param reviewerId - User ID of the admin rejecting the version
 * @param reason - Human-readable explanation for the rejection
 * @returns Updated plugin version record
 * @remarks Caller must verify the reviewer has UserRole.ADMIN before calling this function.
 */
export async function rejectVersion(versionId: string, reviewerId: string, reason: string) {
  const pluginVersion = await prisma.pluginVersion.update({
    where: { id: versionId },
    data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: reason },
  })
  await logPluginAction(pluginVersion.pluginId, reviewerId, 'version.rejected', { versionId, reason })
  return pluginVersion
}

/**
 * Lists all approved plugin versions, newest first, for the install browser.
 * @returns Array of approved plugin versions with their parent plugin included
 */
export async function listApprovedPlugins() {
  return prisma.pluginVersion.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    include: { plugin: true },
  })
}
