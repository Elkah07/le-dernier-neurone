CREATE TABLE `game_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`phase` text NOT NULL,
	`question_key` text NOT NULL,
	`answer_index` integer NOT NULL,
	`correct` integer DEFAULT false NOT NULL,
	`response_ms` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `room_players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_answers_unique` ON `game_answers` (`room_id`,`player_id`,`phase`,`question_key`);--> statement-breakpoint
ALTER TABLE `room_players` ADD `qualification_answered` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `room_players` ADD `qualification_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `room_players` ADD `estimate` integer;--> statement-breakpoint
ALTER TABLE `room_players` ADD `category_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `room_players` ADD `category_answered` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `room_players` ADD `final_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `phase` text DEFAULT 'lobby' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `turn_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `round` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `current_theme` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `used_themes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `selected_cases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `active_case` integer;--> statement-breakpoint
ALTER TABLE `rooms` ADD `phase_started_at` text;