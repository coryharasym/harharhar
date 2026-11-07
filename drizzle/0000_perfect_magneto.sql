CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`seed` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`tile` integer NOT NULL,
	`moves` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scores_ranking` ON `scores` (`score`,`moves`);