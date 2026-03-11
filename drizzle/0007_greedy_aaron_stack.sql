CREATE TABLE `page_access_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pagePath` varchar(100) NOT NULL,
	`pageLabel` varchar(100) NOT NULL,
	`guestAccess` int NOT NULL DEFAULT 1,
	`userAccess` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_access_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_access_rules_pagePath_unique` UNIQUE(`pagePath`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_settingKey_unique` UNIQUE(`settingKey`)
);
