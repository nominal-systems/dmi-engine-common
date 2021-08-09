export function mapDeviceStatus (externalStatus: string): string {
  return DeviceStatusesMap[externalStatus]
}

export enum DeviceStatusesMap {
  // Zoetis Statuses
  Online = 'active',
  Offline = 'inactive',
  // IDEXX Status is always "ACTIVE"
  ACTIVE = 'active'
}
