import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Categories
  console.log('📁 Creating categories...')
  
  const categories = await Promise.all([
    // Main Categories
    prisma.category.upsert({
      where: { slug: 'processors' },
      update: {},
      create: {
        name: 'Processors (CPUs)',
        slug: 'processors',
        description: 'AMD and Intel processors for gaming and professional workloads',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'graphics-cards' },
      update: {},
      create: {
        name: 'Graphics Cards',
        slug: 'graphics-cards',
        description: 'High-performance GPUs for gaming, rendering, and AI workloads',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'motherboards' },
      update: {},
      create: {
        name: 'Motherboards',
        slug: 'motherboards',
        description: 'ATX, mATX, and mini-ITX motherboards for all builds',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'memory' },
      update: {},
      create: {
        name: 'Memory (RAM)',
        slug: 'memory',
        description: 'DDR4 and DDR5 memory modules for optimal performance',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'storage' },
      update: {},
      create: {
        name: 'Storage',
        slug: 'storage',
        description: 'SSDs, HDDs, and NVMe drives for all storage needs',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'power-supplies' },
      update: {},
      create: {
        name: 'Power Supplies',
        slug: 'power-supplies',
        description: 'Reliable PSUs with 80+ efficiency ratings',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'cases' },
      update: {},
      create: {
        name: 'Cases',
        slug: 'cases',
        description: 'PC cases from mini-ITX to full tower',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'cooling' },
      update: {},
      create: {
        name: 'Cooling',
        slug: 'cooling',
        description: 'Air and liquid cooling solutions',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'peripherals' },
      update: {},
      create: {
        name: 'Peripherals',
        slug: 'peripherals',
        description: 'Keyboards, mice, monitors, and accessories',
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'prebuilt' },
      update: {},
      create: {
        name: 'Prebuilt PCs',
        slug: 'prebuilt',
        description: 'Custom built computers ready to ship',
        isActive: true,
      },
    }),
  ])

  // Create Subcategories
  console.log('📁 Creating subcategories...')
  
  const subcategories = await Promise.all([
    // Graphics Card Subcategories
    prisma.category.upsert({
      where: { slug: 'nvidia-rtx' },
      update: {},
      create: {
        name: 'NVIDIA RTX',
        slug: 'nvidia-rtx',
        description: 'NVIDIA GeForce RTX series graphics cards',
        parentId: categories[1].id, // graphics-cards
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'amd-radeon' },
      update: {},
      create: {
        name: 'AMD Radeon',
        slug: 'amd-radeon',
        description: 'AMD Radeon graphics cards',
        parentId: categories[1].id, // graphics-cards
        isActive: true,
      },
    }),
    
    // Storage Subcategories
    prisma.category.upsert({
      where: { slug: 'nvme-ssd' },
      update: {},
      create: {
        name: 'NVMe SSDs',
        slug: 'nvme-ssd',
        description: 'High-speed NVMe solid state drives',
        parentId: categories[4].id, // storage
        isActive: true,
      },
    }),
    
    prisma.category.upsert({
      where: { slug: 'sata-ssd' },
      update: {},
      create: {
        name: 'SATA SSDs',
        slug: 'sata-ssd',
        description: 'SATA III solid state drives',
        parentId: categories[4].id, // storage
        isActive: true,
      },
    }),
  ])

  // Create Admin User
  console.log('👤 Creating admin user...')
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@finetunepc.com' },
    update: {},
    create: {
      email: 'admin@finetunepc.com',
      name: 'Fine Tune PC Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  // Create Test User
  console.log('👤 Creating test user...')
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      emailVerified: new Date(),
    },
  })

  // Create Sample Products
  console.log('🛍️ Creating sample products...')
  
  const products = await Promise.all([
    // Processors
    prisma.product.upsert({
      where: { slug: 'amd-ryzen-9-7950x' },
      update: {},
      create: {
        name: 'AMD Ryzen 9 7950X',
        slug: 'amd-ryzen-9-7950x',
        description: 'The AMD Ryzen 9 7950X is a flagship 16-core, 32-thread processor built on the cutting-edge Zen 4 architecture. With base and boost clocks of 4.5 GHz and 5.7 GHz respectively, this CPU delivers exceptional performance for gaming, content creation, and professional workloads.',
        shortDescription: '16-core flagship processor with exceptional performance',
        price: 699.99,
        comparePrice: 799.99,
        stock: 25,
        sku: 'AMD-7950X',
        categoryId: categories[0].id, // processors
        brand: 'AMD',
        warranty: '3 years',
        specifications: {
          cores: 16,
          threads: 32,
          baseClock: '4.5 GHz',
          boostClock: '5.7 GHz',
          socket: 'AM5',
          tdp: '170W',
          architecture: 'Zen 4',
          process: '5nm',
          pcieLanes: 28,
          memorySupport: 'DDR5-5200'
        },
        tags: ['AMD', 'Ryzen', 'High-Performance', 'Gaming', 'Content Creation'],
        featured: true,
        isActive: true,
      },
    }),
    
    prisma.product.upsert({
      where: { slug: 'intel-core-i9-13900k' },
      update: {},
      create: {
        name: 'Intel Core i9-13900K',
        slug: 'intel-core-i9-13900k',
        description: 'The Intel Core i9-13900K features 24 cores (8 Performance + 16 Efficiency) and 32 threads, delivering outstanding performance for demanding applications. Built on Intel 7 process technology with hybrid architecture.',
        shortDescription: '24-core hybrid architecture processor',
        price: 579.99,
        comparePrice: 649.99,
        stock: 18,
        sku: 'INTEL-13900K',
        categoryId: categories[0].id, // processors
        brand: 'Intel',
        warranty: '3 years',
        specifications: {
          cores: 24,
          threads: 32,
          baseClock: '3.0 GHz',
          boostClock: '5.8 GHz',
          socket: 'LGA1700',
          tdp: '125W',
          architecture: '13th Gen Raptor Lake',
          process: 'Intel 7',
          pcieLanes: 20,
          memorySupport: 'DDR5-5600 / DDR4-3200'
        },
        tags: ['Intel', 'Core i9', 'High-Performance', 'Gaming', 'Hybrid Architecture'],
        featured: true,
        isActive: true,
      },
    }),
    
    // Graphics Cards
    prisma.product.upsert({
      where: { slug: 'nvidia-rtx-4090' },
      update: {},
      create: {
        name: 'NVIDIA GeForce RTX 4090',
        slug: 'nvidia-rtx-4090',
        description: 'The ultimate graphics card for 4K gaming and professional content creation. Features 24GB GDDR6X memory, Ada Lovelace architecture, and support for ray tracing and DLSS 3.',
        shortDescription: 'Flagship graphics card with 24GB VRAM',
        price: 1599.99,
        comparePrice: 1799.99,
        stock: 8,
        sku: 'NVIDIA-RTX4090',
        categoryId: categories[1].id, // graphics-cards
        brand: 'NVIDIA',
        warranty: '3 years',
        specifications: {
          memory: '24GB GDDR6X',
          memoryBus: '384-bit',
          baseClock: '2230 MHz',
          boostClock: '2520 MHz',
          cudaCores: 16384,
          rtCores: 128,
          tensorCores: 512,
          powerConsumption: '450W',
          outputs: ['DisplayPort 1.4a x3', 'HDMI 2.1a x1'],
          length: '304mm'
        },
        tags: ['NVIDIA', 'RTX', '4K Gaming', 'Ray Tracing', 'DLSS'],
        featured: true,
        isActive: true,
      },
    }),
    
    // Memory
    prisma.product.upsert({
      where: { slug: 'corsair-vengeance-ddr5-32gb' },
      update: {},
      create: {
        name: 'Corsair Vengeance DDR5-5600 32GB (2x16GB)',
        slug: 'corsair-vengeance-ddr5-32gb',
        description: 'High-performance DDR5 memory kit with 32GB capacity, optimized for AMD and Intel platforms. Features aluminum heat spreaders and Intel XMP 3.0 support.',
        shortDescription: 'High-speed DDR5 memory kit',
        price: 189.99,
        comparePrice: 219.99,
        stock: 45,
        sku: 'CORSAIR-DDR5-32GB',
        categoryId: categories[3].id, // memory
        brand: 'Corsair',
        warranty: 'Lifetime',
        specifications: {
          capacity: '32GB (2x16GB)',
          speed: 'DDR5-5600',
          timings: '36-36-36-76',
          voltage: '1.25V',
          xmp: 'Intel XMP 3.0',
          heatspreader: 'Aluminum',
          height: '34mm'
        },
        tags: ['Corsair', 'DDR5', 'High-Speed', 'Gaming', 'XMP'],
        featured: false,
        isActive: true,
      },
    }),
    
    // Prebuilt PC
    prisma.product.upsert({
      where: { slug: 'finetunepc-gaming-pro' },
      update: {},
      create: {
        name: 'Fine Tune PC Gaming Pro',
        slug: 'finetunepc-gaming-pro',
        description: 'Our flagship gaming PC featuring AMD Ryzen 7 7800X3D, RTX 4080, 32GB DDR5, and 2TB NVMe SSD. Perfect for 4K gaming and content creation. Fully assembled and tested.',
        shortDescription: 'Flagship gaming PC ready to ship',
        price: 2899.99,
        comparePrice: 3199.99,
        stock: 5,
        sku: 'FTPC-GAMING-PRO',
        categoryId: categories[9].id, // prebuilt
        brand: 'Fine Tune PC',
        warranty: '2 years parts & labor',
        specifications: {
          cpu: 'AMD Ryzen 7 7800X3D',
          gpu: 'NVIDIA RTX 4080',
          memory: '32GB DDR5-5600',
          storage: '2TB NVMe SSD',
          motherboard: 'X670E Chipset',
          psu: '850W 80+ Gold',
          case: 'Mid Tower with Tempered Glass',
          cooling: 'AIO Liquid Cooler 240mm',
          os: 'Windows 11 Pro'
        },
        tags: ['Gaming PC', 'Pre-built', 'High-End', 'Ready to Ship'],
        featured: true,
        isActive: true,
      },
    }),
  ])

  // Create Product Images
  console.log('🖼️ Creating product images...')
  
  await Promise.all([
    // AMD Ryzen 9 7950X images
    prisma.productImage.create({
      data: {
        productId: products[0].id,
        url: '/images/products/amd-ryzen-9-7950x-1.jpg',
        altText: 'AMD Ryzen 9 7950X processor front view',
        position: 0,
      },
    }),
    prisma.productImage.create({
      data: {
        productId: products[0].id,
        url: '/images/products/amd-ryzen-9-7950x-2.jpg',
        altText: 'AMD Ryzen 9 7950X processor packaging',
        position: 1,
      },
    }),
    
    // Intel Core i9-13900K images
    prisma.productImage.create({
      data: {
        productId: products[1].id,
        url: '/images/products/intel-i9-13900k-1.jpg',
        altText: 'Intel Core i9-13900K processor',
        position: 0,
      },
    }),
    
    // RTX 4090 images
    prisma.productImage.create({
      data: {
        productId: products[2].id,
        url: '/images/products/rtx-4090-1.jpg',
        altText: 'NVIDIA RTX 4090 graphics card',
        position: 0,
      },
    }),
    prisma.productImage.create({
      data: {
        productId: products[2].id,
        url: '/images/products/rtx-4090-2.jpg',
        altText: 'NVIDIA RTX 4090 side view',
        position: 1,
      },
    }),
    
    // Corsair Memory images
    prisma.productImage.create({
      data: {
        productId: products[3].id,
        url: '/images/products/corsair-ddr5-1.jpg',
        altText: 'Corsair Vengeance DDR5 memory kit',
        position: 0,
      },
    }),
    
    // Gaming PC images
    prisma.productImage.create({
      data: {
        productId: products[4].id,
        url: '/images/products/gaming-pro-1.jpg',
        altText: 'Fine Tune PC Gaming Pro build',
        position: 0,
      },
    }),
    prisma.productImage.create({
      data: {
        productId: products[4].id,
        url: '/images/products/gaming-pro-2.jpg',
        altText: 'Fine Tune PC Gaming Pro internals',
        position: 1,
      },
    }),
  ])

  // Create Sample Address for Test User
  console.log('📍 Creating sample address...')
  
  const testAddress = await prisma.address.create({
    data: {
      userId: testUser.id,
      type: 'SHIPPING',
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
      isDefault: true,
    },
  })

  // Create Sample Reviews
  console.log('⭐ Creating sample reviews...')
  
  await Promise.all([
    prisma.review.create({
      data: {
        productId: products[0].id, // AMD Ryzen 9 7950X
        userId: testUser.id,
        rating: 5,
        title: 'Incredible Performance!',
        comment: 'This processor is absolutely amazing for both gaming and content creation. The multi-core performance is outstanding.',
        verified: true,
        helpful: 15,
      },
    }),
    
    prisma.review.create({
      data: {
        productId: products[2].id, // RTX 4090
        userId: testUser.id,
        rating: 5,
        title: 'Beast of a GPU',
        comment: 'Handles 4K gaming with ray tracing like a champ. Expensive but worth every penny.',
        verified: true,
        helpful: 23,
      },
    }),
  ])

  // Create Sample Service Request
  console.log('🔧 Creating sample service request...')
  
  await prisma.service.create({
    data: {
      type: 'UPGRADE',
      status: 'PENDING',
      title: 'GPU Upgrade to RTX 4090',
      description: 'Customer wants to upgrade from RTX 3080 to RTX 4090. Need to check PSU compatibility.',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      userId: testUser.id,
      price: 299.99,
      estimatedHours: 2,
      priority: 'MEDIUM',
      deviceInfo: {
        currentGpu: 'RTX 3080',
        targetGpu: 'RTX 4090',
        psu: '750W 80+ Gold',
        case: 'NZXT H510'
      },
      issueDetails: 'Customer wants better 4K performance',
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log(`📊 Created:`)
  console.log(`   - ${categories.length} main categories`)
  console.log(`   - ${subcategories.length} subcategories`) 
  console.log(`   - 2 users (admin + test)`)
  console.log(`   - ${products.length} products`)
  console.log(`   - Product images`)
  console.log(`   - Sample reviews`)
  console.log(`   - Sample service request`)
  console.log(`   - Sample address`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  }) 