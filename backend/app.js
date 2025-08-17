const express = require('express')
const app = express()

const cors = require('cors')
const middleware = require('./utils/middleware')

const authRouter = require('./controllers/auth')
const userRouter = require('./controllers/user')

app.use(cors())
app.use(express.static('dist'))
app.use(express.json())
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)


app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app