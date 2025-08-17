const logger = require('./logger')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')){
    request.token = authorization.replace('Bearer ','')
  }
  next()
}

class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'DatabaseError'
    this.originalError = originalError
  }
}

const errorHandler = (error, request,response)  => {
  console.error('Error: ',error)

  if (error instanceof DatabaseError) {
    return response.status(500).json({
      error: 'Database operation failed',
      message: error.message
    })
  }

  else if( error.name === 'SyntaxError' ) {
    return response.status(400).json({
      error: 'Invalid request syntax',
      message: error.message
    })
  }
  else if (error.name === 'JsonWebTokenError'){
    return response.status(401).json({ error: 'token invalid' })
  } 
  
  else if (error.name === 'TokenExpiredError') {
    return response.status(401).json({ error: 'token expired' })
  }

  response.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  })
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

module.exports = {
  requestLogger,
  tokenExtractor,
  errorHandler,
  unknownEndpoint
}