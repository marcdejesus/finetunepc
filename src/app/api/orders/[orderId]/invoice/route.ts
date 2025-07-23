import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { orderId } = await params
    
    // Fetch order with all details
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: session.user.id },
          // Admin can access any order invoice
          ...(session.user.role === 'ADMIN' ? [{}] : [])
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      )
    }
    
    // Only generate invoices for completed/shipped orders
    if (!['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Invoice not available for this order status' },
        { status: 400 }
      )
    }
    
    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHTML(order)
    
    return new NextResponse(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

function generateInvoiceHTML(order: any): string {
  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${order.orderNumber}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        .company-info h1 {
          color: #2563eb;
          margin: 0;
          font-size: 2.5em;
          font-weight: bold;
        }
        .company-info p {
          margin: 5px 0;
          color: #666;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-details h2 {
          color: #2563eb;
          margin: 0;
          font-size: 2em;
        }
        .invoice-details p {
          margin: 5px 0;
        }
        .billing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin: 40px 0;
        }
        .billing-info h3 {
          color: #2563eb;
          margin-bottom: 15px;
          font-size: 1.2em;
        }
        .billing-info p {
          margin: 5px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 40px 0;
        }
        .items-table th {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
          color: #2563eb;
        }
        .items-table td {
          padding: 15px;
          border: 1px solid #ddd;
        }
        .items-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .totals-section {
          margin-top: 40px;
          text-align: right;
        }
        .totals-table {
          margin-left: auto;
          min-width: 300px;
        }
        .totals-table td {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .totals-table .total-row {
          font-weight: bold;
          font-size: 1.2em;
          color: #2563eb;
          border-top: 2px solid #2563eb;
          border-bottom: 3px double #2563eb;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 0.9em;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-confirmed { background-color: #dbeafe; color: #1e40af; }
        .status-processing { background-color: #ede9fe; color: #7c3aed; }
        .status-shipped { background-color: #fed7aa; color: #ea580c; }
        .status-delivered { background-color: #dcfce7; color: #16a34a; }
        
        @media print {
          body { margin: 0; padding: 0; }
          .invoice-container { border: none; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>Fine Tune PC</h1>
            <p>Computer Parts & Services</p>
            <p>support@finetunepc.com</p>
            <p>+1 (555) 123-4567</p>
          </div>
          <div class="invoice-details">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> INV-${order.orderNumber}</p>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Order Date:</strong> ${orderDate}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></p>
          </div>
        </div>
        
        <!-- Billing Information -->
        <div class="billing-section">
          <div class="billing-info">
            <h3>Bill To:</h3>
            <p><strong>${order.user.name || 'Customer'}</strong></p>
            <p>${order.user.email}</p>
          </div>
          <div class="billing-info">
            <h3>Ship To:</h3>
            <p><strong>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</strong></p>
            ${order.shippingAddress.company ? `<p>${order.shippingAddress.company}</p>` : ''}
            <p>${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p>${order.shippingAddress.addressLine2}</p>` : ''}
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
            <p>${order.shippingAddress.country}</p>
          </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item: any) => `
              <tr>
                <td>
                  <strong>${item.product.name}</strong>
                  ${item.product.sku ? `<br><small>SKU: ${item.product.sku}</small>` : ''}
                </td>
                <td>${item.quantity}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>$${(Number(item.price) * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td>$${Number(order.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Shipping:</td>
              <td>${Number(order.shipping) === 0 ? 'Free' : '$' + Number(order.shipping).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Tax:</td>
              <td>$${Number(order.tax).toFixed(2)}</td>
            </tr>
            ${Number(order.discount) > 0 ? `
            <tr>
              <td>Discount:</td>
              <td>-$${Number(order.discount).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total:</td>
              <td>$${Number(order.total).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          <p>This invoice was generated on ${invoiceDate}</p>
          <p>For questions about this invoice, please contact us at support@finetunepc.com</p>
          ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
        </div>
      </div>
      
      <script>
        // Auto-print functionality for PDF generation
        if (window.location.search.includes('print=true')) {
          window.onload = function() {
            window.print();
          }
        }
      </script>
    </body>
    </html>
  `
} 