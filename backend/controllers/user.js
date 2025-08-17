const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const userRouter = require('express').Router()
const { db } = require('../database/db')
const table = require('../database/schema')
const config = require('../utils/config')

const {eq} = require('drizzle-orm')

userRouter.get('/', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)

        if(decodedToken.role !== 'SYSTEM_ADMIN'){
            return response.status(403).json({error: 'Access denied, admin only'})
        }

        const [users] = await db
            .select({
                name: table.usersTable.name,
                email: table.usersTable.email,
                address: table.usersTable.address,
                role: table.usersTable.role,
            })
            .from(table.usersTable)
        
        return response.json(users)
    } catch (error) {
        next(error)
    }
})

userRouter.post('/', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)

        if(decodedToken.role !== 'SYSTEM_ADMIN'){
            return response.status(403).json({error: 'Access denied, admin only'})
        }

        const validRoles = ['SYSTEM_ADMIN', 'NORMAL_USER', 'STORE_OWNER']

        const {name, email, address, password, role} = request.body

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

        if (!validRoles.includes(role)){
            return response.status(400).json({ error: "Invalid user role" })
        }

        const [existingUser] = await db
            .select()
            .from(table.usersTable)
            .where(eq(table.usersTable.email, email))
        
        if (existingUser) {
            return response.status(400).json({ error: "Email already in use" })
        }

        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        const user = {
            name, 
            email,
            address,
            passwordHash,
            role
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

    } catch (error){
        next(error)
    }
})

userRouter.put('/password', async (request, response, next) => {
    try {
            const { email, oldPassword, newPassword } = request.body

            const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,16}$/

            if (!passwordRegex.test(newPassword)) {
                return response.status(400).json({
                    error: "Password must be 8-16 characters, include at least one uppercase letter and one special character."
            })}

            const [user] = await db
                .select()
                .from(table.usersTable)
                .where(eq(table.usersTable.email, email))
            
            const passwordCorrect = user
                ? await bcrypt.compare(oldPassword, user.passwordHash)
                : false
            
            if (!(user && passwordCorrect)) {
                return response.status(401).json({ error: 'invalid email or password' })
            }

            const saltRounds = 10
            const newPasswordHash = await bcrypt.hash(newPassword,saltRounds)

            await db
                .update(table.usersTable)
                .set({passwordHash: newPasswordHash})
                .where(eq(table.usersTable.email, email))
            
            return response.status(200).json({ message: "Password updated successfully" })

    } catch (error) {
        next(error)
    }
})

module.exports = userRouter