ALTER TABLE `users` ADD `cryptoBoardAccess` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accessExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `accessGrantedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `accessNote` text;