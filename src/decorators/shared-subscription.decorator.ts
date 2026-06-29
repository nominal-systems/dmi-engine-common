import { EventPattern, MessagePattern } from '@nestjs/microservices'

export function sharedSubscriptionTopic (group: string, filter: string): string {
  return `$share/${group}/${filter}`
}

export const SharedMessagePattern = (group: string, filter: string): MethodDecorator =>
  MessagePattern(sharedSubscriptionTopic(group, filter))

export const SharedEventPattern = (group: string, filter: string): MethodDecorator =>
  EventPattern(sharedSubscriptionTopic(group, filter))
