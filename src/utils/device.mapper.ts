/**
 *
 * @deprecated
 */
export function mapDeviceStatus (externalStatus: string): string {
  return DeviceStatusesMap[externalStatus]
}

/**
 *
 * @deprecated
 */
export enum DeviceStatusesMap {
  // Zoetis Statuses
  Online = 'active',
  Offline = 'inactive',
  // IDEXX Status is always "ACTIVE"
  ACTIVE = 'active'
}
