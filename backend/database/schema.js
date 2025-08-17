const { check, pgTable, uuid,varchar, uniqueIndex, integer, timestamp } = require('drizzle-orm/pg-core')
const { sql } = require('drizzle-orm')

const usersTable = pgTable(
    'users', {
        id: uuid("user_id").defaultRandom().primaryKey(),
        name: varchar("name", {length: 60}).notNull(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        address: varchar("address", { length: 400 }),
        passwordHash: varchar("password_hash", { length: 255 }).notNull(),
        role: varchar("role", { length: 20 }).notNull(),
        createdAt: timestamp("created_at", {mode: "string"}).defaultNow(),
        updatedAt: timestamp("updated_at",{mode: "string"}).defaultNow()
    },
    (table) => [
        uniqueIndex("users_email_index").on(table.email),
        check(
            "name_length_check",
            sql`char_length(${table.name}) BETWEEN 20 AND 60`
        ),
        check(
            "email_format_check",
            sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`
        ),
        check(
            "role_check",
            sql`${table.role} IN ('SYSTEM_ADMIN', 'NORMAL_USER', 'STORE_OWNER')`
        )
    ]
)

const storesTable = pgTable(
    "stores", {
        id: uuid("store_id").defaultRandom().primaryKey(),
        name : varchar("name",{length: 100}).notNull(),
        email: varchar("email",{length: 255}).unique(),
        address: varchar("address", {length: 400}).notNull(),
        ownerId: uuid("owner_id").notNull().unique().references(() => usersTable.id, {onDelete: 'cascade'}),
        createdAt: timestamp("created_at", {mode: "string"}).defaultNow(),
        updatedAt: timestamp("updated_at",{mode: "string"}).defaultNow()
        
    },
    (table) => [
        uniqueIndex("stores_email_index").on(table.email),
        uniqueIndex("stores_owner_id_idx").on(table.ownerId),
        check(
            "store_email_format_check",
            sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`
        ),
    ]
)

const ratingsTable = pgTable(
    "ratings", {
        id: uuid("rating_id").defaultRandom().primaryKey(),
        userId: uuid("user_id").notNull().references(() => usersTable.id, {onDelete: 'cascade'}),
        storeId: uuid("store_id").notNull().references(() => storesTable.id, {onDelete: 'cascade'}),
        rating: integer("rating").notNull(),
        createdAt: timestamp("created_at", {mode: "string"}).defaultNow(),
        updatedAt: timestamp("updated_at",{mode: "string"}).defaultNow()
    },
    (table) => [
        check(
            "rating_number_check",
            sql`${table.rating} BETWEEN 1 AND 5`
        ),
        uniqueIndex("ratings_store_user_unique").on(table.userId, table.storeId)
    ]
)

module.exports = {
    usersTable,
    storesTable,
    ratingsTable
}