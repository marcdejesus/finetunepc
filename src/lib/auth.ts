import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string
          }
        })

        if (!user) {
          return null
        }

        // For demo purposes, we'll create a simple password check
        // In production, you'd hash passwords properly
        const isPasswordValid = credentials.password === "password123" || 
                               (user.email === "admin@finetunepc.com" && credentials.password === "admin123")

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('🔑 JWT Callback:', { 
        trigger,
        hasUser: !!user, 
        userId: user?.id, 
        tokenUserId: token.userId,
        tokenSub: token.sub,
        userEmail: user?.email || token.email 
      })
      
      // On initial sign in, user object is present
      if (user) {
        console.log('👤 Setting token from user object:', user.id)
        token.userId = user.id
        token.role = user.role
        token.email = user.email
      } 
      // On subsequent requests, user is null but token should have userId
      else if (token.email && !token.userId) {
        console.log('🔍 Looking up user by email:', token.email)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string }
          })
          if (dbUser) {
            console.log('✅ Found user in database:', dbUser.id)
            token.userId = dbUser.id
            token.role = dbUser.role
          } else {
            console.log('❌ User not found in database for email:', token.email)
          }
        } catch (error) {
          console.error('Error looking up user in JWT callback:', error)
        }
      }
      
      console.log('🔑 JWT Callback Result:', { userId: token.userId, role: token.role })
      return token
    },
    async session({ session, token }) {
      console.log('🏠 Session Callback:', { 
        tokenUserId: token.userId, 
        tokenRole: token.role,
        tokenEmail: token.email 
      })
      
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
        if (!session.user.email && token.email) {
          session.user.email = token.email as string
        }
      }
      
      console.log('🏠 Session Result:', { 
        userId: session.user.id, 
        userEmail: session.user.email,
        userRole: session.user.role 
      })
      
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn Callback:', { 
        provider: account?.provider, 
        userEmail: user.email,
        userName: user.name 
      })
      
      // For all providers, ensure user exists in database
      if (user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            console.log('👤 Creating new user:', user.email)
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                image: user.image,
                emailVerified: new Date(),
                role: "USER"
              }
            })
            // Update the user object with the database ID
            user.id = newUser.id
            user.role = newUser.role
          } else {
            console.log('👤 Found existing user:', user.email)
            // Update the user object with the database info
            user.id = existingUser.id
            user.role = existingUser.role
          }
        } catch (error) {
          console.error("Error handling user in signIn:", error)
          return false
        }
      }
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn(message) {
      console.log("User signed in:", message.user.email)
    },
    async signOut(message) {
      console.log("User signed out")
    }
  }
}) 