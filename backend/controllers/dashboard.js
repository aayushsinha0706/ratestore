const jwt = require('jsonwebtoken')
const {count,eq} = require('drizzle-orm')
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
        const storeId = decodedToken.id
        const userRole = decodedToken.role

        if (userRole !== 'STORE_OWNER'){
            return response.status(403).json({error: 'Access denied, store owner only'})
        }

        const avgRatings = table.ratingsTable.as('avg_ratings')
        const [averageRating] = await db
            .select({
                rating: avg(avgRatings.rating).default(0)
            })
            .from(table.storesTable)
            .where(eq(table.storesTable.storeId, storeId))
            .leftJoin(avgRatings, (join) => join.on(eq(table.storesTable.id, avgRatings.storeId)))
        
        const avgRating = averageRating.rating

        const users = await db
            .select({
                name: table.usersTable.name,
                email: table.usersTable.email,
            })
            .from(table.usersTable)
            .leftJoin(table.ratingsTable, (join) => join.on(eq(table.usersTable.id,table.ratingsTable.userId)))
            .where(eq(table.ratingsTable.storeId,storeId))

        return response.json({
            avgRating,
            users
        })

    } catch (error) {
        next(error)
    }
})

module.exports = dashboardRouter