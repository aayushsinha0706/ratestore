const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const authRouter = require('express').Router()
const table = require('../database/schema')
const { db } = require('../database/db')
const { eq } = require('drizzle-orm')

const config = require('../utils/config')

authRouter.post('/register', async (request, response, next) => {
    try {
        const { name, email, address , password } = request.body
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,16}$/

        if (!name || !email || !password){
            return response.status(400).json({
                error: "Name, email and password are required"
            })
        }

        if (name.length < 20 || name.length > 60){
            return response.status(400).json({
                error: "Name must be 20-60 characters long"
            })
        }

        if (!passwordRegex.test(password)) {
            return response.status(400).json({
                error: "Password must be 8-16 characters, include at least one uppercase letter and one special character."
        })}

        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        const user = {
            name, 
            email,
            address,
            passwordHash,
            role: 'NORMAL_USER'
        }

        const [newUser] = await db
            .insert(table.usersTable)
            .values(user)
            .returning({
                id: table.usersTable.id,
                name: table.usersTable.name,
                email: table.usersTable.email,
                address: table.usersTable.address,
                role: table.usersTable.role,
                createdAt: table.usersTable.createdAt
            })
    
        response.status(201).json(newUser)
    } catch (error) {
        next(error)
    }
})

authRouter.post('/login', async (request, response, next) => {
    try {
        const {email, password} = request.body
        const [user] = await db
            .select()
            .from(table.usersTable)
            .where(eq(table.usersTable.email, email))

        const passwordCorrect = user
            ? await bcrypt.compare(password, user.passwordHash)
            : false

        if (!(user && passwordCorrect)) {
            return response.status(401).json({ error: 'invalid email or password' })
        }

        const userForToken = {
            email: user.email,
            id: user.id,
            role: user.role
        }

        const token = jwt.sign(userForToken,config.SECRET, { expiresIn: 60*60 })

        return response.status(200).json({
            token,
            email: user.email,
            name: user.name,
            role: user.role
        })
    } catch (error) {
        next(error)
    }
})


module.exports = authRouter