CREATE TABLE `answers` (
	`player` text NOT NULL,
	`room` text NOT NULL,
	`round` integer NOT NULL,
	`choice` integer NOT NULL,
	`points` integer NOT NULL,
	PRIMARY KEY(`player`, `round`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`token` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`name` text NOT NULL,
	`joined` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`round` integer DEFAULT 0 NOT NULL,
	`deadline` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
