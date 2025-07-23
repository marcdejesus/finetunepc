import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch available time slots for service booking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const serviceType = searchParams.get('type')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const selectedDate = new Date(date)
    
    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      return NextResponse.json({ error: 'Cannot book services for past dates' }, { status: 400 })
    }

    // Define business hours
    const businessHours = {
      start: 9, // 9 AM
      end: 17,  // 5 PM
      interval: 60 // 60 minutes per slot
    }

    // Generate all possible time slots for the day
    const allSlots = []
    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      const timeSlot = new Date(selectedDate)
      timeSlot.setHours(hour, 0, 0, 0)
      allSlots.push(timeSlot)
    }

    // Get existing bookings for the selected date
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingBookings = await prisma.service.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          not: 'CANCELLED'
        }
      },
      select: {
        scheduledDate: true,
        type: true
      }
    })

    // Calculate estimated duration based on service type
    const serviceDurations = {
      REPAIR: 120,        // 2 hours
      UPGRADE: 90,        // 1.5 hours
      CONSULTATION: 60,   // 1 hour
      INSTALLATION: 120,  // 2 hours
      MAINTENANCE: 90,    // 1.5 hours
      DIAGNOSTICS: 60     // 1 hour
    }

    const requestedDuration = serviceType ? serviceDurations[serviceType as keyof typeof serviceDurations] || 60 : 60

    // Filter out unavailable slots
    const availableSlots = allSlots.filter(slot => {
      // Check if this slot conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = new Date(booking.scheduledDate)
        const bookingDuration = serviceDurations[booking.type] || 60
        const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000)

        const slotEnd = new Date(slot.getTime() + requestedDuration * 60000)

        // Check for overlap
        return (slot < bookingEnd && slotEnd > bookingStart)
      })

      // Also check if slot is too close to current time (at least 2 hours notice)
      const now = new Date()
      const minimumNotice = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now

      return !hasConflict && slot >= minimumNotice
    })

    // Format slots for response
    const formattedSlots = availableSlots.map(slot => ({
      datetime: slot.toISOString(),
      time: slot.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      available: true,
      duration: requestedDuration
    }))

    return NextResponse.json({
      date: selectedDate.toISOString().split('T')[0],
      serviceType,
      estimatedDuration: requestedDuration,
      slots: formattedSlots,
      businessHours: {
        start: `${businessHours.start}:00`,
        end: `${businessHours.end}:00`
      }
    })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 