import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'

export default fp(async function jwtPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short. It must be at least 32 characters.',
    )
  }

  await fastify.register(fastifyJwt, {
    secret,
    sign: { algorithm: 'HS256' },
  })
})