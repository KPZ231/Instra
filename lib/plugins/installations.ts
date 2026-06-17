import { prisma } from '@/lib/prisma'
import { logPluginAction } from '@/lib/plugins/audit'

/**
 * Installs (or re-installs) a specific approved plugin version for a user.
 * @param userId - The user performing the installation
 * @param pluginId - The plugin to install
 * @param pluginVersionId - The specific approved version to install
 * @returns The created or updated PluginInstallation record
 */
export async function installPlugin(userId: string, pluginId: string, pluginVersionId: string) {
  const result = await prisma.pluginInstallation.upsert({
    where: { userId_pluginId: { userId, pluginId } },
    create: { userId, pluginId, pluginVersionId, enabled: true },
    update: { pluginVersionId, enabled: true },
  })
  await logPluginAction(pluginId, userId, 'install', { pluginVersionId })
  return result
}

/**
 * Removes a user's installation of a plugin entirely.
 * @param userId - The user uninstalling the plugin
 * @param pluginId - The plugin to uninstall
 * @returns Prisma batch result
 */
export async function uninstallPlugin(userId: string, pluginId: string) {
  const result = await prisma.pluginInstallation.deleteMany({ where: { userId, pluginId } })
  await logPluginAction(pluginId, userId, 'uninstall', {})
  return result
}

/**
 * Enables or disables an installed plugin without uninstalling it.
 * @param userId - The user toggling the plugin
 * @param pluginId - The plugin to toggle
 * @param enabled - Whether to enable or disable
 * @returns The updated PluginInstallation record
 */
export async function togglePlugin(userId: string, pluginId: string, enabled: boolean) {
  const result = await prisma.pluginInstallation.update({
    where: { userId_pluginId: { userId, pluginId } },
    data: { enabled },
  })
  await logPluginAction(pluginId, userId, 'toggle', { enabled })
  return result
}

/**
 * Lists a user's enabled installations, with version and manifest, for rendering.
 * @param userId - The user whose installations to fetch
 * @returns Array of PluginInstallation records with pluginVersion and plugin included
 */
export async function getUserInstallations(userId: string) {
  return prisma.pluginInstallation.findMany({
    where: { userId, enabled: true },
    include: { pluginVersion: true, plugin: true },
  })
}

/**
 * Checks whether a newer APPROVED version exists for a plugin than the one
 * a user currently has installed. Used to surface a manual "Update" prompt.
 * @param pluginId - The plugin to check
 * @param currentVersion - The version string currently installed
 * @returns The newest available PluginVersion if one exists, or null
 */
export async function getAvailableUpdate(pluginId: string, currentVersion: string) {
  return prisma.pluginVersion.findFirst({
    where: { pluginId, status: 'APPROVED', version: { not: currentVersion } },
    orderBy: { createdAt: 'desc' },
  })
}
