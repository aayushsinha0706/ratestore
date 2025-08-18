const jwt = require('jsonwebtoken')
const {count,eq, avg, desc} = require('drizzle-orm')
const dashboardRouter = require('express').Router()
const {db} = require('../database/db')
const table = require('../database/schema')
const config = require('../utils/config')

dashboardRouter.get('/admin', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userRole = decodedToken.role

        if (userRole !== 'SYSTEM_ADMIN'){
            return response.status(403).json({error: 'Access denied, admin only'})
        }

        const [users] = await db
            .select({count: count()})
            .from(table.usersTable)

        const totalUsers = users.count

        const [stores] = await db
            .select({count: count()})
            .from(table.storesTable)
        
        const totalStores = stores.count

        const [ratings] = await db
            .select({count: count()})
            .from(table.ratingsTable)
        
        const totalRatings = ratings.count

        return response.status(200).json({
            totalUsers,
            totalStores,
            totalRatings
        })


    } catch (error) {
        next(error)
    }
}) 

dashboardRouter.get('/store', async (request, response, next) => {
    try {
        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userId = decodedToken.id
        const userRole = decodedToken.role

        if (userRole !== 'STORE_OWNER'){
            return response.status(403).json({error: 'Access denied, store owner only'})
        }

        const [store] = await db
            .select({
                id: table.storesTable.id,
                name: table.storesTable.name
            })
            .from(table.storesTable)
            .where(eq(table.storesTable.ownerId, userId))

        if (!store) {
            return response.status(404).json({ error: 'Store not found for this owner' });
        }
        
        const storeId = store.id

        const [averageRating] = await db
            .select({
                rating: avg(table.ratingsTable.rating)
            })
            .from(table.ratingsTable)
            .where(eq(table.ratingsTable.storeId, storeId))
        
        const avgRating = averageRating.rating ? averageRating.rating : 0

        const users = await db
            .select({
                name: table.usersTable.name,
                email: table.usersTable.email,
                rating: table.ratingsTable.rating,
            })
            .from(table.usersTable)
            .innerJoin(
                table.ratingsTable, 
                eq(table.usersTable.id, table.ratingsTable.userId)
            )
            .where(eq(table.ratingsTable.storeId, storeId))
            .orderBy(desc(table.ratingsTable.createdAt))

        return response.json({
            store: {
                id: store.id,
                name: store.name
            },
            avgRating: Number(avgRating).toFixed(1), 
            totalRatings: users.length,
            users
        })

    } catch (error) {
        next(error)
    }
})

module.exports = dashboardRouter