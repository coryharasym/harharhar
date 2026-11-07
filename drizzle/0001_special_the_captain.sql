CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `runs` ADD `game` text DEFAULT '2048' NOT NULL;--> statement-breakpoint
ALTER TABLE `scores` ADD `game` text DEFAULT '2048' NOT NULL;--> statement-breakpoint
ALTER TABLE `scores` ADD `player_id` text REFERENCES players(id);--> statement-breakpoint
ALTER TABLE `scores` ADD `icon` text DEFAULT 'orbit' NOT NULL;--> statement-breakpoint
ALTER TABLE `scores` ADD `lines` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `scores_game_ranking` ON `scores` (`game`,`score`);