import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@/lib/auth"
 
const f = createUploadthing()
 
export const ourFileRouter = {
  // Product image uploader - for admin/product management
  productImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  })
    .middleware(async () => {
      // Check if user is authenticated and has admin role
      const session = await auth()
      
      if (!session?.user?.id) {
        throw new Error("Unauthorized - Please sign in")
      }
      
      if (session.user.role !== "ADMIN") {
        throw new Error("Unauthorized - Admin access required")
      }
 
      return { 
        userId: session.user.id,
        userRole: session.user.role
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Product image upload complete for user:", metadata.userId)
      console.log("File URL:", file.url)
      
      // Return data that will be sent to the client
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
        fileSize: file.size
      }
    }),
    
  // User avatar uploader - for profile pictures
  avatar: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await auth()
      
      if (!session?.user?.id) {
        throw new Error("Unauthorized - Please sign in")
      }
 
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Avatar upload complete for user:", metadata.userId)
      console.log("File URL:", file.url)
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url
      }
    }),
} satisfies FileRouter
 
export type OurFileRouter = typeof ourFileRouter 