CREATE TABLE `crypto_board_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataKey` varchar(50) NOT NULL,
	`jsonData` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crypto_board_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `crypto_board_cache_dataKey_unique` UNIQUE(`dataKey`)
);
