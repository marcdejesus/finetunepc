import { prisma } from '@/lib/db'
import { ActivityAction } from '@prisma/client'

interface LogActivityOptions {
  userId: string
  action: ActivityAction
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logActivity(options: LogActivityOptions) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        resource: options.resource,
        resourceId: options.resourceId,
        details: options.details,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      }
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}