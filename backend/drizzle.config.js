const config  = require('./utils/config')
const { defineConfig } = require('drizzle-kit')

module.exports = defineConfig({
  schema: './database/schema.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL
  }
})