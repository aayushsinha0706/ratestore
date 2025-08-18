const storeRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const { avg, eq } = require('drizzle-orm')
const { db } = require('../database/db')
const table = require('../database/schema')
const config = require('../utils/config')

storeRouter.get('/', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userId = decodedToken.id
        const userRole = decodedToken.role

        if (userRole === 'SYSTEM_ADMIN'){
            const avgRatings = table.ratingsTable.as('avg_ratings')
            const stores = await db
                .select({
                    name: table.storesTable.name,
                    email: table.storesTable.email,
                    address: table.storesTable.address,
                    rating: avg(avgRatings.rating).default(0)
                })
                .from(table.storesTable)
                .leftJoin(avgRatings, (join) => join.on(eq(table.storesTable.id, avgRatings.storeId)))
                .groupBy(table.storesTable.id, table.storesTable.name, table.storesTable.email, table.storesTable.address)
            return response.json(stores)      

        } else if (userRole ==='NORMAL_USER') {
            const avgRatings = table.ratingsTable.as('avg_ratings')
            const userRatings = table.ratingsTable.as('user_ratings')
            const stores = await db
                .select({
                    name: table.storesTable.name,
                    address: table.storesTable.address,
                    rating: avg(avgRatings.rating).default(0),
                    userRating: userRatings.rating
                })
                .from(table.storesTable)
                .leftJoin(avgRatings, (join) => join.on(eq(table.storesTable.id, avgRatings.storeId)))
                .leftJoin(
                    userRatings, 
                    (join) => join
                        .on(eq(table.storesTable.id, userRatings.storeId))
                        .andOn(eq(userRatings.userId, userId))
                )
                .groupBy(table.storesTable.id, table.storesTable.name, table.storesTable.address, userRatings.rating)
            
            return response.json(stores)
        }
    } catch (error) {
        next(error)
    }
})


storeRouter.post('/', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userRole = decodedToken.role

        if (userRole !== 'SYSTEM_ADMIN') {
            return response.status(403).json({error: 'Access denied, admin only'})
        }

        const {name, email, address} = request.body

        if (!name || !email || !address) {
            return response.status(400).json({ error: 'Name, email and address are required' });
        }

        const [user] = await db
            .select({id: table.usersTable.id})
            .from(table.usersTable)
            .where(eq(table.usersTable.email, email))

        if (!user){
            return response.status(400).json({ error: 'User with given email does not exist' })
        }

        await db
            .update(table.usersTable)
            .set({role: 'STORE_OWNER'})
            .where(eq(table.usersTable.id, user.id))
        
        const store = {
            name,
            email,
            address,
            ownerId: user.id
        }
        
        const [newStore] = await db
            .insert(table.storesTable)
            .values(store)
            .returning({
                name: table.storesTable.name,
                email: table.storesTable.email,
                address: table.storesTable.address
            })
        return response.status(201).json(newStore)
    } catch (error) {
        next(error)
    }
})

module.exports = storeRouter