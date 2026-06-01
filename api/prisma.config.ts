import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  datasources: {
    db: {
      // 🔹 Это обязательно для prisma migrate dev
      url: process.env.DATABASE_URL,
      // 🔹 И это для прямого подключения через адаптер
      directUrl: process.env.DATABASE_URL,
    },
  },
  adapter: () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in .env')
    }
    return new PrismaPg({ 
      connectionString: process.env.DATABASE_URL 
    })
  },
})
