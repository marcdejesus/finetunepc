import { PrismaClient } from '../generated/prisma'

declare global {
  var __prisma: PrismaClient | undefined
}

// Database connection configuration with pooling
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Connection pooling setup
export const prisma = globalThis.__prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Connection management for serverless/edge functions
export const connectToDatabase = async () => {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

export const disconnectFromDatabase = async () => {
  try {
    await prisma.$disconnect()
    console.log('Database disconnected successfully')
  } catch (error) {
    console.error('Database disconnection error:', error)
  }
}

// Health check for database
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database is healthy' }
  } catch (error) {
    return { healthy: false, message: `Database health check failed: ${error}` }
  }
}

// Connection pooling stats (for monitoring)
export const getConnectionStats = async () => {
  try {
    // Basic connection info
    return {
      status: 'connected',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error getting connection stats:', error)
    return null
  }
} 