const { drizzle } = require('drizzle-orm/neon-http')
const { neon } = require('@neondatabase/serverless')

const config = require('../utils/config')
const logger = require('../utils/logger')

const sql = neon(config.DATABASE_URL)
const db = drizzle({client: sql})

sql`SELECT 1`
  .then(() => {
    logger.info('Connected to Neon database')
    return db
  })
  .catch( (error) => {
    logger.error('Error connecting to Neon database:', error.message)
    throw error
  })


module.exports = { db }
