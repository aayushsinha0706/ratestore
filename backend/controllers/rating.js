const jwt = require('jsonwebtoken')
const { eq, and } = require('drizzle-orm')

const ratingRouter = require('express').Router()
const { db } = require('../database/db')
const table = require('../database/schema')
const config = require('../utils/config')

ratingRouter.post('/store/:storeId', async (request, response, next) => {
    try {
        const storeId = request.params.storeId

        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userId = decodedToken.id
        const userRole = decodedToken.role


        if (userRole !== 'NORMAL_USER'){
            return response.status(403).json({error: 'Access denied, normal users only'})
        }
           
        const [store] = await db
            .select()
            .from(table.storesTable)
            .where(eq(table.storesTable.id, storeId))
        
        if (!store) {
            return response.status(404).json({ error: 'Store not found' })
        }

        if (store.ownerId === userId) {
            return response.status(400).json({ error: 'You cannot rate your own store' })
        }
        
        const {rating} = request.body

        if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5){
            return response.status(400).json({ error: 'Rating must be an integer between 1 and 5.'});
        }

        const storeRating = {
            userId,
            storeId,
            rating
        }

        const [newRating] = await db
            .insert(table.ratingsTable)
            .values(storeRating)
            .returning({
                userId: table.ratingsTable.userId,
                storeId: table.ratingsTable.storeId,
                rating: table.ratingsTable.rating
            })
        
        return response.status(201).json(newRating)
        
    } catch (error) {
        next(error)
    }
})

ratingRouter.put('/store/:storeId', async (request, response, next) => {
    try {
        const storeId = request.params.storeId

        const decodedToken = jwt.verify(request.token, config.SECRET)
        const userId = decodedToken.id
        
        const {rating} = request.body

        if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5){
            return response.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
        }

        const [updatedRating] = await db
            .update(table.ratingsTable)
            .set({rating})
            .where(and
                (eq(table.ratingsTable.storeId, storeId)),
                (eq(table.ratingsTable.userId, userId))
            )
            .returning({
                storeId: table.ratingsTable.storeId,
                userId: table.ratingsTable.userId,
                rating: table.ratingsTable.rating
            })
        return response.status(200).json(updatedRating)
        
    } catch (error) {
        next(error)
    }
})

ratingRouter.get('/store/:storeId', async (request, response, next) => {
    try {
        const storeId = request.params.storeId

        const decodedToken= jwt.verify(request.token, config.SECRET)
        const userRole = decodedToken.role

        if (userRole !== 'SYSTEM_ADMIN' && userRole !== 'STORE_OWNER') {
            return response.status(403).json({ 
                error: 'Access denied' 
            })
        }

        const [existingStore] = await db
            .select()
            .from(table.storesTable)
            .where(eq(table.storesTable.id, storeId))
        
        if (!existingStore){
            return response.status(400).json({error: 'store not found'})
        }

        if (userRole === 'STORE_OWNER' && existingStore.ownerId !== decodedToken.id) {
            return response.status(403).json({ 
                error: 'You can only view ratings for your own store' 
            })
        }

        const storeRatings = await db
            .select({
                rating: table.ratingsTable.rating
            })
            .from(table.ratingsTable)
            .where(eq(table.ratingsTable.storeId, storeId))
        
        return response.json(storeRatings)
        
    } catch (error) {
        next(error)
    }
})

module.exports = ratingRouter