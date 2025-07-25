# Fine Tune PC - Ecommerce Platform

A comprehensive ecommerce platform specializing in computer parts, accessories, prebuilt computers, and repair/upgrade services. Built with modern web technologies and designed for scalability and performance.

## 🚀 Features

### Customer Features
- **Product Catalog**: Browse computer parts, accessories, and prebuilt systems
- **Advanced Search & Filtering**: Find products by category, price, specifications
- **Shopping Cart**: Persistent cart with real-time updates
- **Secure Checkout**: Stripe-powered payment processing
- **Order Management**: Track orders, view history, download invoices
- **Service Booking**: Schedule repair, upgrade, and consultation services
- **User Profiles**: Manage account, addresses, and preferences
- **Product Reviews**: Read and write product reviews

### Admin Features
- **Dashboard Analytics**: Real-time sales metrics, revenue tracking, and insights
- **Product Management**: CRUD operations, bulk uploads, image management
- **Order Management**: Process orders, update statuses, manage shipping
- **Service Management**: Handle service requests, assign technicians
- **User Management**: Customer accounts, role management
- **Review Moderation**: Import, moderate, and manage product reviews
- **Content Management**: Banners, promotions, category management

### Technical Features
- **Authentication**: NextAuth.js with role-based access control
- **File Upload**: Secure image uploads with Uploadthing
- **Email Notifications**: Transactional emails with Resend
- **Real-time Updates**: Live cart and order status updates
- **Mobile Responsive**: Optimized for all device sizes
- **SEO Optimized**: Meta tags, structured data, sitemaps

## 🛠 Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/docs)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/docs/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Re-usable UI components
- **[Lucide React](https://lucide.dev/)** - Beautiful icons
- **[React Hook Form](https://react-hook-form.com/docs)** - Form handling
- **[Zod](https://zod.dev/)** - Schema validation
- **[Zustand](https://zustand-demo.pmnd.rs/)** - State management
- **[Recharts](https://recharts.org/en-US/)** - Data visualization

### Backend & Database
- **[Prisma](https://www.prisma.io/docs)** - Database ORM
- **[PostgreSQL](https://www.postgresql.org/docs/)** - Primary database
- **[NextAuth.js](https://next-auth.js.org/getting-started/introduction)** - Authentication
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing

### External Services
- **[Stripe](https://stripe.com/docs)** - Payment processing
- **[Uploadthing](https://uploadthing.com/docs)** - File uploads
- **[Resend](https://resend.com/docs)** - Email delivery
- **[Vercel](https://vercel.com/docs)** - Deployment platform

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Stripe account
- Uploadthing account
- Resend account

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd finetunepc
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finetunepc"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."

# File Upload
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="your-app-id"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with sample data
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (shop)/            # Customer-facing routes
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   └── services/          # Service booking
├── components/            # Reusable components
│   ├── ui/               # Shadcn/ui components
│   ├── layout/           # Layout components
│   ├── products/         # Product components
│   └── admin/            # Admin components
├── lib/                  # Utility libraries
├── store/                # Zustand stores
└── types/                # TypeScript types
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset and reseed database

## 🔐 Authentication

The application uses NextAuth.js with the following providers:
- **Credentials** - Email/password authentication
- **Google** - OAuth provider (optional)

### Demo Accounts
- **Admin**: `admin@finetunepc.com` / `admin123`
- **Customer**: `test@example.com` / `password123`

## 💳 Payment Processing

Stripe integration handles:
- Payment intents for secure transactions
- Webhook processing for order status updates
- Invoice generation
- Refund processing (services only)

## 📧 Email System

Resend handles transactional emails:
- Order confirmations
- Service booking confirmations
- Status updates
- Cancellation notifications

## 🖼️ File Management

Uploadthing manages:
- Product images with drag-and-drop
- Image optimization and CDN delivery
- Secure file uploads with admin-only access
- Bulk image processing

## 🗄️ Database Schema

Key models include:
- **Users** - Customer and admin accounts
- **Products** - Product catalog with images
- **Orders** - Order management and tracking
- **Services** - Service booking and management
- **Reviews** - Product reviews and ratings
- **Categories** - Product categorization

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm run start
```

## 📚 API Documentation

### External API References
- **[Stripe API](https://stripe.com/docs/api)** - Payment processing
- **[Uploadthing API](https://uploadthing.com/docs/api)** - File uploads
- **[Resend API](https://resend.com/docs/api-reference)** - Email delivery
- **[NextAuth.js API](https://next-auth.js.org/configuration/pages)** - Authentication
- **[Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)** - Database operations

### Internal API Routes
- `/api/products` - Product management
- `/api/orders` - Order processing
- `/api/services` - Service booking
- `/api/admin/*` - Admin operations
- `/api/auth/*` - Authentication endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@finetunepc.com or create an issue in the repository.

---

**Fine Tune PC** - Your trusted partner for computer parts and services.
