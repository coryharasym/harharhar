import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const runs=sqliteTable('runs',{id:text('id').primaryKey(),seed:integer('seed').notNull(),created:integer('created').notNull()});
export const scores=sqliteTable('scores',{id:text('id').primaryKey(),name:text('name').notNull(),score:integer('score').notNull(),tile:integer('tile').notNull(),moves:integer('moves').notNull(),created:integer('created').notNull()},table=>[index('scores_ranking').on(table.score,table.moves)]);
